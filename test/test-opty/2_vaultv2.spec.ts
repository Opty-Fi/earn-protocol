import { artifacts, waffle, ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import { deployContract, solidity } from "ethereum-waffle";
import { Artifact } from "hardhat/types";
import { getAddress } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import { getSoliditySHA3Hash, Signers, to_10powNumber_BN } from "../../helpers/utils";
import {
  AdminUpgradeabilityProxy,
  ERC20,
  InitializableImmutableAdminUpgradeabilityProxy,
  Registry,
  RegistryProxy,
  RegistryV2,
  RiskManagerProxy,
  RiskManagerV2,
  StrategyProviderV2,
  Vault,
  VaultV2,
} from "../../typechain";
import {
  opUSDCgrow,
  opWETHgrow,
  RegistryProxy as RegistryProxyAddress,
  RiskManagerProxy as RiskManagerProxyAddress,
} from "../../_deployments/mainnet.json";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { setTokenBalanceInStorage } from "./utils";
import { TypedDefiPools } from "../../helpers/data/defiPools";
import { generateStrategyHashV2 } from "../../helpers/helpers";
import { VAULT_TOKENS } from "../../helpers/constants/tokens";

chai.use(solidity);

const OPUSDCGROW_VAULT_PROXY_ADDRESS = opUSDCgrow.VaultProxy;
const OPWETHGROW_VAULT_PROXY_ADDRESS = opWETHgrow.VaultProxy;
const OPUSDCGROW_VAULT_ADDRESS = opUSDCgrow.Vault;
const OPWETHGROW_VAULT_ADDRESS = opWETHgrow.Vault;
const REGISTRY_PROXY_ADDRESS = RegistryProxyAddress;
const RISK_MANAGER_PROXY = RiskManagerProxyAddress;

const USDC_COMPOUND_ETHEREUM = [
  {
    pool: TypedDefiPools.CompoundAdapter.usdc.pool,
    outputToken: TypedDefiPools.CompoundAdapter.usdc.lpToken,
    isBorrow: false,
  },
];

const USDC_AAVEV1_ETHEREUM = [
  {
    pool: TypedDefiPools.AaveV1Adapter.usdc.pool,
    outputToken: TypedDefiPools.AaveV1Adapter.usdc.lpToken,
    isBorrow: false,
  },
];

const USDC_AAVEV2_ETHEREUM = [
  {
    pool: TypedDefiPools.AaveV2Adapter.usdc.pool,
    outputToken: TypedDefiPools.AaveV2Adapter.usdc.lpToken,
    isBorrow: false,
  },
];

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
    this.signers.alice = signers[3];
    this.signers.bob = signers[4];
    this.signers.eve = signers[10];
    this.registryProxy = <RegistryProxy>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_PROXY, REGISTRY_PROXY_ADDRESS)
    );
    this.registry = <Registry>await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, REGISTRY_PROXY_ADDRESS);
    const operatorAddress = await this.registry.getOperator();
    const financeOperatorAddress = await this.registry.getFinanceOperator();
    const governanceAddress = await this.registry.getGovernance();
    const strategyOperatorAddress = await this.registry.getStrategyOperator();
    [operatorAddress, financeOperatorAddress, governanceAddress, strategyOperatorAddress].forEach(async addr => {
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [addr],
      });
    });
    this.signers.operator = await ethers.getSigner(operatorAddress);
    this.signers.financeOperator = await ethers.getSigner(financeOperatorAddress);
    this.signers.governance = await ethers.getSigner(governanceAddress);
    this.signers.strategyOperator = await ethers.getSigner(strategyOperatorAddress);
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
    this.opUSDCgrow = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, OPUSDCGROW_VAULT_ADDRESS);
    this.opWETHgrow = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, OPWETHGROW_VAULT_ADDRESS);
    this.usdc = <ERC20>await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, VAULT_TOKENS.USDC.address);
    await setTokenBalanceInStorage(this.usdc, this.signers.admin.address, "20000");
  });
  describe("opUSDCgrowV2 and opWETHgrowV2 after on-chain upgrade", () => {
    // TODO : recall all investments, pause the vault then upgrade
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
      expect(await this.opUSDCgrowV2.underlyingToken()).to.eq(VAULT_TOKENS.USDC.address);
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
      expect(await this.opWETHgrowV2.underlyingToken()).to.eq(VAULT_TOKENS.WETH.address);
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
      this.vaultV2 = <VaultV2>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_V2, this.vaultProxyV2.address);
      await this.registryV2
        .connect(this.signers.operator)
        ["setTokensHashToTokens(bytes32,address[])"](VAULT_TOKENS.USDC.hash[chainId], [VAULT_TOKENS.USDC.address]);
      await this.vaultV2.initialize(
        this.registryV2.address,
        VAULT_TOKENS.USDC.address,
        VAULT_TOKENS.USDC.hash[chainId],
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
      await expect(this.vaultV2.setUserDepositCapUT("2000")).to.be.revertedWith("caller is not the operator");
    });
    it("setUserDepositCapUT() call by finance operator", async function () {
      await this.vaultV2.connect(this.signers.operator).setUserDepositCapUT("2000000000");
      expect((await this.vaultV2.vaultConfiguration())[8]).to.eq("2000000000");
    });

    it("fails setMinimumDepositValueUT() call by non finance operator", async function () {
      await expect(this.vaultV2.setMinimumDepositValueUT("1000")).to.be.revertedWith("caller is not the operator");
    });
    it("setMinimumDepositValueUT() call by finance operator", async function () {
      await this.vaultV2
        .connect(this.signers.operator)
        .setMinimumDepositValueUT(BigNumber.from("1000").mul(to_10powNumber_BN("6")));
      expect((await this.vaultV2.vaultConfiguration())[9]).to.eq(BigNumber.from("1000").mul(to_10powNumber_BN("6")));
    });

    it("fails setTotalValueLockedLimitUT() call by non finance operator", async function () {
      await expect(this.vaultV2.setTotalValueLockedLimitUT("100000000")).to.be.revertedWith(
        "caller is not the operator",
      );
    });
    it("setTotalValueLockedLimitUT() call by finance operator", async function () {
      await this.vaultV2
        .connect(this.signers.operator)
        .setTotalValueLockedLimitUT(BigNumber.from("10000").mul(to_10powNumber_BN("6")));
      expect((await this.vaultV2.vaultConfiguration())[10]).to.eq(BigNumber.from("10000").mul(to_10powNumber_BN("6")));
    });

    it("fails setWhitelistedAccounts() call by non governance", async function () {
      await expect(this.vaultV2.setWhitelistedAccounts([this.signers.alice.address], [true])).to.be.revertedWith(
        "caller is not having governance",
      );
    });
    it("setWhitelistedAccounts() call by governance", async function () {
      await this.vaultV2.connect(this.signers.governance).setWhitelistedAccounts([this.signers.alice.address], [true]);
      expect(await this.vaultV2.whitelistedAccounts(this.signers.alice.address)).to.be.true;
    });
    it("fails setWhitelistedCodes() call by non governance", async function () {
      await expect(this.vaultV2.setWhitelistedCodes([this.opUSDCgrow.address], [true])).to.be.revertedWith(
        "caller is not having governance",
      );
    });
    it("setWhitelistedCodes() call by governance", async function () {
      const code = await ethers.provider.getCode(this.opUSDCgrow.address);
      const codeHash = ethers.utils.keccak256(code);
      await this.vaultV2.connect(this.signers.governance).setWhitelistedCodes([this.opUSDCgrow.address], [true]);
      expect(await this.vaultV2.whitelistedCodes(codeHash)).to.be.true;
    });
    it("fail discontinue() call by non operator", async function () {
      await expect(this.vaultV2.discontinue()).to.be.revertedWith("caller is not having governance");
    });
    it("fail setUnpaused() call by non operator", async function () {
      await expect(this.vaultV2.setUnpaused(false)).to.be.revertedWith("caller is not having governance");
    });
    it("setUnpaused() call by operator (null strategy)", async function () {
      await this.vaultV2.connect(this.signers.governance).setUnpaused(true);
      expect((await this.vaultV2.vaultConfiguration()).unpaused).to.be.true;
    });
    it("fail rebalance() call, vault is paused", async function () {
      await this.vaultV2.connect(this.signers.governance).setUnpaused(false);
      await expect(this.vaultV2.rebalance()).to.be.revertedWith("14");
    });
    it("fail userDepositVault() call, vault is paused", async function () {
      const usdcDepositAmount = BigNumber.from("1000").mul(to_10powNumber_BN("6"));
      await this.usdc.connect(this.signers.admin).transfer(this.signers.alice.address, usdcDepositAmount);
      await this.usdc.connect(this.signers.alice).approve(this.vaultV2.address, usdcDepositAmount);
      await expect(this.vaultV2.connect(this.signers.alice).userDepositVault(usdcDepositAmount)).to.be.revertedWith(
        "14",
      );
    });
    it("fail userWithdrawVault() call, vault is paused", async function () {
      await expect(this.vaultV2.connect(this.signers.alice).userDepositVault("12")).to.be.revertedWith("14");
    });
    it("fail vaultDepositAllToStrategy() call, vault is paused", async function () {
      await expect(this.vaultV2.vaultDepositAllToStrategy()).to.be.revertedWith("14");
    });
    it("fail adminCall() call by non operator", async function () {
      const _codes = [];
      const iface = new ethers.utils.Interface(["function approve(address,uint256)"]);
      _codes.push(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "bytes"],
          [this.usdc.address, iface.encodeFunctionData("approve", [this.signers.alice.address, "200"])],
        ),
      );
      await expect(this.vaultV2.adminCall(_codes)).to.be.revertedWith("caller is not the operator");
    });
    it("fail setRiskProfileCode() call by non operator", async function () {
      await expect(this.vaultV2.setRiskProfileCode(1)).to.be.revertedWith("caller is not the operator");
    });
    it("setRiskProfileCode() call by operator", async function () {
      await this.vaultV2.connect(this.signers.operator).setRiskProfileCode(1);
      expect(await this.vaultV2.riskProfileCode()).to.be.eq("1");
    });
    it("fail setRiskProfileCode(), non-existant code", async function () {
      await expect(this.vaultV2.connect(this.signers.operator).setRiskProfileCode(3)).to.be.revertedWith("5");
    });

    it("fail setUnderlyingTokenAndTokensHash() call by non operator", async function () {
      await expect(
        this.vaultV2.setUnderlyingTokenAndTokensHash(VAULT_TOKENS.USDC.address, ethers.constants.HashZero),
      ).to.be.revertedWith("caller is not the operator");
    });
    it("fail setUnderlyingTokenAndTokensHash(), registry not approved", async function () {
      await expect(
        this.vaultV2
          .connect(this.signers.operator)
          .setUnderlyingTokenAndTokensHash(
            VAULT_TOKENS.USDC.address,
            getSoliditySHA3Hash(["address", "uint256"], [VAULT_TOKENS.USDC.address, chainId.concat("a")]),
          ),
      ).to.be.revertedWith("17");
    });
    it("setUnderlyingTokenAndTokensHash() call by operator", async function () {
      await this.vaultV2
        .connect(this.signers.operator)
        .setUnderlyingTokenAndTokensHash(VAULT_TOKENS.USDC.address, VAULT_TOKENS.USDC.hash[chainId]);
      expect(await this.vaultV2.underlyingToken()).to.eq(VAULT_TOKENS.USDC.address);
      expect(await this.vaultV2.underlyingTokensHash()).to.eq(VAULT_TOKENS.USDC.hash[chainId]);
    });
    it("balanceUT() return 0", async function () {
      expect(await this.vaultV2.balanceUT()).to.eq("0");
    });
    it("isMaxVaultValueJumpAllowed() return true", async function () {
      expect(await this.vaultV2.isMaxVaultValueJumpAllowed("1", "10000")).to.be.true;
    });
    it("isMaxVaultValueJumpAllowed() return false", async function () {
      expect(await this.vaultV2.isMaxVaultValueJumpAllowed("10000", "1")).to.be.false;
    });
    it("getPricePerFullShare() return 0", async function () {
      expect(await this.vaultV2.getPricePerFullShare()).to.eq("0");
    });

    it("userDepositPermitted() return false,EOA_NOT_WHITELISTED", async function () {
      await this.vaultV2.connect(this.signers.financeOperator).setAllowWhitelistedState(true);
      expect(await this.vaultV2.userDepositPermitted(this.signers.bob.address, "1", true)).to.have.members([
        false,
        "8",
      ]);
    });
    it("userDepositPermitted() return false,CA_NOT_WHITELISTED", async function () {});
    it("userDepositPermitted() return false,MINIMUM_USER_DEPOSIT_VALUE_UT", async function () {
      expect(await this.vaultV2.userDepositPermitted(this.signers.alice.address, "100", true)).to.have.members([
        false,
        "10",
      ]);
    });
    it("userDepositPermitted() return false,TOTAL_VALUE_LOCKED_LIMIT_UT", async function () {
      expect(await this.vaultV2.userDepositPermitted(this.signers.alice.address, "100000000000", true)).to.have.members(
        [false, "11"],
      );
    });
    it("userDepositPermitted() return false,USER_DEPOSIT_CAP_UT", async function () {
      expect(await this.vaultV2.userDepositPermitted(this.signers.alice.address, "3000000000", true)).to.have.members([
        false,
        "12",
      ]);
    });
    it('userDepositPermitted() return true,""', async function () {
      expect(await this.vaultV2.userDepositPermitted(this.signers.alice.address, "1500000000", true)).to.have.members([
        true,
        "",
      ]);
    });
    it("vaultDepositPermitted() return false,VAULT_PAUSED", async function () {
      expect(await this.vaultV2.vaultDepositPermitted()).to.have.members([false, "14"]);
    });
    it('vaultDepositPermitted() return true,""', async function () {
      await this.vaultV2.connect(this.signers.governance).setUnpaused(true);
      expect(await this.vaultV2.vaultDepositPermitted()).to.have.members([true, ""]);
    });
    it("userWithdrawPermitted() return false,VAULT_PAUSED", async function () {
      await this.vaultV2.connect(this.signers.governance).setUnpaused(false);
      expect(await this.vaultV2.userWithdrawPermitted(this.signers.alice.address, 1)).to.have.members([false, "14"]);
    });
    it("userWithdrawPermitted() return false,USER_WITHDRAW_INSUFFICIENT_VT", async function () {
      await this.vaultV2.connect(this.signers.governance).setUnpaused(true);
      expect(await this.vaultV2.userWithdrawPermitted(this.signers.alice.address, 1)).to.have.members([false, "1"]);
    });
    it("vaultWithdrawPermitted() return false,VAULT_PAUSED", async function () {
      await this.vaultV2.connect(this.signers.governance).setUnpaused(false);
      expect(await this.vaultV2.vaultWithdrawPermitted()).to.have.members([false, "14"]);
    });
    it('vaultWithdrawPermitted() return true,""', async function () {
      await this.vaultV2.connect(this.signers.governance).setUnpaused(true);
      expect(await this.vaultV2.vaultWithdrawPermitted()).to.have.members([true, ""]);
    });
    it("calcDepositFeeUT()", async function () {
      const vaultConfiguration = await this.vaultV2.vaultConfiguration();
      const { depositFeePct, depositFeeFlatUT } = vaultConfiguration;
      const amount = BigNumber.from("10000000");
      const expectedFee = amount.mul(depositFeePct).div(10000).add(depositFeeFlatUT);
      expect(await this.vaultV2.calcDepositFeeUT(amount)).to.eq(expectedFee);
    });
    it("calcWithdrawalFeeUT()", async function () {
      const vaultConfiguration = await this.vaultV2.vaultConfiguration();
      const { withdrawalFeePct, withdrawalFeeFlatUT } = vaultConfiguration;
      const amount = BigNumber.from("10000000");
      const expectedFee = amount.mul(withdrawalFeePct).div(10000).add(withdrawalFeeFlatUT);
      expect(await this.vaultV2.calcWithdrawalFeeUT(amount)).to.eq(expectedFee);
    });
    it("computeInvestStrategyHash()", async function () {
      const USDC_TOKEN_HASH = await this.vaultV2.underlyingTokensHash();

      const USDC_COMPOUND_HASH = generateStrategyHashV2(
        [
          {
            contract: TypedDefiPools.CompoundAdapter.usdc.pool,
            outputToken: TypedDefiPools.CompoundAdapter.usdc.lpToken,
            isBorrow: false,
          },
        ],
        USDC_TOKEN_HASH,
      );
      expect(await this.vaultV2.computeInvestStrategyHash(USDC_COMPOUND_ETHEREUM)).to.eq(USDC_COMPOUND_HASH);
    });
    // ========
    it("getNextBestInvestStrategy()", async function () {
      expect((await this.vaultV2.getInvestStrategySteps()).length).to.eq(0);
      await this.strategyProviderV2
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", VAULT_TOKENS.USDC.hash[chainId], USDC_COMPOUND_ETHEREUM);
      expect(await this.riskManagerV2.getBestStrategy("1", VAULT_TOKENS.USDC.hash[chainId])).to.deep.eq([
        [USDC_COMPOUND_ETHEREUM[0].pool, USDC_COMPOUND_ETHEREUM[0].outputToken, USDC_COMPOUND_ETHEREUM[0].isBorrow],
      ]);
    });
    it("getLastStrategyStepBalanceLP() return 0", async function () {
      expect(await this.vaultV2.getLastStrategyStepBalanceLP(USDC_COMPOUND_ETHEREUM)).to.eq("0");
    });
    it("first userDepositVault(), mint same shares as deposit", async function () {
      const _depositAmountUSDC = BigNumber.from("1000").mul(to_10powNumber_BN("6"));
      await this.vaultV2.connect(this.signers.financeOperator).setMinimumDepositValueUT(_depositAmountUSDC);
      await this.vaultV2
        .connect(this.signers.financeOperator)
        .setFeeParams("0", "0", "0", "0", ethers.constants.AddressZero);
      await expect(this.vaultV2.connect(this.signers.alice).userDepositVault(_depositAmountUSDC))
        .to.emit(this.vaultV2, "Transfer")
        .withArgs(ethers.constants.AddressZero, this.signers.alice.address, _depositAmountUSDC);
    });
    it("rebalance(), deposit asset into strategy", async function () {});
    it('userWithdrawPermitted() return true,""', async function () {});
    it("userWithdrawVault()", async function () {});
    // ========
    it("discontinue() call by operator", async function () {});
    it("vaultDepositPermitted() return false,VAULT_DISCONTINUED", async function () {});
  });
  describe("VaultV2 strategies", () => {
    before(async function () {
      console.log("rmv2 ", this.riskManagerV2.address);
    });
    for (let i = 0; i < 1; i++) {
      it(`strategy${i}`, async function () {
        console.log("fn1");
      });
    }
  });
});
