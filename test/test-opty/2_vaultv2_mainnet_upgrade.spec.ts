import { ethers, network, deployments } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import BN from "bignumber.js";
import { getAddress } from "ethers/lib/utils";
import { Signers, to_10powNumber_BN } from "../../helpers/utils";
import {
  ERC20,
  InitializableImmutableAdminUpgradeabilityProxy,
  Registry,
  RegistryProxy,
  StrategyProvider,
  Vault,
} from "../../typechain";
import { opUSDCgrow, opWETHgrow, RegistryProxy as RegistryProxyAddress } from "../../_deployments/mainnet.json";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import {
  assertVaultConfiguration,
  getAccountsMerkleProof,
  getAccountsMerkleRoot,
  getLastStrategyStepBalanceLP,
  setTokenBalanceInStorage,
} from "./utils";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../helpers/constants/tokens";
import { eEVMNetwork } from "../../helper-hardhat-config";
import { StrategiesByTokenByChain } from "../../helpers/data/adapter-with-strategies";
import { StrategyStepType } from "../../helpers/type";
import { generateStrategyHashV2 } from "../../helpers/helpers";
import { oldAbis } from "../../helpers/data/oldAbis";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;
const OPUSDCGROW_VAULT_PROXY_ADDRESS = opUSDCgrow.VaultProxy;
const OPWETHGROW_VAULT_PROXY_ADDRESS = opWETHgrow.VaultProxy;
const REGISTRY_PROXY_ADDRESS = RegistryProxyAddress;

// ================================================================
const mim =
  StrategiesByTokenByChain["mainnet"].USDC[
    "usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-CurveSwapPool-MIM-3LP3CRV-f-DEPOSIT-Convex-cvxMIM-3LP3CRV-f"
  ].strategy;

const mimStrategySteps = mim.map(strategy => ({
  pool: strategy.contract,
  outputToken: strategy.outputToken,
  isBorrow: false,
}));

const mimStrategyStepsContract = mim.map(strategy => ({
  contract: strategy.contract,
  outputToken: strategy.outputToken,
  isBorrow: false,
}));
// =================================================================

const cvxsteCRV =
  StrategiesByTokenByChain["mainnet"].WETH[
    "weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV"
  ].strategy;
const convexSteCRVStrategySteps = cvxsteCRV.map(strategy => ({
  pool: strategy.contract,
  outputToken: strategy.outputToken,
  isBorrow: false,
}));
const convexSteCRVStrategyStepsContract = cvxsteCRV.map(strategy => ({
  contract: strategy.contract,
  outputToken: strategy.outputToken,
  isBorrow: false,
}));

// =================================================================

const cvxFRAX3CRV =
  StrategiesByTokenByChain["mainnet"].USDC[
    "usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-CurveMetapoolSwapPool-FRAX3CRV-f-DEPOSIT-Convex-cvxFRAX3CRV-f"
  ].strategy;
