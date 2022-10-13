import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { BigNumber, BytesLike } from "ethers";
import { deployments, ethers, getChainId, network } from "hardhat";
import { eEVMNetwork } from "../../helper-hardhat-config";
import { getAccountsMerkleProof, getAccountsMerkleRoot, Signers, to_10powNumber_BN } from "../../helpers/utils";
import { signTypedData } from "./utils";
import {
  ERC20Permit,
  ERC20Permit__factory,
  VaultGateway,
  Registry,
  Registry__factory,
  Vault,
  Vault__factory,
  TokenPaymaster,
  RelayHub,
  IUniswapV2Router02,
  StakeManager,
  IForwarder,
} from "../../typechain";
import { getPermitSignature, setTokenBalanceInStorage } from "./utils";
import { GsnTestEnvironment } from "@opengsn/cli/dist/GsnTestEnvironment";
import { RelayRequest, cloneRelayRequest, defaultEnvironment, decodeRevertReason, constants } from "@opengsn/common";
import { calculatePostGas, registerAsRelayServer, deployHub } from "./utils";
import { Penalizer } from "../../typechain/Penalizer";
import { defaultGsnConfig } from "@opengsn/provider";
import { parseUnits } from "ethers/lib/utils";
import { TypedRequestData, GsnDomainSeparatorType, GsnRequestType } from "@opengsn/common/dist/EIP712/TypedRequestData";

chai.use(solidity);
const fork = process.env.FORK as eEVMNetwork;

async function deploy(name: string, ...params: any[]) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then(f => f.deployed());
}

