import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { BigNumber, BytesLike } from "ethers";
import { deployments, ethers, getChainId, network } from "hardhat";
import { eEVMNetwork } from "../../helper-hardhat-config";
import { getAccountsMerkleProof, getAccountsMerkleRoot, Signers, to_10powNumber_BN } from "../../helpers/utils";
import { deployTestHub, getVaultDeploymentAndConfigure, signTypedData } from "./utils";
import {
  ERC20Permit,
  ERC20Permit__factory,
  VaultGateway,
  Vault,
  TokenPaymaster,
  RelayHub,
  StakeManager,
  IForwarder,
  TestHub,
} from "../../typechain";
import { getPermitSignature, setTokenBalanceInStorage } from "./utils";
import { GsnTestEnvironment } from "@opengsn/cli/dist/GsnTestEnvironment";
import { RelayRequest, defaultEnvironment, decodeRevertReason, constants } from "@opengsn/common";
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
  let relayer: SignerWithAddress;
  let alice: SignerWithAddress;

  let paymaster: TokenPaymaster;
  let relayHub: RelayHub;
  let forwarder: IForwarder;
  let usdc: ERC20Permit;
  let vaultGateway: VaultGateway;
  let vault: Vault;
  let stakeManager: StakeManager;
  let penalizer: Penalizer;
  let relayRequest: RelayRequest;
  let paymasterData: string;
  let metaTxSignature: BytesLike;
  let depositAmountUSDC: BigNumber;
  let permitData: string;

  const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const UniswapV2Router02Address = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

  before(async function () {
    await deployments.fixture();
    [owner, relayer, alice] = await ethers.getSigners();

    //Get Oracle deployment
    const oracle = await deployments.get("OptyFiOracle");

    //Deploy Relay Hub
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

    //Deploy Forwarder and set request type and domain separator
    forwarder = <IForwarder>await deploy("Forwarder");
    await forwarder.registerRequestType(GsnRequestType.typeName, GsnRequestType.typeSuffix);
    await forwarder.registerDomainSeparator(defaultGsnConfig.domainSeparatorName, GsnDomainSeparatorType.version);

    //Deploy Paymaster, set RelayHub and Forwarder
    paymaster = <TokenPaymaster>await deploy("TokenPaymaster", oracle.address);
    await paymaster.connect(owner).setRelayHub(relayHub.address);
    await paymaster.setTrustedForwarder(forwarder.address);

    //Deploy Vault Gateway
    vaultGateway = <VaultGateway>await deploy("VaultGateway", forwarder.address);

    //Get USDC instance
    usdc = <ERC20Permit>await ethers.getContractAt(ERC20Permit__factory.abi, USDC);

    //Set balance for Owner and Alice
    await setTokenBalanceInStorage(usdc, owner.address, "20000");
    await setTokenBalanceInStorage(usdc, alice.address, "40000");

    const context = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256", "address"],
      [relayer.address, 5000000, usdc.address],
    );

    //Set deposit amount
    depositAmountUSDC = ethers.utils.parseUnits("10000", 6);

    //Set swap deadline
    const swapDeadline = BigNumber.from("1000000000000000000000000000000000000");

    //Encode dex approval and paymaster data (used to refund relayer)
    const approveData = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256"],
      [UniswapV2Router02Address, depositAmountUSDC],
    );
    paymasterData = ethers.utils.defaultAbiCoder.encode(
      ["tuple(address, address, bool, bytes, bytes, bytes, address[], uint256)"],
      [[usdc.address, UniswapV2Router02Address, false, "0x", approveData, "0x", [USDC, WETH], swapDeadline]],
    );

    //Calculate gas spent in postRelayCall (swap tokens to refund relayer)
    const gasUsedByPost = await calculatePostGas(usdc, paymaster, paymasterData, owner, depositAmountUSDC, context);

    //Set postRelayCall gas usage
    await paymaster.connect(owner).setPostGasUsage(gasUsedByPost);

    console.log("paymaster post with precharge=", (await paymaster.gasUsedByPost()).toString());

    //Get Vault deployment and set configuration
    vault = await getVaultDeploymentAndConfigure(
      "opUSDC-Save",
      "908337486804231642580332837833655270430560746049134246454386846501909299200",
      "10000000000",
      "1000000000",
      "1000000000000",
    );

    //Get accounts proof
    const _accountsRoot = getAccountsMerkleRoot([alice.address, vaultGateway.address]);
    await vault.connect(owner).setWhitelistedAccountsRoot(_accountsRoot);
    let accountsProof = getAccountsMerkleProof([alice.address, vaultGateway.address], vaultGateway.address);

    //Sign VaultGateway permit to use Alice's USDC
    const deadline = ethers.constants.MaxUint256;
    const sig = await getPermitSignature(alice, usdc, vaultGateway.address, depositAmountUSDC, deadline, {
      version: "2",
      nonce: BigNumber.from("1"),
    });
    let permitVaultGateway = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint8", "bytes32", "bytes32"],
      [alice.address, vaultGateway.address, depositAmountUSDC, deadline, sig.v, sig.r, sig.s],
    );

    //Vault Gateway deposit() Call
    const dataCall = vaultGateway.interface.encodeFunctionData("deposit", [
      vault.address,
      depositAmountUSDC,
      BigNumber.from("0"),
      permitVaultGateway,
      accountsProof,
    ]);

    //RelayRequest Call
    const provider = ethers.getDefaultProvider();
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ? feeData.gasPrice.toString() : "";

    relayRequest = {
      request: {
        from: alice.address,
        to: vaultGateway.address,
        value: "0",
        gas: "1000000",
        nonce: (await forwarder.getNonce(alice.address)).toString(),
        data: dataCall,
        validUntilTime: ethers.constants.MaxUint256.toString(),
      },
      relayData: {
        maxFeePerGas: gasPrice,
        maxPriorityFeePerGas: gasPrice,
        transactionCalldataGasUsed: "0",
        relayWorker: relayer.address,
        paymaster: paymaster.address,
        forwarder: forwarder.address,
        paymasterData,
        clientId: "1",
      },
    };

    //Sign USDC permit
    const sig2 = await getPermitSignature(alice, usdc, paymaster.address, depositAmountUSDC, deadline, {
      version: "2",
    });

    permitData = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint8", "bytes32", "bytes32"],
      [alice.address, paymaster.address, depositAmountUSDC, deadline, sig2.v, sig2.r, sig2.s],
    );
  });

  after(async function () {
    await GsnTestEnvironment.stopGsn();
  });

  describe("#relayedCall()", function () {
    const paymasterDeposit = (1e18).toString();

    before(async () => {
      await setTokenBalanceInStorage(usdc, owner.address, "40000");

      const stake = parseUnits("10000", 6).toString();
      await usdc.connect(owner).approve(stakeManager.address, stake);
      await registerAsRelayServer(usdc, stakeManager, relayer, owner, stake, relayHub);
      await relayHub.depositFor(paymaster.address, { value: paymasterDeposit });
      await paymaster.setRelayHub(relayHub.address);
    });

    it("should reject if incorrect signature", async () => {
      const dataToSign = new TypedRequestData(
        defaultGsnConfig.domainSeparatorName,
        222, //wrong chainId
        forwarder.address,
        relayRequest,
      );

      //Sign Meta Transaction
      const wrongSignature = await signTypedData(relayer.provider, relayer.address, dataToSign);

      const externalGasLimit = (5e6).toString();
      const relayCall = await relayHub
        .connect(relayer)
        .callStatic.relayCall(
          defaultGsnConfig.domainSeparatorName,
          (10e6).toString(),
          relayRequest,
          wrongSignature,
          permitData,
          {
            gasLimit: externalGasLimit,
          },
        );

      expect(decodeRevertReason(relayCall.returnValue)).eq("FWD: signature mismatch");
    });

    it("should pay with token to make a call", async function () {
      const chainId = +(await getChainId());
      const dataToSign = new TypedRequestData(
        defaultGsnConfig.domainSeparatorName,
        chainId,
        forwarder.address,
        relayRequest,
      );

      //Sign Meta Transaction
      metaTxSignature = await signTypedData(alice.provider, alice.address, dataToSign);

      const preRelayAliceVaultBalance = await vault.balanceOf(alice.address);
      const preRelayAliceETHBalance = await alice.getBalance();
      const relayerPreBalance = await relayer.getBalance();

      //Execute Relay Call
      const externalGasLimit = (5e6).toString();
      expect(
        await relayHub
          .connect(relayer)
          .relayCall(
            defaultGsnConfig.domainSeparatorName,
            (10e6).toString(),
            relayRequest,
            metaTxSignature,
            permitData,
            {
              gasLimit: externalGasLimit,
            },
          ),
      )
        .to.emit(relayHub, "TransactionRelayed")
        .to.emit(paymaster, "TokensCharged");

      const postRelayAliceVaultBalance = await vault.balanceOf(alice.address);
      const postRelayAliceETHBalance = await alice.getBalance();

      //Alice Vault tokens increased
      expect(postRelayAliceVaultBalance).gt(preRelayAliceVaultBalance);

      //Alice ETH balance don't change
      expect(postRelayAliceETHBalance).eq(preRelayAliceETHBalance);

      //Relayer receiced more ETH than spent
      const ethReceived = await relayHub.balanceOf(relayer.address);
      expect(ethReceived).gt(0);
      await relayHub.connect(relayer).withdraw(relayer.address, ethReceived);
      const relayerPostBalance = await relayer.getBalance();
      expect(relayerPostBalance).gt(relayerPreBalance);
    });
  });
});
