import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { BigNumber } from "ethers";
import { deployments, ethers } from "hardhat";
import { eEVMNetwork } from "../../helper-hardhat-config";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../helpers/constants/tokens";
import { getAccountsMerkleProof, getAccountsMerkleRoot, Signers, to_10powNumber_BN } from "../../helpers/utils";
import { signMetaTxRequest } from "./utils";
import {
  ERC20Permit,
  ERC20Permit__factory,
  MetaVault,
  MinimalForwarder,
  Registry,
  Registry__factory,
  Vault,
  Vault__factory,
} from "../../typechain";
import { getPermitSignature, setTokenBalanceInStorage } from "./utils";

chai.use(solidity);
const fork = process.env.FORK as eEVMNetwork;

async function deploy(name: string, ...params: any[]) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then(f => f.deployed());
}

describe("MetaVault", function () {
  before(async function () {
    //deploy contracts
    await deployments.fixture();
    this.forwarder = <MinimalForwarder>await deploy("MinimalForwarder");
    this.metaVault = <MetaVault>await deploy("MetaVault", this.forwarder.address);

    const OPUSDCGROW_VAULT_ADDRESS = (await deployments.get("opUSDCearn")).address;
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

    const _accountsRoot = getAccountsMerkleRoot([this.signers.alice.address, this.metaVault.address]);
    await this.vault.connect(this.signers.governance).setWhitelistedAccountsRoot(_accountsRoot);

    //add USDC balance to user
    this.usdc = <ERC20Permit>(
      await ethers.getContractAt(ERC20Permit__factory.abi, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address)
    );
    await setTokenBalanceInStorage(this.usdc, this.signers.alice.address, "20000");

    this.accountsProof = getAccountsMerkleProof(
      [this.signers.alice.address, this.metaVault.address],
      this.metaVault.address,
    );

    this.depositAmountUSDC = BigNumber.from("1000").mul(to_10powNumber_BN("6"));
  });
  describe("MetaVault Test", function () {
    beforeEach(async function () {
      const deadline = ethers.constants.MaxUint256;
      const sig = await getPermitSignature(
        this.signers.alice,
        this.usdc,
        this.metaVault.address,
        this.depositAmountUSDC,
        deadline,
        { version: "2" },
      );
      this.dataMetaVaultPermit = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint8", "bytes32", "bytes32"],
        [this.signers.alice.address, this.metaVault.address, this.depositAmountUSDC, deadline, sig.v, sig.r, sig.s],
      );
    });

    it("deposit using MetaVaults directly", async function () {
      await expect(
        this.metaVault
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

      const dataCall = this.metaVault.interface.encodeFunctionData("deposit", [
        this.vault.address,
        this.depositAmountUSDC,
        BigNumber.from("0"),
        this.dataMetaVaultPermit,
        this.accountsProof,
      ]);

      const { request, signature } = await signMetaTxRequest(this.signers.alice.provider, forwarder, {
        from: this.signers.alice.address,
        to: this.metaVault.address,
        data: dataCall,
      });

      await expect(forwarder.execute(request, signature))
        .to.emit(this.vault, "Transfer")
        .withArgs(ethers.constants.AddressZero, this.signers.alice.address, this.depositAmountUSDC);
    });
  });
});