const cvxFRAX3CRVStrategySteps = cvxFRAX3CRV.map(strategy => ({
  pool: strategy.contract,
  outputToken: strategy.outputToken,
  isBorrow: false,
}));
const cvxFRAX3CRVStrategyStepsContract = cvxFRAX3CRV.map(strategy => ({
  contract: strategy.contract,
  outputToken: strategy.outputToken,
  isBorrow: false,
}));
describe("Vault Ethereum on-chain upgrade", () => {
  before(async function () {
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
    const riskOperatorAddress = await this.registry.getRiskOperator();
    [operatorAddress, financeOperatorAddress, governanceAddress, strategyOperatorAddress, riskOperatorAddress].forEach(
      async addr => {
        await network.provider.request({
          method: "hardhat_impersonateAccount",
          params: [addr],
        });
      },
    );
    this.signers.operator = await ethers.getSigner(operatorAddress);
    this.signers.financeOperator = await ethers.getSigner(financeOperatorAddress);
    this.signers.governance = await ethers.getSigner(governanceAddress);
    this.signers.strategyOperator = await ethers.getSigner(strategyOperatorAddress);
    this.signers.riskOperator = await ethers.getSigner(riskOperatorAddress);
    await deployments.fixture("MainnetSetZeroStrategy");
    this.usdc = <ERC20>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address)
    );
    await setTokenBalanceInStorage(this.usdc, this.signers.admin.address, "20000");
    // ==============================================================
    await deployments.fixture("USDCRebalance");
    // testing already deployed contracts
    // this code block may fail if the block number is made greater than
    // the block at which vaults are upgraded to V2 or fork is other than Ethereum
    // ====================================================

    this.opUSDCgrowProxy = <InitializableImmutableAdminUpgradeabilityProxy>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, OPUSDCGROW_VAULT_PROXY_ADDRESS)
    );
    this.opUSDCgrowOld = await ethers.getContractAt(oldAbis.oldVault, OPUSDCGROW_VAULT_PROXY_ADDRESS);
    this.opUSDCgrowGasOwedToOperator = await this.opUSDCgrowOld.gasOwedToOperator();
    this.opUSDCgrowDepositQueue = await this.opUSDCgrowOld.depositQueue();
    this.opUSDCgrowPricePerShareWrite = await this.opUSDCgrowOld.pricePerShareWrite();

    const opUSDCgrowAdminAddress = await this.opUSDCgrowProxy.admin();
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [opUSDCgrowAdminAddress],
    });
    // ====================================================
    await deployments.fixture("WETHRebalance");
    this.opWETHgrowProxy = <InitializableImmutableAdminUpgradeabilityProxy>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, OPWETHGROW_VAULT_PROXY_ADDRESS)
    );
    this.opWETHgrowOld = await ethers.getContractAt(oldAbis.oldVault, OPWETHGROW_VAULT_PROXY_ADDRESS);
    this.opWETHgrowGasOwedToOperator = await this.opWETHgrowOld.gasOwedToOperator();
    this.opWETHgrowDepositQueue = await this.opWETHgrowOld.depositQueue();
    this.opWETHgrowPricePerShareWrite = await this.opWETHgrowOld.pricePerShareWrite();

    const opWETHgrowAdminAddress = await this.opWETHgrowProxy.admin();
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [opWETHgrowAdminAddress],
    });
    // // ====================================================
    await deployments.fixture("DeployopUSDCgrow");
    await deployments.fixture("UpgradeopUSDCgrow");
    this.opUSDCgrow = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, this.opUSDCgrowProxy.address);
    // ====================================================
    await deployments.fixture("DeployopWETHgrow");
    await deployments.fixture("UpgradeopWETHgrow");
    this.opWETHgrow = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, this.opWETHgrowProxy.address);
    // =======================================================
    await deployments.fixture("Registry");
    await deployments.fixture("RiskManager");
    await deployments.fixture("StrategyProvider");
    const strategyProviderAddress = await (await deployments.get("StrategyProvider")).address;
    this.strategyProvider = <StrategyProvider>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER, strategyProviderAddress)
    );
  });

  it("default values from for old opUSDCgrow should be as expected", async function () {
    expect(await this.opUSDCgrow.opTOKEN_REVISION()).to.eq("0x3");
    expect(await this.opUSDCgrow.registryContract()).to.eq(getAddress(this.registry.address));
    expect(await this.opUSDCgrow.whitelistedAccountsRoot()).to.eq(
      "0x0000000000000000000000000000000000000000000000000000000000000001",
    );
    expect(await this.opUSDCgrow.underlyingToken()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address);
    expect(await this.opUSDCgrow.underlyingTokensHash()).to.eq(ethers.constants.HashZero);
    expect(await this.opUSDCgrow.name()).to.eq("op USD Coin Growth");
    expect(await this.opUSDCgrow.symbol()).to.eq("opUSDCgrow");
    expect(await this.opUSDCgrow.decimals()).to.eq(6);
    expect(await this.opUSDCgrow.vaultConfiguration()).to.eq("100");
    expect(await this.opUSDCgrow.userDepositCapUT()).to.eq(this.opUSDCgrowGasOwedToOperator); //gasOwedToOperator
    expect(await this.opUSDCgrow.minimumDepositValueUT()).to.eq(this.opUSDCgrowDepositQueue); //depositQueue
    expect(await this.opUSDCgrow.totalValueLockedLimitUT()).to.eq(this.opUSDCgrowPricePerShareWrite); //pricePerShareWrite
  });

  it("default values for old opWETHgrow should be as expected", async function () {
    expect(await this.opWETHgrow.opTOKEN_REVISION()).to.eq("0x3");
    expect(await this.opWETHgrow.registryContract()).to.eq(getAddress(this.registry.address));
    expect(await this.opWETHgrow.whitelistedAccountsRoot()).to.eq(
      "0x0000000000000000000000000000000000000000000000000000000000000001",
    );
    expect(await this.opWETHgrow.underlyingToken()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].WETH.address);
    expect(await this.opWETHgrow.underlyingTokensHash()).to.eq(ethers.constants.HashZero);
    expect(await this.opWETHgrow.name()).to.eq("op Wrapped Ether Growth");
    expect(await this.opWETHgrow.symbol()).to.eq("opWETHgrow");
    expect(await this.opWETHgrow.decimals()).to.eq(18);
    expect(await this.opWETHgrow.vaultConfiguration()).to.eq("100");
    expect(await this.opWETHgrow.userDepositCapUT()).to.eq(this.opWETHgrowGasOwedToOperator); //gasOwedToOperator
    expect(await this.opWETHgrow.minimumDepositValueUT()).to.eq(this.opWETHgrowDepositQueue); //depositQueue
    expect(await this.opWETHgrow.totalValueLockedLimitUT()).to.eq(this.opWETHgrowPricePerShareWrite); //pricePerShareWrite
  });

  // (0-15) Deposit fee UT = 0 UT = 0000
  // (16-31) Deposit fee % = 0% = 0000
  // (32-47) Withdrawal fee UT = 0 UT = 0000
  // (48-63) Withdrawal fee % = 0% = 0000
  // (64-79) Max vault value jump % = 1% = 0064
  // (80-239) vault fee address = 0000000000000000000000000000000000000000
  // (240-247) risk profile code = 1 = 01
  // (248) emergency shutdown = false = 0
  // (249) unpause = false = 0
  // (250) allow whitelisted state = true = 1
  // (251) - 0
  // (252) - 0
  // (253) - 0
  // (254) - 0
  // (255) - 0
  // 0x0401000000000000000000000000000000000000000000640000000000000000
  // 1811018241397843937822879938261491478723170994297509433919320763695890432000
  it("setVaultConfiguration() for opUSDCgrow new", async function () {
    await this.opUSDCgrow
      .connect(this.signers.governance)
      .setVaultConfiguration("1811018241397843937822879938261491478723170994297509433919320763695890432000");
    const vaultConfigurationV2 = await this.opUSDCgrow.vaultConfiguration();
    assertVaultConfiguration(
      vaultConfigurationV2,
      "0",
      "0",
      "0",
      "0",
      "100",
      "0x0000000000000000000000000000000000000000",
      "1",
      false,
      false,
      true,
    );
  });

  it("setVaultConfiguration() for opWETHgrow new", async function () {
    await this.opWETHgrow
      .connect(this.signers.governance)
      .setVaultConfiguration("1811018241397843937822879938261491478723170994297509433919320763695890432000");
    const vaultConfigurationV2 = await this.opWETHgrow.vaultConfiguration();
    assertVaultConfiguration(
      vaultConfigurationV2,
      "0",
      "0",
      "0",
      "0",
      "100",
      "0x0000000000000000000000000000000000000000",
      "1",
      false,
      false,
      true,
    );
  });

  it("null strategy for USDC vault", async function () {
    expect(await this.opUSDCgrow.investStrategyHash()).to.eq(ethers.constants.HashZero);
    expect(await (await this.opUSDCgrow.getInvestStrategySteps()).length).to.eq(0);
  });

  it("null strategy for WETH vault", async function () {
    expect(await this.opWETHgrow.investStrategyHash()).to.eq(ethers.constants.HashZero);
    expect(await (await this.opWETHgrow.getInvestStrategySteps()).length).to.eq(0);
  });

  describe("test frax and steth strategy", async function () {
    before(async function () {
      this.usdc = <ERC20>(
        await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, MULTI_CHAIN_VAULT_TOKENS["mainnet"].USDC.address)
      );
      this.weth = <ERC20>(
        await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, MULTI_CHAIN_VAULT_TOKENS["mainnet"].WETH.address)
      );
      await this.opUSDCgrow
        .connect(this.signers.operator)
        .setUnderlyingTokenAndTokensHash(this.usdc.address, MULTI_CHAIN_VAULT_TOKENS["mainnet"].USDC.hash);
      await this.opWETHgrow
        .connect(this.signers.operator)
        .setUnderlyingTokenAndTokensHash(this.weth.address, MULTI_CHAIN_VAULT_TOKENS["mainnet"].WETH.hash);

      await this.registry.connect(this.signers.governance).setOperator(this.signers.admin.address);
      await this.registry.connect(this.signers.governance).setRiskOperator(this.signers.admin.address);
      this.signers.operator = await ethers.getSigner(this.signers.admin.address);
      this.signers.riskOperator = await ethers.getSigner(this.signers.admin.address);
      await deployments.fixture("ApproveAndMapLiquidityPoolToAdapter");

      await deployments.fixture("ConfigopUSDCgrow");
      await deployments.fixture("ConfigopWETHgrow");
      assertVaultConfiguration(
        await this.opUSDCgrow.vaultConfiguration(),
        "0",
        "0",
        "0",
        "0",
        "100",
        "0x0000000000000000000000000000000000000000",
        "1",
        false,
        true,
        true,
      );
      assertVaultConfiguration(
        await this.opWETHgrow.vaultConfiguration(),
        "0",
        "0",
        "0",
        "0",
        "100",
        "0x0000000000000000000000000000000000000000",
        "1",
        false,
        true,
        true,
      );
      const goodAddresses: string[] = [this.signers.alice.address, this.signers.bob.address];
      const _root = getAccountsMerkleRoot(goodAddresses);
      await this.opUSDCgrow.connect(this.signers.governance).setWhitelistedAccountsRoot(_root);
      await this.opWETHgrow.connect(this.signers.governance).setWhitelistedAccountsRoot(_root);
      this._aliceMerkleProof = getAccountsMerkleProof(goodAddresses, this.signers.alice.address);
      this._bobMerkleProof = getAccountsMerkleProof(goodAddresses, this.signers.bob.address);
    });

    it("lp token balance should be as expected after rebalance of opUSDCgrow to usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-CurveSwapPool-MIM-3LP3CRV-f-DEPOSIT-Convex-cvxMIM-3LP3CRV-f", async function () {
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS["mainnet"].USDC.hash, mimStrategySteps);
      await this.opUSDCgrow.rebalance();
      // assert invest strategy hash
      expect(await this.opUSDCgrow.getInvestStrategySteps()).to.deep.eq(mimStrategySteps.map(v => Object.values(v)));
      expect(await this.opUSDCgrow.investStrategyHash()).to.eq(
        generateStrategyHashV2(mimStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS["mainnet"].USDC.hash),
      );
      expect(await this.usdc.balanceOf(this.opUSDCgrow.address)).to.eq("0");
      const expectedLPTokenBalance = await getLastStrategyStepBalanceLP(
        mimStrategySteps as StrategyStepType[],
        this.registry,
        this.opUSDCgrow,
        this.usdc,
      );
      const actualLPTokenBalance = await this.opUSDCgrow.getLastStrategyStepBalanceLP(mimStrategySteps);
      expect(actualLPTokenBalance).to.eq(expectedLPTokenBalance);
    });

    it("lp token balance should be as expected after rebalance of opWETHgrow to weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV", async function () {
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS["mainnet"].WETH.hash, convexSteCRVStrategySteps);
      const _beforeRebalance = await this.weth.balanceOf(this.opWETHgrow.address);
      await this.opWETHgrow.rebalance();
      const _afterRebalance = await this.weth.balanceOf(this.opWETHgrow.address);
      expect(_beforeRebalance).gt(_afterRebalance);
      expect(await this.opWETHgrow.getInvestStrategySteps()).to.deep.eq(
        convexSteCRVStrategySteps.map(v => Object.values(v)),
      );
      expect(await this.opWETHgrow.investStrategyHash()).to.eq(
        generateStrategyHashV2(convexSteCRVStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS["mainnet"].WETH.hash),
      );
      expect(await this.weth.balanceOf(this.opWETHgrow.address)).to.eq("0");
      const expectedLPTokenBalance = await getLastStrategyStepBalanceLP(
        convexSteCRVStrategySteps as StrategyStepType[],
        this.registry,
        this.opWETHgrow,
        this.weth,
      );
      const actualLPTokenBalance = await this.opWETHgrow.getLastStrategyStepBalanceLP(convexSteCRVStrategySteps);
      expect(actualLPTokenBalance).to.eq(expectedLPTokenBalance);
      expect(expectedLPTokenBalance).to.gt("0");
    });

    it("underlying token balance of opUSDCgrow should be expected after pausing", async function () {
      const underlyingTokenBalanceBefore = await this.usdc.balanceOf(this.opUSDCgrow.address);
      await this.opUSDCgrow.connect(this.signers.governance).setUnpaused(false);
      assertVaultConfiguration(
        await this.opUSDCgrow.vaultConfiguration(),
        "0",
        "0",
        "0",
        "0",
        "100",
        "0x0000000000000000000000000000000000000000",
        "1",
        false,
        false,
        true,
      );
      expect((await this.opUSDCgrow.getInvestStrategySteps()).length).to.eq(0);
      expect(await this.opUSDCgrow.investStrategyHash()).to.eq(ethers.constants.HashZero);
      const underlyingTokenBalanceAfter = await this.usdc.balanceOf(this.opUSDCgrow.address);
      expect(underlyingTokenBalanceAfter).gt(underlyingTokenBalanceBefore);
      const lpTokenBalance = await this.opUSDCgrow.getLastStrategyStepBalanceLP(mimStrategySteps);
      expect(lpTokenBalance).to.eq("0");
      expect(await this.opUSDCgrow.investStrategyHash()).to.eq(ethers.constants.HashZero);
    });

    it("underlying token balance of opWETHgrow should be expected after pausing", async function () {
      const underlyingTokenBalanceBefore = await this.weth.balanceOf(this.opWETHgrow.address);
      await this.opWETHgrow.connect(this.signers.governance).setUnpaused(false);
      assertVaultConfiguration(
        await this.opWETHgrow.vaultConfiguration(),
        "0",
        "0",
        "0",
        "0",
        "100",
        "0x0000000000000000000000000000000000000000",
        "1",
        false,
        false,
        true,
      );
      expect((await this.opWETHgrow.getInvestStrategySteps()).length).to.eq(0);
      expect(await this.opWETHgrow.investStrategyHash()).to.eq(ethers.constants.HashZero);
      const underlyingTokenBalanceAfter = await this.weth.balanceOf(this.opWETHgrow.address);
      expect(underlyingTokenBalanceAfter).gt(underlyingTokenBalanceBefore);
      const lpTokenBalance = await this.opWETHgrow.getLastStrategyStepBalanceLP(mimStrategySteps);
      expect(lpTokenBalance).to.eq("0");
      expect(await this.opWETHgrow.investStrategyHash()).to.eq(ethers.constants.HashZero);
    });

    it("unpause opUSDCgrow and rebalance to cvxFRAX3CRV", async function () {
      const _beforeRebalance = await this.usdc.balanceOf(this.opUSDCgrow.address);
      await this.opUSDCgrow.connect(this.signers.governance).setUnpaused(true);
      assertVaultConfiguration(
        await this.opUSDCgrow.vaultConfiguration(),
        "0",
        "0",
        "0",
        "0",
        "100",
        "0x0000000000000000000000000000000000000000",
        "1",
        false,
        true,
        true,
      );
      const convexFrax =
        StrategiesByTokenByChain["mainnet"].USDC[
          "usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-CurveMetapoolSwapPool-FRAX3CRV-f-DEPOSIT-Convex-cvxFRAX3CRV-f"
        ].strategy;
      const convexFraxStrategySteps = convexFrax.map(strategy => ({
        pool: strategy.contract,
        outputToken: strategy.outputToken,
        isBorrow: false,
      }));
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS["mainnet"].USDC.hash, convexFraxStrategySteps);
      await this.opUSDCgrow.rebalance();
      expect(await this.opUSDCgrow.getInvestStrategySteps()).to.deep.eq(
        cvxFRAX3CRVStrategySteps.map(v => Object.values(v)),
      );
      expect(await this.opUSDCgrow.investStrategyHash()).to.eq(
        generateStrategyHashV2(cvxFRAX3CRVStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS["mainnet"].USDC.hash),
      );
      const _afterRebalance = await this.usdc.balanceOf(this.opUSDCgrow.address);
      expect(_beforeRebalance).gt(_afterRebalance);
      expect(await this.usdc.balanceOf(this.opUSDCgrow.address)).to.eq("0");
      const expectedLPTokenBalance = await getLastStrategyStepBalanceLP(
        cvxFRAX3CRVStrategySteps as StrategyStepType[],
        this.registry,
        this.opUSDCgrow,
        this.usdc,
      );
      const actualLPTokenBalance = await this.opUSDCgrow.getLastStrategyStepBalanceLP(cvxFRAX3CRVStrategySteps);
      expect(actualLPTokenBalance).to.eq(expectedLPTokenBalance);
      expect(expectedLPTokenBalance).to.gt("0");
    });

    it("opWETHgrow unpause and rebalance to weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV", async function () {
      await this.opWETHgrow.connect(this.signers.governance).setUnpaused(true);
      assertVaultConfiguration(
        await this.opWETHgrow.vaultConfiguration(),
        "0",
        "0",
        "0",
        "0",
        "100",
        "0x0000000000000000000000000000000000000000",
        "1",
        false,
        true,
        true,
      );
      const _beforeRebalance = await this.weth.balanceOf(this.opWETHgrow.address);
      await this.opWETHgrow.rebalance();
      const _afterRebalance = await this.weth.balanceOf(this.opWETHgrow.address);
      expect(_beforeRebalance).gt(_afterRebalance);
      expect(await this.opWETHgrow.getInvestStrategySteps()).to.deep.eq(
        convexSteCRVStrategySteps.map(v => Object.values(v)),
      );
      expect(await this.opWETHgrow.investStrategyHash()).to.eq(
        generateStrategyHashV2(convexSteCRVStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS["mainnet"].WETH.hash),
      );
    });

    it("alice deposit some to opWETHgrow, calls vault deposit", async function () {
      await setTokenBalanceInStorage(this.weth, this.signers.alice.address, "0.25");
      await this.weth.connect(this.signers.alice).approve(this.opWETHgrow.address, "250000000000000000");
      // const _expectedTotalSupply =
      // const _expectedShares =
      await this.opWETHgrow
        .connect(this.signers.alice)
        .userDepositVault("250000000000000000", this._aliceMerkleProof, []);
      const _balanceBeforeDeposit = await this.weth.balanceOf(this.opWETHgrow.address);
      await this.opWETHgrow.vaultDepositAllToStrategy();
      const _balanceAfterDeposit = await this.weth.balanceOf(this.opWETHgrow.address);
      expect(_balanceBeforeDeposit).gt(_balanceAfterDeposit);
      // const _actualTotalSupply =
      // const _actualShares =
    });
    it("alice withdraw some to opWETHgrow", async function () {
      // const _expectedTotalSupply =
      // const _expectedUnderlyingTokenReceived =
      await this.opWETHgrow
        .connect(this.signers.alice)
        .userWithdrawVault(await this.opWETHgrow.balanceOf(this.signers.alice.address), this._aliceMerkleProof, []);
      // const _actualTotalSupply =
      // const _actualUnderlyingTokenReceived =
    });
    it("bob deposit some to opUSDCgrow, calls vault deposit", async function () {
      await setTokenBalanceInStorage(this.usdc, this.signers.bob.address, "2500");
      await this.usdc.connect(this.signers.bob).approve(this.opUSDCgrow.address, "2500000000");
      // const _expectedTotalSupply =
      // const _expectedShares =
      await this.opUSDCgrow.connect(this.signers.bob).userDepositVault("2500000000", this._bobMerkleProof, []);
      const _balanceBeforeRebalance = await this.usdc.balanceOf(this.opUSDCgrow.address);
      await this.opUSDCgrow.rebalance();
      const _balanceAfterRebalance = await this.usdc.balanceOf(this.opUSDCgrow.address);
      expect(_balanceBeforeRebalance).gt(_balanceAfterRebalance);
      // const _actualTotalSupply =
      // const _actualShares =
    });
    it("bob withdraw some to opUSDCgrow", async function () {
      // const _expectedTotalSupply =
      // const _expectedUnderlyingTokenReceived =
      await this.opUSDCgrow
        .connect(this.signers.bob)
        .userWithdrawVault(await this.opUSDCgrow.balanceOf(this.signers.bob.address), this._bobMerkleProof, []);
      // const _actualTotalSupply =
      // const _actualUnderlyingTokenReceived =
    });
    it("rebalance opUSDCgrow to mim", async function () {
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS["mainnet"].USDC.hash, mimStrategySteps);
      await this.opUSDCgrow.rebalance();
      // assert invest strategy hash
      expect(await this.opUSDCgrow.getInvestStrategySteps()).to.deep.eq(mimStrategySteps.map(v => Object.values(v)));
      expect(await this.opUSDCgrow.investStrategyHash()).to.eq(
        generateStrategyHashV2(mimStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS["mainnet"].USDC.hash),
      );
      expect(await this.usdc.balanceOf(this.opUSDCgrow.address)).to.eq("0");
      const expectedLPTokenBalance = await getLastStrategyStepBalanceLP(
        mimStrategySteps as StrategyStepType[],
        this.registry,
        this.opUSDCgrow,
        this.usdc,
      );
      const actualLPTokenBalance = await this.opUSDCgrow.getLastStrategyStepBalanceLP(mimStrategySteps);
      expect(actualLPTokenBalance).to.eq(expectedLPTokenBalance);
    });
    it("fail - opUSDCgrow.userDepositVault, MINIMUM_USER_DEPOSIT_VALUE_UT ", async function () {
      const _minimumUserpositUT = await this.opUSDCgrow.minimumDepositValueUT();
      const _depositUSDC = _minimumUserpositUT.div("2");
      await setTokenBalanceInStorage(
        this.usdc,
        this.signers.alice.address,
        _depositUSDC.div(to_10powNumber_BN("6")).toString(),
      );
      await this.usdc.connect(this.signers.alice).approve(this.opUSDCgrow.address, _depositUSDC);
      await expect(
        this.opUSDCgrow.connect(this.signers.alice).userDepositVault(_depositUSDC, this._aliceMerkleProof, []),
      ).to.revertedWith("10");
    });
    it("fail - opWETHgrow.userDepositVault, MINIMUM_USER_DEPOSIT_VALUE_UT", async function () {
      const _minimumUserdepositUT = await this.opWETHgrow.minimumDepositValueUT();
      const _depositWETH = _minimumUserdepositUT.div("2");
      await setTokenBalanceInStorage(
        this.weth,
        this.signers.bob.address,
        new BN(_depositWETH.toString()).div(new BN(to_10powNumber_BN("18").toString())).toString(),
      );
      await this.weth.connect(this.signers.bob).approve(this.opWETHgrow.address, _depositWETH);
      await expect(
        this.opWETHgrow.connect(this.signers.bob).userDepositVault(_depositWETH, this._bobMerkleProof, []),
      ).to.revertedWith("10");
    });
    it("fail - opUSDCgrow.userDepositVault, USER_DEPOSIT_CAP_UT", async function () {
      const _balanceUSDC = await this.usdc.balanceOf(this.signers.alice.address);
      const _totalDeposits = await this.opUSDCgrow.totalDeposits(this.signers.alice.address);
      const _userDepositCap = await this.opUSDCgrow.userDepositCapUT();
      const _fundAmountUSDC = _userDepositCap.sub(_totalDeposits).sub(_balanceUSDC).add("1000000000");
      await setTokenBalanceInStorage(
        this.usdc,
        this.signers.alice.address,
        new BN(_fundAmountUSDC.toString()).div(new BN(to_10powNumber_BN("6").toString())).toString(),
      );
      const _depositUSDC = await this.usdc.balanceOf(this.signers.alice.address);
      await this.usdc.connect(this.signers.alice).approve(this.opUSDCgrow.address, _depositUSDC);
      await expect(
        this.opUSDCgrow.connect(this.signers.alice).userDepositVault(_depositUSDC, this._aliceMerkleProof, []),
      ).to.revertedWith("12");
    });
    it("fail - opWETHgrow.userDepositVault, USER_DEPOSIT_CAP_UT", async function () {
      const _balanceWETH = await this.weth.balanceOf(this.signers.bob.address);
      const _totalDeposits = await this.opWETHgrow.totalDeposits(this.signers.bob.address);
      const _userDepositCap = await this.opWETHgrow.userDepositCapUT();
      const _fundAmountWETH = _userDepositCap.add("10000000000000");
      await setTokenBalanceInStorage(
        this.weth,
        this.signers.bob.address,
        new BN(_fundAmountWETH.toString()).div(new BN(to_10powNumber_BN("18").toString())).toString(),
      );
      const _depositWETH = await this.weth.balanceOf(this.signers.bob.address);
      await this.weth.connect(this.signers.bob).approve(this.opWETHgrow.address, _depositWETH);
      await expect(
        this.opWETHgrow.connect(this.signers.bob).userDepositVault(_depositWETH, this._bobMerkleProof, []),
      ).to.revertedWith("12");
    });
    it("fail - opWETHgrow.userDepositVault, TOTAL_VALUE_LOCKED_LIMIT_UT", async function () {
      await this.opWETHgrow.connect(this.signers.financeOperator).setValueControlParams(
        "100000000000000000000000", // 1 WETH user deposit cap
        "250000000000000000", // 0.25 WETH minimum deposit
        "0", // 0 WETH TVL
      );
      const _depositWETH = await this.weth.balanceOf(this.signers.bob.address);
      await expect(
        this.opWETHgrow.connect(this.signers.bob).userDepositVault(_depositWETH, this._bobMerkleProof, []),
      ).to.revertedWith("11");
    });
    it("fail - opUSDCgrow.userDepositVault, TOTAL_VALUE_LOCKED_LIMIT_UT", async function () {
      await this.opUSDCgrow.connect(this.signers.financeOperator).setValueControlParams(
        "100000000000", // 100,000 USDC user deposit cap
        "1000000000", // 1000 USDC minimum deposit
        "0", // 0 USDC TVL
      );
      await expect(
        this.opUSDCgrow.connect(this.signers.alice).userDepositVault("2500000000", this._aliceMerkleProof, []),
      ).to.revertedWith("11");
    });
  });
});
