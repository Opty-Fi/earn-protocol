import hre from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import { deployContract, solidity } from "ethereum-waffle";
import { Artifact } from "hardhat/types";
import { Signers } from "../../helpers/utils";
import {
  InitializableImmutableAdminUpgradeabilityProxy,
  Registry,
  RiskManagerProxy,
  RiskManagerV2,
  StrategyProviderV2,
  VaultV2,
} from "../../typechain";
import {
  opUSDCgrow,
  opWETHgrow,
  RegistryProxy,
  RiskManagerProxy as RiskManagerProxyAddress,
  RiskManager,
} from "../../_deployments/mainnet.json";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";

chai.use(solidity);

const OPUSDCGROW_VAULT_PROXY_ADDRESS = opUSDCgrow.VaultProxy;
const OPWETHGROW_VAULT_PROXY_ADDRESS = opWETHgrow.VaultProxy;
const REGISTRY_PROXY = RegistryProxy;
const RISK_MANAGER_PROXY = RiskManagerProxyAddress;
const RISK_MANAGER = RiskManager;

// TODO: upgrade to RegistryV2

describe("test VaultV2 with onchain upgrade (opUSDCgrow, opWETHgrow)", () => {
  before(async function () {
    // if fork is Ethereum mainnet is included in VAULT_DEPLOYED_NETWORKS
    // then upgrade existing contract
    // or deploy new upgradeable vault contract
    const vaultV2Artifact: Artifact = await hre.artifacts.readArtifact(ESSENTIAL_CONTRACTS.VAULT_V2);
    const riskManagerV2Artifact: Artifact = await hre.artifacts.readArtifact(ESSENTIAL_CONTRACTS.RISK_MANAGER_V2);
    const strategyProviderV2Artifact: Artifact = await hre.artifacts.readArtifact(
      ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER_V2,
    );
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await hre.ethers.getSigners();
    this.signers.deployer = signers[0];
    this.registry = <Registry>await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, REGISTRY_PROXY);
    const operatorAddress = await this.registry.getOperator();
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [operatorAddress],
    });
    this.signers.operator = await hre.ethers.getSigner(operatorAddress);
    this.riskManagerProxy = <RiskManagerProxy>(
      await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER_PROXY, RISK_MANAGER_PROXY)
    );
    this.riskManagerV2 = <RiskManagerV2>(
      await deployContract(this.signers.deployer, riskManagerV2Artifact, [REGISTRY_PROXY])
    );
    await this.riskManagerProxy.connect(this.signers.operator).setPendingImplementation(this.riskManagerV2.address);
    await this.riskManagerV2.connect(this.signers.operator).become(this.riskManagerProxy.address);
    this.strategyProviderV2 = <StrategyProviderV2>(
      await deployContract(this.signers.deployer, strategyProviderV2Artifact, [REGISTRY_PROXY])
    );

    await this.registry.connect(this.signers.operator).setStrategyProvider(this.strategyProviderV2.address);
    await this.registry.connect(this.signers.operator).setRiskManager(this.riskManagerV2.address);
    // testing already deployed contracts
    // this code block may fail if the block number is made greater than
    // the block at which vaults are upgraded to V2 or fork is other than Ethereum
    // ====================================================
    this.opUSDCgrowProxy = <InitializableImmutableAdminUpgradeabilityProxy>(
      await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, OPUSDCGROW_VAULT_PROXY_ADDRESS)
    );
    const adminAddress = await this.opUSDCgrowProxy.admin();
    this.signers.admin = await hre.ethers.getSigner(adminAddress);
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [adminAddress],
    });
    // ====================================================
    this.opWETHgrowProxy = <InitializableImmutableAdminUpgradeabilityProxy>(
      await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, OPWETHGROW_VAULT_PROXY_ADDRESS)
    );
    // // ====================================================
    this.opUSDCgrowV2 = <VaultV2>(
      await deployContract(this.signers.deployer, vaultV2Artifact, [
        REGISTRY_PROXY,
        "USD Coin",
        "USDC",
        "Growth",
        "grow",
      ])
    );
    await this.opUSDCgrowProxy.connect(this.signers.admin).upgradeTo(this.opUSDCgrowV2.address);
    this.opUSDCgrowV2 = <VaultV2>(
      await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_V2, this.opUSDCgrowProxy.address)
    );
    // ====================================================
    this.opWETHgrowV2 = <VaultV2>(
      await hre.waffle.deployContract(this.signers.deployer, vaultV2Artifact, [
        REGISTRY_PROXY,
        "Wrapped Ether",
        "WETH",
        "Growth",
        "grow",
      ])
    );
    await this.opWETHgrowProxy.connect(this.signers.admin).upgradeTo(this.opWETHgrowV2.address);
    this.opWETHgrowV2 = <VaultV2>(
      await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_V2, this.opWETHgrowProxy.address)
    );
    // ====================================================
    // this.vaultV2 = <VaultV2>await hre.waffle.deployContract(this.signers.deployer, vaultV2Artifact, [REGISTRY_PROXY,"USD Coin", "USDC", "Growth", "grow"]);
    // const vaultProxyV2Artifact: Artifact = await hre.artifacts.readArtifact("AdminUpgradeabilityProxy");
    // this.vaultProxyV2 = <AdminUpgradeabilityProxy>(
    //   await hre.waffle.deployContract(this.signers.deployer, vaultProxyV2Artifact, [this.vaultV2.address,this.signers.operator.address,""])
    // );
  });
  describe("VaultV2 Configuration", () => {
    before(async function () {
      console.log("fn1");
    });
    it("opToken_revision for opUSDCgrow and opWETHgrow should be as expected", async function () {
      expect(await this.opUSDCgrowV2.opTOKEN_REVISION()).to.eq("0x3");
      expect(await this.opWETHgrowV2.opTOKEN_REVISION()).to.eq("0x3");
    });
    it("default values for opUSDCgrow and opWETHgrow should be as expected", async function () {});
  });

  describe("VaultV2 strategies", () => {
    before(async function () {
      console.log("fn1");
    });
    for (let i = 0; i < 10; i++) {
      it(`strategy${i}`, async function () {
        console.log("fn1");
      });
    }
  });
});
