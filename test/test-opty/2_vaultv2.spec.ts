import hre, { ethers } from "hardhat";
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
} from "../../_deployments/mainnet.json";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { TypedTokens } from "../../helpers/data";
import { getAddress } from "ethers/lib/utils";

chai.use(solidity);

const OPUSDCGROW_VAULT_PROXY_ADDRESS = opUSDCgrow.VaultProxy;
const OPWETHGROW_VAULT_PROXY_ADDRESS = opWETHgrow.VaultProxy;
const REGISTRY_PROXY = RegistryProxy;
const RISK_MANAGER_PROXY = RiskManagerProxyAddress;

// TODO: upgrade to RegistryV2

describe("VaultV2", () => {
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
    this.signers.admin = signers[1];
    this.registry = <Registry>await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, REGISTRY_PROXY);
    const operatorAddress = await this.registry.getOperator();
    const financeOperatorAddress = await this.registry.getFinanceOperator();
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [operatorAddress],
    });
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [financeOperatorAddress],
    });
    this.signers.operator = await hre.ethers.getSigner(operatorAddress);
    this.signers.financeOperator = await hre.ethers.getSigner(financeOperatorAddress);
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
  describe("VaultV2 after on-chain upgrade", () => {
    before(async function () {
      console.log("fn1");
    });

    it("default values from for v1 opUSDCgrow should be as expected", async function () {
      expect(await this.opUSDCgrowV2.opTOKEN_REVISION()).to.eq("0x3");
      expect(await this.opUSDCgrowV2.registryContract()).to.eq(getAddress(this.registry.address));
      expect(await this.opUSDCgrowV2.riskProfileCode()).to.eq("1");
      expect(await this.opUSDCgrowV2.underlyingToken()).to.eq(TypedTokens["USDC"]);
      expect(await this.opUSDCgrowV2.name()).to.eq("op USD Coin Growth");
      expect(await this.opUSDCgrowV2.symbol()).to.eq("opUSDCgrow");
      expect(await this.opUSDCgrowV2.decimals()).to.eq(6);
      expect(await this.opUSDCgrowV2.maxVaultValueJump()).to.eq("100");
    });

    it("default values for v1 opWETHgrow should be as expected", async function () {
      expect(await this.opWETHgrowV2.opTOKEN_REVISION()).to.eq("0x3");
      expect(await this.opWETHgrowV2.registryContract()).to.eq(getAddress(this.registry.address));
      expect(await this.opWETHgrowV2.riskProfileCode()).to.eq("1");
      expect(await this.opWETHgrowV2.underlyingToken()).to.eq(TypedTokens["WETH"]);
      expect(await this.opWETHgrowV2.name()).to.eq("op Wrapped Ether Growth");
      expect(await this.opWETHgrowV2.symbol()).to.eq("opWETHgrow");
      expect(await this.opWETHgrowV2.decimals()).to.eq(18);
      expect(await this.opWETHgrowV2.maxVaultValueJump()).to.eq("100");
    });

    it("vaultConfigurationV2()", async function () {
      const vaultConfigurationV2 = await this.opUSDCgrowV2.vaultConfiguration();
      expect(vaultConfigurationV2.discontinued).to.be.false;
      expect(vaultConfigurationV2.unpaused).to.be.false;
      expect(vaultConfigurationV2.allowWhitelistedState).to.be.false;
      expect(vaultConfigurationV2.depositFeeFlatUT).to.eq("0");
      expect(vaultConfigurationV2.depositFeePct).to.eq("0");
      expect(vaultConfigurationV2.withdrawalFeeFlatUT).to.eq("0");
      expect(vaultConfigurationV2.withdrawalFeePct).to.eq("0");
      expect(vaultConfigurationV2.userDepositCapUT).to.eq("0");
      expect(vaultConfigurationV2.minimumDepositValueUT).to.eq("0");
      expect(vaultConfigurationV2.totalValueLockedLimitUT).to.eq("0");
    });

    it("fail setValueControlParams() by non Finance operator", async function () {
      await expect(
        this.opUSDCgrowV2.setValueControlParams(true, "10000000000", "1000000000", "1000000000000", "100"),
      ).to.be.revertedWith("caller is not the financeOperator");
    });

    it("setValueControlParams() by Finance operator", async function () {
      await this.opUSDCgrowV2.connect(this.signers.financeOperator).setValueControlParams(
        true,
        "10000000000", // 10,000 USDC
        "1000000000", // 1000 USDC
        "1000000000000", // 1,000,000 USDC
        "100", // 1%
      );
      const vaultConfigurationV2 = await this.opUSDCgrowV2.vaultConfiguration();
      expect(vaultConfigurationV2.allowWhitelistedState).to.be.true;
      expect(vaultConfigurationV2.userDepositCapUT).to.eq("10000000000");
      expect(vaultConfigurationV2.minimumDepositValueUT).to.eq("1000000000");
      expect(vaultConfigurationV2.totalValueLockedLimitUT).to.eq("1000000000000");
      expect(await this.opUSDCgrowV2.maxVaultValueJump()).to.eq("100");
    });

    it("fail setFeeParams() by non Finance operator", async function () {
      await expect(
        this.opUSDCgrowV2.setFeeParams(
          "1000000", // 1 USDC
          "5", // 0.05
          "1000000", // 1 USDC
          "5", // 0.05%
          this.signers.admin.address, // address for vault collector
        ),
      ).to.be.revertedWith("caller is not the financeOperator");
    });

    it("setFeeParams() by Finance operator", async function () {
      await this.opUSDCgrowV2.connect(this.signers.financeOperator).setFeeParams(
        "1000000", // 1 USDC
        "5", // 0.05%
        "1000000", // 1 USDC
        "5", // 0.05%
        this.signers.admin.address, // address for vault collector
      );
      const vaultConfigurationV2 = await this.opUSDCgrowV2.vaultConfiguration();
      expect(vaultConfigurationV2.depositFeeFlatUT).to.eq("1000000");
      expect(vaultConfigurationV2.depositFeePct).to.eq("5");
      expect(vaultConfigurationV2.withdrawalFeeFlatUT).to.eq("1000000");
      expect(vaultConfigurationV2.withdrawalFeePct).to.eq("5");
      expect(vaultConfigurationV2.vaultFeeCollector).to.eq(this.signers.admin.address);
    });
    it("fails setMaxVaultValueJump() call by non finance operator", async function () {
      await expect(this.opUSDCgrowV2.setMaxVaultValueJump("100")).to.be.revertedWith(
        "caller is not the financeOperator",
      );
    });
    it("setMaxVaultValueJump() call by finance operator", async function () {
      await this.opUSDCgrowV2.connect(this.signers.financeOperator).setMaxVaultValueJump("100");
      expect(await this.opUSDCgrowV2.maxVaultValueJump()).to.eq("100");
    });
    it("fails setAllowWhitelistedState() call by non finance operator", async function () {
      await expect(this.opUSDCgrowV2.setAllowWhitelistedState(false)).to.be.revertedWith("caller is not the operator");
    });
    it("setAllowWhitelistedState() call by finance operator", async function () {
      await this.opUSDCgrowV2.connect(this.signers.operator).setAllowWhitelistedState(false);
      expect((await this.opUSDCgrowV2.vaultConfiguration())[2]).to.be.false;
    });

    it("fails setUserDepositCapUT() call by non finance operator", async function () {
      await expect(this.opUSDCgrowV2.setUserDepositCapUT("10")).to.be.revertedWith("caller is not the operator");
    });
    it("setUserDepositCapUT() call by finance operator", async function () {
      await this.opUSDCgrowV2.connect(this.signers.operator).setUserDepositCapUT("10");
      expect((await this.opUSDCgrowV2.vaultConfiguration())[8]).to.eq("10");
    });

    it("fails setMinimumDepositValueUT() call by non finance operator", async function () {
      await expect(this.opUSDCgrowV2.setMinimumDepositValueUT("1000")).to.be.revertedWith("caller is not the operator");
    });
    it("setMinimumDepositValueUT() call by finance operator", async function () {
      await this.opUSDCgrowV2.connect(this.signers.operator).setMinimumDepositValueUT("1000");
      expect((await this.opUSDCgrowV2.vaultConfiguration())[9]).to.eq("1000");
    });

    it("fails setTotalValueLockedLimitUT() call by non finance operator", async function () {
      await expect(this.opUSDCgrowV2.setTotalValueLockedLimitUT("100000000")).to.be.revertedWith(
        "caller is not the operator",
      );
    });
    it("setTotalValueLockedLimitUT() call by finance operator", async function () {
      await this.opUSDCgrowV2.connect(this.signers.operator).setTotalValueLockedLimitUT("100000000");
      expect((await this.opUSDCgrowV2.vaultConfiguration())[10]).to.eq("100000000");
    });
  });
  describe("VaultV2 strategies", () => {
    before(async function () {
      console.log(await this.opUSDCgrowV2.vaultConfiguration());
    });
    for (let i = 0; i < 10; i++) {
      it(`strategy${i}`, async function () {
        console.log("fn1");
      });
    }
  });
});
