import { artifacts, waffle, ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import { deployContract, solidity } from "ethereum-waffle";
import { Artifact } from "hardhat/types";
import { getAddress } from "ethers/lib/utils";
import { getSoliditySHA3Hash, Signers } from "../../helpers/utils";
import {
  AdminUpgradeabilityProxy,
  InitializableImmutableAdminUpgradeabilityProxy,
  Registry,
  RegistryProxy,
  RegistryV2,
  RiskManagerProxy,
  RiskManagerV2,
  StrategyProviderV2,
  VaultV2,
} from "../../typechain";
import {
  opUSDCgrow,
  opWETHgrow,
  RegistryProxy as RegistryProxyAddress,
  RiskManagerProxy as RiskManagerProxyAddress,
} from "../../_deployments/mainnet.json";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { TypedTokens } from "../../helpers/data";

chai.use(solidity);

const OPUSDCGROW_VAULT_PROXY_ADDRESS = opUSDCgrow.VaultProxy;
const OPWETHGROW_VAULT_PROXY_ADDRESS = opWETHgrow.VaultProxy;
const REGISTRY_PROXY_ADDRESS = RegistryProxyAddress;
const RISK_MANAGER_PROXY = RiskManagerProxyAddress;

const chainId = "1";
describe("VaultV2", () => {
  before(async function () {
    this.vaultV2Artifact = <Artifact>await artifacts.readArtifact(ESSENTIAL_CONTRACTS.VAULT_V2);
    this.registryV2Artifact = <Artifact>await artifacts.readArtifact(ESSENTIAL_CONTRACTS.REGISTRY_V2);
    const riskManagerV2Artifact: Artifact = await artifacts.readArtifact(ESSENTIAL_CONTRACTS.RISK_MANAGER_V2);
    const strategyProviderV2Artifact: Artifact = await artifacts.readArtifact(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER_V2);
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers.deployer = signers[0];
    this.signers.admin = signers[1];
    this.registryProxy = <RegistryProxy>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_PROXY, REGISTRY_PROXY_ADDRESS)
    );
    this.registry = <Registry>await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, REGISTRY_PROXY_ADDRESS);
    const operatorAddress = await this.registry.getOperator();
    const financeOperatorAddress = await this.registry.getFinanceOperator();
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [operatorAddress],
    });
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [financeOperatorAddress],
    });
    this.signers.operator = await ethers.getSigner(operatorAddress);
    this.signers.financeOperator = await ethers.getSigner(financeOperatorAddress);

    this.registryV2 = <RegistryV2>await waffle.deployContract(this.signers.deployer, this.registryV2Artifact);
    // the operator is not impersonated before calling below fn, please get operator from v1 then upgrade v2
    await this.registryProxy.connect(this.signers.operator).setPendingImplementation(this.registryV2.address);
    await this.registryV2.connect(this.signers.operator).become(this.registryProxy.address);
    this.registryV2 = <RegistryV2>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_V2, this.registryProxy.address)
    );
    this.riskManagerProxy = <RiskManagerProxy>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER_PROXY, RISK_MANAGER_PROXY)
    );
    this.riskManagerV2 = <RiskManagerV2>(
      await deployContract(this.signers.deployer, riskManagerV2Artifact, [REGISTRY_PROXY_ADDRESS])
    );
    await this.riskManagerProxy.connect(this.signers.operator).setPendingImplementation(this.riskManagerV2.address);
    await this.riskManagerV2.connect(this.signers.operator).become(this.riskManagerProxy.address);
    this.strategyProviderV2 = <StrategyProviderV2>(
      await deployContract(this.signers.deployer, strategyProviderV2Artifact, [REGISTRY_PROXY_ADDRESS])
    );

    await this.registryV2.connect(this.signers.operator).setStrategyProvider(this.strategyProviderV2.address);
    await this.registryV2.connect(this.signers.operator).setRiskManager(this.riskManagerV2.address);
  });
  describe("opUSDCgrowV2 and opWETHgrowV2 after on-chain upgrade", () => {
    before(async function () {
      // testing already deployed contracts
      // this code block may fail if the block number is made greater than
      // the block at which vaults are upgraded to V2 or fork is other than Ethereum
      // ====================================================
      this.opUSDCgrowProxy = <InitializableImmutableAdminUpgradeabilityProxy>(
        await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, OPUSDCGROW_VAULT_PROXY_ADDRESS)
      );
      const opUSDCgrowAdminAddress = await this.opUSDCgrowProxy.admin();
      const opUSDCgrowAdminSigner = await ethers.getSigner(opUSDCgrowAdminAddress);
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [opUSDCgrowAdminAddress],
      });
      // ====================================================
      this.opWETHgrowProxy = <InitializableImmutableAdminUpgradeabilityProxy>(
        await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, OPWETHGROW_VAULT_PROXY_ADDRESS)
      );
      const opWETHgrowAdminAddress = await this.opWETHgrowProxy.admin();
      const opWETHgrowAdminSigner = await ethers.getSigner(opWETHgrowAdminAddress);
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [opWETHgrowAdminAddress],
      });
      // // ====================================================
      this.opUSDCgrowV2 = <VaultV2>(
        await deployContract(this.signers.deployer, this.vaultV2Artifact, [
          REGISTRY_PROXY_ADDRESS,
          "USD Coin",
          "USDC",
          "Growth",
          "grow",
        ])
      );
      await this.opUSDCgrowProxy.connect(opUSDCgrowAdminSigner).upgradeTo(this.opUSDCgrowV2.address);
      this.opUSDCgrowV2 = <VaultV2>(
        await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_V2, this.opUSDCgrowProxy.address)
      );
      // ====================================================
      this.opWETHgrowV2 = <VaultV2>(
        await waffle.deployContract(this.signers.deployer, this.vaultV2Artifact, [
          REGISTRY_PROXY_ADDRESS,
          "Wrapped Ether",
          "WETH",
          "Growth",
          "grow",
        ])
      );
      await this.opWETHgrowProxy.connect(opWETHgrowAdminSigner).upgradeTo(this.opWETHgrowV2.address);
      this.opWETHgrowV2 = <VaultV2>(
        await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_V2, this.opWETHgrowProxy.address)
      );
    });

    it("default values from for v1 opUSDCgrow should be as expected", async function () {
      expect(await this.opUSDCgrowV2.opTOKEN_REVISION()).to.eq("0x3");
      expect(await this.opUSDCgrowV2.registryContract()).to.eq(getAddress(this.registryV2.address));
      expect(await this.opUSDCgrowV2.riskProfileCode()).to.eq("1");
      expect(await this.opUSDCgrowV2.underlyingToken()).to.eq(TypedTokens["USDC"]);
      expect(await this.opUSDCgrowV2.underlyingTokensHash()).to.eq(ethers.constants.HashZero);
      expect(await this.opUSDCgrowV2.name()).to.eq("op USD Coin Growth");
      expect(await this.opUSDCgrowV2.symbol()).to.eq("opUSDCgrow");
      expect(await this.opUSDCgrowV2.decimals()).to.eq(6);
      expect(await this.opUSDCgrowV2.maxVaultValueJump()).to.eq("100");
    });

    it("default values for v1 opWETHgrow should be as expected", async function () {
      expect(await this.opWETHgrowV2.opTOKEN_REVISION()).to.eq("0x3");
      expect(await this.opWETHgrowV2.registryContract()).to.eq(getAddress(this.registryV2.address));
      expect(await this.opWETHgrowV2.riskProfileCode()).to.eq("1");
      expect(await this.opWETHgrowV2.underlyingToken()).to.eq(TypedTokens["WETH"]);
      expect(await this.opWETHgrowV2.underlyingTokensHash()).to.eq(ethers.constants.HashZero);
      expect(await this.opWETHgrowV2.name()).to.eq("op Wrapped Ether Growth");
      expect(await this.opWETHgrowV2.symbol()).to.eq("opWETHgrow");
      expect(await this.opWETHgrowV2.decimals()).to.eq(18);
      expect(await this.opWETHgrowV2.maxVaultValueJump()).to.eq("100");
    });

    it("vaultConfigurationV2() for opUSDCgrow V2", async function () {
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

    it("vaultConfigurationV2() for opWETHgrow V2", async function () {
      const vaultConfigurationV2 = await this.opWETHgrowV2.vaultConfiguration();
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
  });
  describe("VaultV2 unit testing", () => {
    before(async function () {
      this.vaultV2 = <VaultV2>(
        await waffle.deployContract(this.signers.deployer, this.vaultV2Artifact, [
          REGISTRY_PROXY_ADDRESS,
          "USD Coin",
          "USDC",
          "Growth",
          "grow",
        ])
      );
      const vaultProxyV2Artifact: Artifact = await artifacts.readArtifact(ESSENTIAL_CONTRACTS.VAULT_PROXY_V2);
      this.vaultProxyV2 = <AdminUpgradeabilityProxy>(
        await waffle.deployContract(this.signers.deployer, vaultProxyV2Artifact, [
          this.vaultV2.address,
          this.signers.admin.address,
          "0x",
        ])
      );
      this.vaultV2 = <VaultV2>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_V2, this.vaultV2.address);
      const usdcTokenHash = getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["USDC"], chainId]);
      await this.registryV2
        .connect(this.signers.operator)
        ["setTokensHashToTokens(bytes32,address[])"](usdcTokenHash, [TypedTokens["USDC"]]);
      await this.vaultV2.initialize(
        this.registryV2.address,
        TypedTokens["USDC"],
        usdcTokenHash,
        "USDC Coin",
        "USDC",
        "1",
      );
    });
    it("fail setValueControlParams() by non Finance operator", async function () {
      await expect(
        this.vaultV2.setValueControlParams(true, "10000000000", "1000000000", "1000000000000", "100"),
      ).to.be.revertedWith("caller is not the financeOperator");
    });

    it("setValueControlParams() by Finance operator", async function () {
      await this.vaultV2.connect(this.signers.financeOperator).setValueControlParams(
        true,
        "10000000000", // 10,000 USDC
        "1000000000", // 1000 USDC
        "1000000000000", // 1,000,000 USDC
        "100", // 1%
      );
      const vaultConfigurationV2 = await this.vaultV2.vaultConfiguration();
      expect(vaultConfigurationV2.allowWhitelistedState).to.be.true;
      expect(vaultConfigurationV2.userDepositCapUT).to.eq("10000000000");
      expect(vaultConfigurationV2.minimumDepositValueUT).to.eq("1000000000");
      expect(vaultConfigurationV2.totalValueLockedLimitUT).to.eq("1000000000000");
      expect(await this.vaultV2.maxVaultValueJump()).to.eq("100");
    });

    it("fail setFeeParams() by non Finance operator", async function () {
      await expect(
        this.vaultV2.setFeeParams(
          "1000000", // 1 USDC
          "5", // 0.05
          "1000000", // 1 USDC
          "5", // 0.05%
          this.signers.admin.address, // address for vault collector
        ),
      ).to.be.revertedWith("caller is not the financeOperator");
    });

    it("setFeeParams() by Finance operator", async function () {
      await this.vaultV2.connect(this.signers.financeOperator).setFeeParams(
        "1000000", // 1 USDC
        "5", // 0.05%
        "1000000", // 1 USDC
        "5", // 0.05%
        this.signers.admin.address, // address for vault collector
      );
      const vaultConfigurationV2 = await this.vaultV2.vaultConfiguration();
      expect(vaultConfigurationV2.depositFeeFlatUT).to.eq("1000000");
      expect(vaultConfigurationV2.depositFeePct).to.eq("5");
      expect(vaultConfigurationV2.withdrawalFeeFlatUT).to.eq("1000000");
      expect(vaultConfigurationV2.withdrawalFeePct).to.eq("5");
      expect(vaultConfigurationV2.vaultFeeCollector).to.eq(this.signers.admin.address);
    });
    it("fails setMaxVaultValueJump() call by non finance operator", async function () {
      await expect(this.vaultV2.setMaxVaultValueJump("100")).to.be.revertedWith("caller is not the financeOperator");
    });
    it("setMaxVaultValueJump() call by finance operator", async function () {
      await this.vaultV2.connect(this.signers.financeOperator).setMaxVaultValueJump("100");
      expect(await this.vaultV2.maxVaultValueJump()).to.eq("100");
    });
    it("fails setAllowWhitelistedState() call by non finance operator", async function () {
      await expect(this.vaultV2.setAllowWhitelistedState(false)).to.be.revertedWith("caller is not the operator");
    });
    it("setAllowWhitelistedState() call by finance operator", async function () {
      await this.vaultV2.connect(this.signers.operator).setAllowWhitelistedState(false);
      expect((await this.vaultV2.vaultConfiguration())[2]).to.be.false;
    });

    it("fails setUserDepositCapUT() call by non finance operator", async function () {
      await expect(this.vaultV2.setUserDepositCapUT("10")).to.be.revertedWith("caller is not the operator");
    });
    it("setUserDepositCapUT() call by finance operator", async function () {
      await this.vaultV2.connect(this.signers.operator).setUserDepositCapUT("10");
      expect((await this.vaultV2.vaultConfiguration())[8]).to.eq("10");
    });

    it("fails setMinimumDepositValueUT() call by non finance operator", async function () {
      await expect(this.vaultV2.setMinimumDepositValueUT("1000")).to.be.revertedWith("caller is not the operator");
    });
    it("setMinimumDepositValueUT() call by finance operator", async function () {
      await this.vaultV2.connect(this.signers.operator).setMinimumDepositValueUT("1000");
      expect((await this.vaultV2.vaultConfiguration())[9]).to.eq("1000");
    });

    it("fails setTotalValueLockedLimitUT() call by non finance operator", async function () {
      await expect(this.vaultV2.setTotalValueLockedLimitUT("100000000")).to.be.revertedWith(
        "caller is not the operator",
      );
    });
    it("setTotalValueLockedLimitUT() call by finance operator", async function () {
      await this.vaultV2.connect(this.signers.operator).setTotalValueLockedLimitUT("100000000");
      expect((await this.vaultV2.vaultConfiguration())[10]).to.eq("100000000");
    });

    it("fails setWhitelistedAccounts() call by non governance", async function () {
      // await expect(this.vaultV2.setTotalValueLockedLimitUT("100000000")).to.be.revertedWith(
      //   "caller is not the operator",
      // );
    });
    it("setWhitelistedAccounts() call by governance", async function () {
      // await this.vaultV2.connect(this.signers.operator).setTotalValueLockedLimitUT("100000000");
      // expect((await this.vaultV2.vaultConfiguration())[10]).to.eq("100000000");
    });
    it("fails setWhitelistedCodes() call by non governance", async function () {
      // await expect(this.vaultV2.setTotalValueLockedLimitUT("100000000")).to.be.revertedWith(
      //   "caller is not the operator",
      // );
    });
    it("setWhitelistedCodes() call by governance", async function () {
      // await this.vaultV2.connect(this.signers.operator).setTotalValueLockedLimitUT("100000000");
      // expect((await this.vaultV2.vaultConfiguration())[10]).to.eq("100000000");
    });
    it("fail discontinue() call by non operator", async function () {});
    it("discontinue() call by operator", async function () {});
    it("fail setUnpaused() call by non operator", async function () {});
    it("setUnpaused() call by operator (null strategy)", async function () {});
    it("fail rebalance() call, vault is paused", async function () {});
    it("fail userDepositVault() call, vault is paused", async function () {});
    it("fail userWithdrawVault() call, vault is paused", async function () {});
    it("fail vaultDepositAllToStrategy() call, vault is paused", async function () {});
    it("fail adminCall() call by non operator", async function () {});
    it("fail setRiskProfileCode() call by non operator", async function () {});
    it("setRiskProfileCode() call by operator", async function () {});

    it("fail setUnderlyingTokenAndTokensHash() call by non operator", async function () {});
    it("setUnderlyingTokenAndTokensHash() call by operator", async function () {});
    it("balanceUT() return 0", async function () {});
    it("isMaxVaultValueJumpAllowed() return true", async function () {});
    it("isMaxVaultValueJumpAllowed() return false", async function () {});
    it("getPricePerFullShare() return 0", async function () {});

    it("userDepositPermitted() return false,EOA_NOT_WHITELISTED", async function () {});
    it("userDepositPermitted() return false,CA_NOT_WHITELISTED", async function () {});
    it("userDepositPermitted() return false,MINIMUM_USER_DEPOSIT_VALUE_UT", async function () {});
    it("userDepositPermitted() return false,TOTAL_VALUE_LOCKED_LIMIT_UT", async function () {});
    it("userDepositPermitted() return false,USER_DEPOSIT_CAP_UT", async function () {});
    it('userDepositPermitted() return true,""', async function () {});
    it("vaultDepositPermitted() return false,VAULT_PAUSED", async function () {});
    it("vaultDepositPermitted() return false,VAULT_DISCONTINUED", async function () {});
    it('vaultDepositPermitted() return true,""', async function () {});
    it("userWithdrawPermitted() return false,VAULT_PAUSED", async function () {});
    it("userWithdrawPermitted() return false,USER_WITHDRAW_INSUFFICIENT_VT", async function () {});
    it('userWithdrawPermitted() return true,""', async function () {});
    it("vaultWithdrawPermitted() return false,VAULT_PAUSED", async function () {});
    it('vaultWithdrawPermitted() return true,""', async function () {});
    it("calcDepositFeeUT()", async function () {});
    it("calcWithdrawalFeeUT()", async function () {});
    it("getNextBestInvestStrategy()", async function () {});
    it("getLastStrategyStepBalanceLP()", async function () {});
    it("computeInvestStrategyHash()", async function () {});
  });
  describe("VaultV2 strategies", () => {
    before(async function () {
      console.log("rmv2 ", this.riskManagerV2.address);
    });
    for (let i = 0; i < 10; i++) {
      it(`strategy${i}`, async function () {
        console.log("fn1");
      });
    }
  });
});
