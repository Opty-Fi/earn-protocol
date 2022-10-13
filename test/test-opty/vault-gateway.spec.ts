import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { BigNumber } from "ethers";
import { deployments, ethers, getChainId } from "hardhat";
import { eEVMNetwork } from "../../helper-hardhat-config";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../helpers/constants/tokens";
import { getAccountsMerkleProof, getAccountsMerkleRoot, Signers, to_10powNumber_BN } from "../../helpers/utils";
import { signTypedData } from "./utils";
import {
  ERC20Permit,
  ERC20Permit__factory,
  Forwarder,
  VaultGateway,
  Registry,
  Registry__factory,
  Vault,
  Vault__factory,
} from "../../typechain";
import { getPermitSignature, setTokenBalanceInStorage } from "./utils";
import { GsnDomainSeparatorType, GsnRequestType, TypedRequestData } from "@opengsn/common";
import { defaultGsnConfig } from "@opengsn/provider";
import { SignTypedDataVersion, TypedDataUtils } from "@metamask/eth-sig-util";
import keccak256 from "keccak256";

chai.use(solidity);
const fork = process.env.FORK as eEVMNetwork;

async function deploy(name: string, ...params: any[]) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then(f => f.deployed());
}

const EIP712Domain = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
];

const RelayRequest = [
  { name: "from", type: "address" },
  { name: "to", type: "address" },
  { name: "value", type: "uint256" },
  { name: "gas", type: "uint256" },
  { name: "nonce", type: "uint256" },
  { name: "data", type: "bytes" },
  { name: "validUntilTime", type: "uint256" },
  { name: "relayData", type: "RelayData" },
];

const RelayData = [
  { name: "maxFeePerGas", type: "uint256" },
  { name: "maxPriorityFeePerGas", type: "uint256" },
  { name: "transactionCalldataGasUsed", type: "uint256" },
  { name: "relayWorker", type: "address" },
  { name: "paymaster", type: "address" },
  { name: "forwarder", type: "address" },
  { name: "paymasterData", type: "bytes" },
  { name: "clientId", type: "uint256" },
];