describe("TokenPaymaster", function () {
  let owner: SignerWithAddress;
  let maker: SignerWithAddress;
  let paymaster: TokenPaymaster;
  let uniRouter: IUniswapV2Router02;
  let relayHub: RelayHub;
  let forwarder: IForwarder;
  let usdc: ERC20Permit;
  let vaultGateway: VaultGateway;
  let vault: Vault;
  let registry: Registry;
  let stakeManager: StakeManager;
  let penalizer: Penalizer;
  let relayRequest: RelayRequest;
  let paymasterData: string;
  let metaTxSignature: BytesLike;
  let depositAmountUSDC: BigNumber;

  before(async function () {
    await deployments.fixture();
    const oracle = await deployments.get("OptyFiOracle");

    [owner, maker] = await ethers.getSigners();
    stakeManager = <StakeManager>(
      await deploy("StakeManager", defaultEnvironment.maxUnstakeDelay, 0, 0, owner.address, owner.address)
    );
    penalizer = <Penalizer>(
      await deploy(
        "Penalizer",
        defaultEnvironment.penalizerConfiguration.penalizeBlockDelay,
        defaultEnvironment.penalizerConfiguration.penalizeBlockExpiration,
      )
    );
    relayHub = <RelayHub>(
      await deployHub(
        stakeManager.address,
        penalizer.address,
        constants.ZERO_ADDRESS,
        constants.ZERO_ADDRESS,
        "0",
        owner,
      )
    );
    paymaster = <TokenPaymaster>await deploy("TokenPaymaster", oracle.address);

    const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const usdcSwapAmount = ethers.utils.parseUnits("10000", 6);
    usdc = <ERC20Permit>await ethers.getContractAt(ERC20Permit__factory.abi, USDC);

    const context = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256", "address"],
      [maker.address, 5000000, usdc.address],
    );

    await setTokenBalanceInStorage(usdc, owner.address, "20000");

    const UniswapV2Router02Address = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    uniRouter = await ethers.getContractAt("IUniswapV2Router02", UniswapV2Router02Address);

    const swapDeadline = BigNumber.from("1000000000000000000000000000000000000");

    const approveData = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256"],
      [uniRouter.address, usdcSwapAmount],
    );
    paymasterData = ethers.utils.defaultAbiCoder.encode(
      ["tuple(address, address, bool, bytes, bytes, bytes, address[], uint256)"],
      [[usdc.address, uniRouter.address, false, "0x", approveData, "0x", [USDC, WETH], swapDeadline]],
    );
    const gasUsedByPost = await calculatePostGas(usdc, paymaster, paymasterData, owner, usdcSwapAmount, context);

    await paymaster.connect(owner).setPostGasUsage(gasUsedByPost);
    await paymaster.connect(owner).setRelayHub(relayHub.address);

    console.log("paymaster post with precharge=", (await paymaster.gasUsedByPost()).toString());
    forwarder = <IForwarder>await deploy("Forwarder");
    vaultGateway = <VaultGateway>await deploy("VaultGateway", forwarder.address);
    await paymaster.setTrustedForwarder(forwarder.address);
    await forwarder.registerRequestType(GsnRequestType.typeName, GsnRequestType.typeSuffix);
    await forwarder.registerDomainSeparator(defaultGsnConfig.domainSeparatorName, GsnDomainSeparatorType.version);

    const OPUSDCGROW_VAULT_ADDRESS = (await deployments.get("opUSDC-Save")).address;
    const REGISTRY_PROXY_ADDRESS = (await deployments.get("RegistryProxy")).address;

    vault = <Vault>await ethers.getContractAt(Vault__factory.abi, OPUSDCGROW_VAULT_ADDRESS);
    registry = <Registry>await ethers.getContractAt(Registry__factory.abi, REGISTRY_PROXY_ADDRESS);

    //Get signers
    const financeOperatorAddress = await registry.getFinanceOperator();
    const governanceAddress = await registry.getGovernance();
    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers = {} as Signers;
    this.signers.financeOperator = await ethers.getSigner(financeOperatorAddress);
    this.signers.governance = await ethers.getSigner(governanceAddress);
    this.signers.alice = signers[3];
    // this.relayer = signers[4];

    await setTokenBalanceInStorage(usdc, this.signers.alice.address, "40000");
    //set vault config
    const _vaultConfiguration = BigNumber.from(
      "908337486804231642580332837833655270430560746049134246454386846501909299200",
    );
    await vault.connect(this.signers.governance).setVaultConfiguration(_vaultConfiguration);
    await vault.connect(this.signers.financeOperator).setValueControlParams(
      "10000000000", // 10,000 USDC
      "1000000000", // 1000 USDC
      "1000000000000", // 1,000,000 USDC
    );

    const _accountsRoot = getAccountsMerkleRoot([this.signers.alice.address, vaultGateway.address]);
    await vault.connect(this.signers.governance).setWhitelistedAccountsRoot(_accountsRoot);

    let accountsProof = getAccountsMerkleProof(
      [this.signers.alice.address, vaultGateway.address],
      vaultGateway.address,
    );

    depositAmountUSDC = BigNumber.from("1000").mul(to_10powNumber_BN("6"));

    const deadline = ethers.constants.MaxUint256;
    const sig = await getPermitSignature(this.signers.alice, usdc, vaultGateway.address, depositAmountUSDC, deadline, {
      version: "2",
      nonce: BigNumber.from("1"),
    });

    let dataMetaVaultPermit = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint8", "bytes32", "bytes32"],
      [this.signers.alice.address, vaultGateway.address, depositAmountUSDC, deadline, sig.v, sig.r, sig.s],
    );

    const dataCall = vaultGateway.interface.encodeFunctionData("deposit", [
      vault.address,
      depositAmountUSDC,
      BigNumber.from("0"),
      dataMetaVaultPermit,
      accountsProof,
    ]);

    const provider = ethers.getDefaultProvider();
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ? feeData.gasPrice.toString() : "";

    relayRequest = {
      request: {
        from: this.signers.alice.address,
        to: vaultGateway.address,
        value: "0",
        gas: "1000000",
        nonce: (await forwarder.getNonce(this.signers.alice.address)).toString(),
        data: dataCall,
        validUntilTime: ethers.constants.MaxUint256.toString(),
      },
      relayData: {
        maxFeePerGas: gasPrice,
        maxPriorityFeePerGas: gasPrice,
        transactionCalldataGasUsed: "0",
        relayWorker: maker.address,
        paymaster: paymaster.address,
        forwarder: forwarder.address,
        paymasterData,
        clientId: "1",
      },
    };

    const chainId = +(await getChainId()); //defaultEnvironment.chainId;
    const dataToSign = new TypedRequestData(
      defaultGsnConfig.domainSeparatorName,
      chainId,
      forwarder.address,
      relayRequest,
    );

    metaTxSignature = await signTypedData(this.signers.alice.provider, this.signers.alice.address, dataToSign);
  });

  after(async function () {
    await GsnTestEnvironment.stopGsn();
  });

  // describe("#preRelayedCall", function () {
  //   let testHub: TestHub
  //   describe("reverts if", function () {
  //     before(async function () {
  //       testHub = await deployTestHub(false, owner) as TestHub
  //       await paymaster.setRelayHub(testHub.address)
  //     })

  //     it("should reject if not enough balance", async () => {
  //       const req = mergeRelayRequest(relayRequest, { paymasterData: paymasterData });
  //       console.log(req);
  //       await expect(testHub.callPreRC(req, metaTxSignature, '0x', 1e6)).to.revertedWith("ERC20: insufficient allowance");
  //     })

  // it("should reject if unknown paymasterData", async () => {
  //   const req = mergeRelayRequest(relayRequest, { paymasterData: '0x1234' })
  //   const signature = await getEip712Signature(web3, new TypedRequestData(defaultGsnConfig.domainSeparatorName, 1, forwarder.address, req))
  //   assert.match(await revertReason(testHub.callPreRC(req, signature, '0x', 1e6)), /paymasterData: invalid length for Uniswap v1 exchange address/)
  // })

  // it("should reject if unsupported uniswap in paymasterData", async () => {
  //   const req = mergeRelayRequest(relayRequest, { paymasterData: web3.eth.abi.encodeParameter('address', nonUniswap) })
  //   const signature = await getEip712Signature(web3, new TypedRequestData(defaultGsnConfig.domainSeparatorName, 1, forwarder.address, req))
  //   assert.match(await revertReason(testHub.callPreRC(req, signature, '0x', 1e6)), /unsupported token uniswap/)
  // })
  // })

  // context('with funded recipient', function () {
  //   before(async function () {
  //     await token.mint(5e18.toString())
  //     await token.transfer(recipient.address, 5e18.toString())
  //   })

  //   it('should reject if no token approval', async () => {
  //     const req = mergeRelayRequest(relayRequest, { paymasterData: web3.eth.abi.encodeParameter('address', uniswap.address) })
  //     assert.match(await revertReason(testHub.callPreRC(req, signature, '0x', 1e6)), transferErc20Error)
  //   })

  //   context('with token approved for paymaster', function () {
  //     before(async function () {
  //       await recipient.execute(token.address, token.contract.methods.approve(paymaster.address, MAX_INTEGER.toString()).encodeABI())
  //     })

  //     // deliberately removing this functionality as a bit redundant - just pass the token at all times
  //     it.skip('callPreRC should succeed and return default token/uniswap', async () => {
  //       const ret: any = await testHub.callPreRC.call(relayRequest, signature, '0x', 1e6)
  //       const decoded = web3.eth.abi.decodeParameters(['address', 'address', 'address', 'address'], ret.context)
  //       assert.equal(decoded[2], token.address)
  //       assert.equal(decoded[3], uniswap.address)
  //     })

  //     it('callPreRC should succeed with specific token/uniswap', async () => {
  //       const req = mergeRelayRequest(relayRequest, { paymasterData: web3.eth.abi.encodeParameter('address', uniswap.address) })
  //       const signature = await getEip712Signature(web3, new TypedRequestData(defaultGsnConfig.domainSeparatorName, 1, forwarder.address, req))
  //       const ret: any = await testHub.callPreRC.call(req, signature, '0x', 1e6)
  //       const decoded = web3.eth.abi.decodeParameters(['address', 'address', 'address', 'address'], ret.context) as any
  //       assert.equal(decoded[2], token.address)
  //       assert.equal(decoded[3], uniswap.address)
  //     })
  //   })
  // })
  // })

  describe("#relayedCall()", function () {
    const paymasterDeposit = (1e18).toString();

    before(async () => {
      // TODO: not needed. use startGsn instead
      // await GsnTestEnvironment.startGsn("mainnet");
      await setTokenBalanceInStorage(usdc, owner.address, "40000");

      const stake = parseUnits("10000", 6).toString();
      await usdc.connect(owner).approve(stakeManager.address, stake);
      await registerAsRelayServer(usdc, stakeManager, maker, owner, stake, relayHub);
      await relayHub.depositFor(paymaster.address, { value: paymasterDeposit });
      await paymaster.setRelayHub(relayHub.address);
    });

    // it('should reject if incorrect signature', async () => {
    //   const wrongSignature = await getEip712Signature(
    //     web3,
    //     new TypedRequestData(
    //       defaultGsnConfig.domainSeparatorName,
    //       222,
    //       forwarder.address,
    //       relayRequest
    //     )
    //   )
    //   const gas = 5000000

    //   const req = mergeRelayRequest(relayRequest, { paymasterData: web3.eth.abi.encodeParameter('address', uniswap.address) })
    //   const relayCall: any = await hub.relayCall.call(defaultGsnConfig.domainSeparatorName, 1e06, req, wrongSignature, '0x', {
    //     from: relay,
    //     gas
    //   })
    //   assert.equal(decodeRevertReason(relayCall.returnValue), 'FWD: signature mismatch')
    // })

    it("should pay with token to make a call", async function () {
      // const _relayRequest: any = cloneRelayRequest(relayRequest);
      // _relayRequest.request.nonce = (await forwarder.getNonce(maker.address)).toString();
      // _relayRequest.relayData.maxFeePerGas = (1e9).toString();
      // _relayRequest.relayData.maxPriorityFeePerGas = (1e9).toString();
      // _relayRequest.request.value = BigNumber.from("0").toString();
      // _relayRequest.request.gas = BigNumber.from("1000000").toString();

      // _relayRequest.relayData.paymasterData = web3.eth.abi.encodeParameter('address', uniswap.address)

      // note that by default, ganache is buggy: getChainId returns 1337 but on-chain "chainid" returns 1.
      // only if we pass it "--chainId 1337" the above 2 return the same value...
      const chainId = await getChainId();

      // const dataToSign = new TypedRequestData(
      //   defaultGsnConfig.domainSeparatorName,
      //   chainId,
      //   forwarder.address,
      //   _relayRequest
      // )
      // const signature = await getEip712Signature(
      //   web3,
      //   dataToSign
      // )
      const preBalance = await relayHub.balanceOf(paymaster.address);
      const deadline = ethers.constants.MaxUint256;
      const sig = await getPermitSignature(this.signers.alice, usdc, paymaster.address, depositAmountUSDC, deadline, {
        version: "2",
      });

      let permitData = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint8", "bytes32", "bytes32"],
        [this.signers.alice.address, paymaster.address, depositAmountUSDC, deadline, sig.v, sig.r, sig.s],
      );

      // await usdc.connect(this.signers.alice).approve(paymaster.address, ethers.constants.MaxUint256);
      // console.log(defaultGsnConfig.domainSeparatorName);
      // console.log(10e6.toString());
      // console.log(await _relayRequest);
      // console.log(metaTxSignature);
      console.log("maker pre balance", await maker.getBalance());
      console.log("alice pre balance", await vault.balanceOf(this.signers.alice.address));

      const externalGasLimit = (5e6).toString();
      const relayCall = await relayHub
        .connect(maker)
        .relayCall(defaultGsnConfig.domainSeparatorName, (10e6).toString(), relayRequest, metaTxSignature, permitData, {
          gasLimit: externalGasLimit,
        });

      const ret = await relayCall.wait();
      console.log("maker post balance", await maker.getBalance());
      console.log("alice post balance", await vault.balanceOf(this.signers.alice.address));

      const rejected = ret.events?.find(log => log.event === "TransactionRejectedByPaymaster");
      // @ts-ignore
      if (rejected != null) {
        `Rejected with reason: ${decodeRevertReason(rejected?.args?.reason) as string}`;
      }
      // const relayed = ret.events?.find(log => log.event === "TransactionRelayed");
      // @ts-ignore
      // const events = await paymaster.getPastEvents();
      // const chargedEvent = events.find((e: any) => e.event === "TokensCharged");

      // console.log({ relayed, chargedEvent })
      // @ts-ignore
      // console.log("charged: ", relayed?.args.charge.toString());
      // @ts-ignore
      // assert.equal(relayed!.args.status, 0)
      // const postTokens = await usdc.balanceOf(this.signers.alice.address);
      // const usedTokens = preTokens.sub(postTokens);

      // console.log("alice tokens balance change (used ETH): ", usedTokens.toString());
      // // @ts-ignore
      // console.log("reported charged tokens in TokensCharged: ", chargedEvent.args.tokenActualCharge.toString());
      // @ts-ignore
      // const expectedTokenCharge = await uniswap.getTokenToEthOutputPrice(chargedEvent.args.ethActualCharge)
      // assert.closeTo(usedTokens.toNumber(), expectedTokenCharge.toNumber(), 1000)
      // const postBalance = await hub.balanceOf(paymaster.address)

      // assert.ok(postBalance >= preBalance,
      //   `expected paymaster balance not to be reduced: pre=${preBalance.toString()} post=${postBalance.toString()}`)
      // // TODO: add test for relayed.args.charge, once gasUsedWithoutPost parameter is fixed (currently, its too high, and Paymaster "charges" too much)
      // const postPaymasterTokens = await token.balanceOf(paymaster.address)
      // console.log('Paymaster "earned" tokens:', postPaymasterTokens.sub(prePaymasterTokens).toString())
      // console.log('Paymaster "earned" deposit on RelayHub:', postBalance.sub(preBalance).toString())
    });
  });
});