describe("VaultGateway", function () {
  before(async function () {
    //deploy contracts
    await deployments.fixture();
    this.forwarder = <Forwarder>await deploy("Forwarder");
    await this.forwarder.registerRequestType(GsnRequestType.typeName, GsnRequestType.typeSuffix);
    await this.forwarder.registerDomainSeparator(defaultGsnConfig.domainSeparatorName, GsnDomainSeparatorType.version);
    this.vaultGateway = <VaultGateway>await deploy("VaultGateway", this.forwarder.address);

    const OPUSDCGROW_VAULT_ADDRESS = (await deployments.get("opUSDC-Save")).address;
    const REGISTRY_PROXY_ADDRESS = (await deployments.get("RegistryProxy")).address;

    this.vault = <Vault>await ethers.getContractAt(Vault__factory.abi, OPUSDCGROW_VAULT_ADDRESS);
    this.registry = <Registry>await ethers.getContractAt(Registry__factory.abi, REGISTRY_PROXY_ADDRESS);

    //Get signers
    const financeOperatorAddress = await this.registry.getFinanceOperator();
    const governanceAddress = await this.registry.getGovernance();
    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers = {} as Signers;
    this.signers.financeOperator = await ethers.getSigner(financeOperatorAddress);
    this.signers.governance = await ethers.getSigner(governanceAddress);
    this.signers.alice = signers[0];
    this.relayer = signers[1];
    console.log("financeOperator", this.signers.financeOperator.address);
    console.log("governance", this.signers.governance.address);
    console.log("alice", this.signers.alice.address);
    console.log("relayer", this.relayer.address);

    //set vault config
    const _vaultConfiguration = BigNumber.from(
      "908337486804231642580332837833655270430560746049134246454386846501909299200",
    );
    await this.vault.connect(this.signers.governance).setVaultConfiguration(_vaultConfiguration);
    await this.vault.connect(this.signers.financeOperator).setValueControlParams(
      "10000000000", // 10,000 USDC
      "1000000000", // 1000 USDC
      "1000000000000", // 1,000,000 USDC
    );

    const _accountsRoot = getAccountsMerkleRoot([this.signers.alice.address, this.vaultGateway.address]);
    await this.vault.connect(this.signers.governance).setWhitelistedAccountsRoot(_accountsRoot);

    //add USDC balance to user
    this.usdc = <ERC20Permit>(
      await ethers.getContractAt(ERC20Permit__factory.abi, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address)
    );
    await setTokenBalanceInStorage(this.usdc, this.signers.alice.address, "20000");

    this.accountsProof = getAccountsMerkleProof(
      [this.signers.alice.address, this.vaultGateway.address],
      this.vaultGateway.address,
    );

    this.depositAmountUSDC = BigNumber.from("1000").mul(to_10powNumber_BN("6"));
  });
  describe("VaultGateway Test", function () {
    beforeEach(async function () {
      const deadline = ethers.constants.MaxUint256;
      const sig = await getPermitSignature(
        this.signers.alice,
        this.usdc,
        this.vaultGateway.address,
        this.depositAmountUSDC,
        deadline,
        { version: "2" },
      );
      this.dataMetaVaultPermit = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint8", "bytes32", "bytes32"],
        [this.signers.alice.address, this.vaultGateway.address, this.depositAmountUSDC, deadline, sig.v, sig.r, sig.s],
      );
    });

    it("deposit using VaultGateway directly", async function () {
      await expect(
        this.vaultGateway
          .connect(this.signers.alice)
          .deposit(
            this.vault.address,
            this.depositAmountUSDC,
            BigNumber.from("0"),
            this.dataMetaVaultPermit,
            this.accountsProof,
          ),
      )
        .to.emit(this.vault, "Transfer")
        .withArgs(ethers.constants.AddressZero, this.signers.alice.address, this.depositAmountUSDC);
    });

    it("deposits via a meta-tx", async function () {
      const forwarder = this.forwarder.connect(this.relayer);

      const dataCall = this.vaultGateway.interface.encodeFunctionData("deposit", [
        this.vault.address,
        this.depositAmountUSDC,
        BigNumber.from("0"),
        this.dataMetaVaultPermit,
        this.accountsProof,
      ]);

      const provider = ethers.getDefaultProvider();
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice ? feeData.gasPrice.toString() : "";
      const relayRequest = {
        request: {
          from: this.signers.alice.address,
          to: this.vaultGateway.address,
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
          relayWorker: ethers.constants.AddressZero,
          paymaster: ethers.constants.AddressZero,
          forwarder: forwarder.address,
          paymasterData: "0x",
          clientId: "1",
        },
      };

      const chainId = +(await getChainId());

      const typeData = new TypedRequestData(
        defaultGsnConfig.domainSeparatorName,
        chainId,
        forwarder.address,
        relayRequest,
      );

      const signature = await signTypedData(this.signers.alice.provider, this.signers.alice.address, typeData);

      const data = {
        domain: {
          name: "GSN Relayed Transaction",
          version: "3",
          chainId,
          verifyingContract: forwarder.address,
        },
        primaryType: "RelayRequest",
        types: {
          EIP712Domain: EIP712Domain,
          RelayRequest: RelayRequest,
          RelayData: RelayData,
        },
        message: typeData.message,
      };

      const data2 = {
        types: {
          RelayData: RelayData,
        },
      };

      const GENERIC_PARAMS =
        "address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data,uint256 validUntilTime";
      const typeSuffix =
        "RelayData relayData)RelayData(uint256 maxFeePerGas,uint256 maxPriorityFeePerGas,uint256 transactionCalldataGasUsed,address relayWorker,address paymaster,address forwarder,bytes paymasterData,uint256 clientId)";
      const typeName = `RelayRequest(${GENERIC_PARAMS},${typeSuffix}`;
      const typeHash = keccak256(typeName);

      const hashSuffix = TypedDataUtils.hashStruct(
        "RelayData",
        relayRequest.relayData,
        data2.types,
        SignTypedDataVersion.V4,
      );

      const domainSeparator = TypedDataUtils.hashStruct(
        "EIP712Domain",
        data.domain,
        data.types,
        SignTypedDataVersion.V4,
      );

      await expect(forwarder.execute(relayRequest.request, domainSeparator, typeHash, hashSuffix, signature))
        .to.emit(this.vault, "Transfer")
        .withArgs(ethers.constants.AddressZero, this.signers.alice.address, this.depositAmountUSDC);
    });
  });
});
