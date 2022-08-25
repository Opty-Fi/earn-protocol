import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import BN from "bignumber.js";
import { BigNumber } from "ethers";
import { getAddress } from "ethers/lib/utils";
import {
  assertVaultConfiguration,
  getAccountsMerkleProof,
  getAccountsMerkleRoot,
  Signers,
  to_10powNumber_BN,
} from "../../../../helpers/utils";
import {
  ERC20Permit,
  ERC20Permit__factory,
  InitializableImmutableAdminUpgradeabilityProxy,
  Registry,
  RegistryProxy,
  StrategyProvider,
  Vault,
} from "../../../../typechain";
import { opUSDCgrow, RegistryProxy as RegistryProxyAddress } from "../../_deployments/polygon.json";
import { ESSENTIAL_CONTRACTS } from "../../../../helpers/constants/essential-contracts-name";
import { getLastStrategyStepBalanceLP, getOraValueUT, setTokenBalanceInStorage } from "../../utils";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../../../helpers/constants/tokens";
import { eEVMNetwork } from "../../../../helper-hardhat-config";
import { StrategiesByTokenByChain } from "../../../../helpers/data/adapter-with-strategies";
import { StrategyStepType } from "../../../../helpers/type";
import { generateStrategyHashV2 } from "../../../../helpers/helpers";
import { oldAbis } from "../../../../helpers/data/oldAbis";
import { setZeroStrategy } from "./setZeroStrategy";
import { usdcRebalance } from "./usdcRebalance";
import { deployAndUpgradeUSDC } from "./deployAndUpgradeUSDC";
import { deployAndUpgradeRegistry } from "./deployAndUpgradeRegistry";
import { deployAndUpgradeRiskManager } from "./deployAndUpgradeRiskManager";
import { deployStrategyProvider } from "./deployStrategyProvider";
import { approveAndMapLiquidityPoolToAdapter } from "./approveAndMapLiquidityPoolToAdapter";
import { configopUSDCgrow } from "./configopUSDCgrow";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;
const OPUSDCGROW_VAULT_PROXY_ADDRESS = opUSDCgrow.VaultProxy;
const REGISTRY_PROXY_ADDRESS = RegistryProxyAddress;

// ================================================================
const mooCurveAm3CRV =
  StrategiesByTokenByChain[fork].USDC["usdc-DEPOSIT-CurveStableSwap-am3CRV-DEPOSIT-Beefy-mooCurveAm3CRV"].strategy;
const mooCurveAm3CRVStrategySteps = mooCurveAm3CRV.map(strategy => ({
  pool: strategy.contract,
  outputToken: strategy.outputToken,
  isBorrow: false,
}));
const mooCurveAm3CRVStrategyStepsContract = mooCurveAm3CRV.map(strategy => ({
  contract: strategy.contract,
  outputToken: strategy.outputToken,
  isBorrow: false,
}));
// =================================================================
const am3CRV =
  StrategiesByTokenByChain[fork].USDC["usdc-DEPOSIT-CurveStableSwap-am3CRV-DEPOSIT-CurveGauge-am3CRV-gauge"].strategy;
const am3CRVStrategySteps = am3CRV.map(strategy => ({
  pool: strategy.contract,
  outputToken: strategy.outputToken,
  isBorrow: false,
}));
const am3CRVStrategyStepsContract = am3CRV.map(strategy => ({
  contract: strategy.contract,
  outputToken: strategy.outputToken,
  isBorrow: false,
}));
// =================================================================
const amUSDC = StrategiesByTokenByChain[fork].USDC["usdc-DEPOSIT-Aave-amUSDC"].strategy;
const amUSDCStrategySteps = amUSDC.map(strategy => ({
  pool: strategy.contract,
  outputToken: strategy.outputToken,
  isBorrow: false,
}));
const amUSDCStrategyStepsContract = amUSDC.map(strategy => ({
  contract: strategy.contract,
  outputToken: strategy.outputToken,
  isBorrow: false,
}));
// =================================================================
describe("Vault Ethereum on-chain upgrade", () => {
  before(async function () {
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: process.env.POLYGON_NODE_URL,
            blockNumber: 31790247,
          },
        },
      ],
    });
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

    await setZeroStrategy();
    this.usdc = <ERC20Permit>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address)
    );
    await setTokenBalanceInStorage(this.usdc, this.signers.admin.address, "20000");
    // ==============================================================
    await usdcRebalance();
    // ====================================================
    this.opUSDCgrowProxy = <InitializableImmutableAdminUpgradeabilityProxy>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, OPUSDCGROW_VAULT_PROXY_ADDRESS)
    );
    this.opUSDCgrowOld = await ethers.getContractAt(oldAbis.OldVaultV2, OPUSDCGROW_VAULT_PROXY_ADDRESS);
    this.opUSDCgrowUserDepositCapUT = await this.opUSDCgrowOld.userDepositCapUT();
    this.opUSDCgrowMinimumDepositValueUT = await this.opUSDCgrowOld.minimumDepositValueUT();
    this.opUSDCgrowTotalValueLockedLimitUT = await this.opUSDCgrowOld.totalValueLockedLimitUT();
    // ====================================================
    await deployAndUpgradeUSDC();
    this.opUSDCgrow = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, this.opUSDCgrowProxy.address);
    expect(await this.opUSDCgrow.name()).to.eq("op USDC Coin (PoS) Growth");
    expect(await this.opUSDCgrow.symbol()).to.eq("opUSDCgrow");
    expect(await this.opUSDCgrow.decimals()).to.eq(6);
    // =======================================================
    await deployAndUpgradeRegistry(fork);
    await deployAndUpgradeRiskManager();

    const strategyProviderAddress = await deployStrategyProvider();

    this.strategyProvider = <StrategyProvider>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER, strategyProviderAddress)
    );
  });

  it("default values for old opUSDCgrow should be as expected", async function () {
    expect(await this.opUSDCgrow.opTOKEN_REVISION()).to.eq("0x4");
    expect(await this.opUSDCgrow.registryContract()).to.eq(getAddress(this.registry.address));
    expect(await this.opUSDCgrow.whitelistedAccountsRoot()).to.eq(
      "0x4a7e14b2b81abccd2dfd58372f0cbd5b5512749fbafee2e2cda5c56ac0fc947a",
    );
    expect(await this.opUSDCgrow.underlyingToken()).to.eq(getAddress(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address));
    expect(await this.opUSDCgrow.underlyingTokensHash()).to.eq(
      "0xc2851064805ec339e3448aa6a11e612938131e6f0637ddf761ae5e5cfeee5996",
    );
    expect(await this.opUSDCgrow.name()).to.eq("op USDC Coin (PoS) Growth");
    expect(await this.opUSDCgrow.symbol()).to.eq("opUSDCgrow");
    expect(await this.opUSDCgrow.decimals()).to.eq(6);
    expect(await this.opUSDCgrow.vaultConfiguration()).to.eq(
      BigNumber.from("907136802102229675083754464877550363794833538656521846974622833684986724352"),
    );
    expect(await this.opUSDCgrow.userDepositCapUT()).to.eq(this.opUSDCgrowUserDepositCapUT);
    expect(await this.opUSDCgrow.minimumDepositValueUT()).to.eq(this.opUSDCgrowMinimumDepositValueUT);
    expect(await this.opUSDCgrow.totalValueLockedLimitUT()).to.eq(this.opUSDCgrowTotalValueLockedLimitUT);
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

  it("null strategy for USDC vault", async function () {
    expect(await this.opUSDCgrow.investStrategyHash()).to.eq(ethers.constants.HashZero);
    expect((await this.opUSDCgrow.getInvestStrategySteps()).length).to.eq(0);
  });

  describe("test aave, curve and beefy strategies", async function () {
    before(async function () {
      this.usdc = <ERC20Permit>(
        await ethers.getContractAt(ERC20Permit__factory.abi, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address)
      );
      await this.registry.connect(this.signers.governance).setOperator(this.signers.admin.address);
      await this.registry.connect(this.signers.governance).setRiskOperator(this.signers.admin.address);
      this.signers.operator = await ethers.getSigner(this.signers.admin.address);
      this.signers.riskOperator = await ethers.getSigner(this.signers.admin.address);

      await approveAndMapLiquidityPoolToAdapter();

      await configopUSDCgrow(this.strategyProvider.address, fork);
      expect(await this.opUSDCgrow.getNextBestInvestStrategy()).to.deep.eq(
        mooCurveAm3CRVStrategySteps.map(v => Object.values(v)),
      );
      expect(await this.opUSDCgrow.underlyingTokensHash()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash);

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
      expect(await this.opUSDCgrow.userDepositCapUT()).to.eq("100000000000");
      expect(await this.opUSDCgrow.minimumDepositValueUT()).to.eq("0");
      expect(await this.opUSDCgrow.totalValueLockedLimitUT()).to.eq("10000000000000");

      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x46bB1A2549F36423227158c7AC7aE6BeaE1bFfb4"],
      });
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x64Ed3553EB09AdE4Ddbd010F2ec5576Ac3d5CED7"],
      });
      this.signers.alice = await ethers.getSigner("0x46bB1A2549F36423227158c7AC7aE6BeaE1bFfb4");
      this.signers.bob = await ethers.getSigner("0x64Ed3553EB09AdE4Ddbd010F2ec5576Ac3d5CED7");
      await this.signers.admin.sendTransaction({
        to: this.signers.alice.address,
        value: ethers.utils.parseEther("100"),
      });
      await this.signers.admin.sendTransaction({ to: this.signers.bob.address, value: ethers.utils.parseEther("100") });
      const _accountRoot = getAccountsMerkleRoot([
        this.signers.alice.address,
        this.signers.bob.address,
        this.signers.eve.address,
      ]);
      await this.opUSDCgrow.connect(this.signers.governance).setWhitelistedAccountsRoot(_accountRoot);
      this._aliceMerkleProof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.signers.eve.address],
        this.signers.alice.address,
      );
      this._bobMerkleProof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.signers.eve.address],
        this.signers.bob.address,
      );
    });

    it("lp token balance should be as expected after rebalance of opUSDCgrow to usdc-DEPOSIT-CurveStableSwap-am3CRV-DEPOSIT-CurveGauge-am3CRV-gauge", async function () {
      expect(await this.opUSDCgrow.getNextBestInvestStrategy()).to.deep.eq(
        mooCurveAm3CRVStrategySteps.map(v => Object.values(v)),
      );
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash, am3CRVStrategySteps);
      expect(await this.opUSDCgrow.getNextBestInvestStrategy()).to.deep.eq(
        am3CRVStrategySteps.map(v => Object.values(v)),
      );
      await this.opUSDCgrow.rebalance();
      // assert invest strategy hash
      expect(await this.opUSDCgrow.getInvestStrategySteps()).to.deep.eq(am3CRVStrategySteps.map(v => Object.values(v)));
      expect(await this.opUSDCgrow.investStrategyHash()).to.eq(
        generateStrategyHashV2(am3CRVStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash),
      );
      expect(await this.usdc.balanceOf(this.opUSDCgrow.address)).to.eq("0");
      const expectedLPTokenBalance = await getLastStrategyStepBalanceLP(
        am3CRVStrategySteps as StrategyStepType[],
        this.registry,
        this.opUSDCgrow,
        this.usdc,
      );
      const actualLPTokenBalance = await this.opUSDCgrow.getLastStrategyStepBalanceLP(am3CRVStrategySteps);
      expect(actualLPTokenBalance).to.eq(expectedLPTokenBalance);
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
      const lpTokenBalance = await this.opUSDCgrow.getLastStrategyStepBalanceLP(mooCurveAm3CRVStrategySteps);
      expect(lpTokenBalance).to.eq("0");
      expect(await this.opUSDCgrow.investStrategyHash()).to.eq(ethers.constants.HashZero);
    });

    it("unpause opUSDCgrow and rebalance to aaveUSDC", async function () {
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
      const aaveUSDC = StrategiesByTokenByChain[fork].USDC["usdc-DEPOSIT-Aave-amUSDC"].strategy;
      const aaveUSDCStrategySteps = aaveUSDC.map(strategy => ({
        pool: strategy.contract,
        outputToken: strategy.outputToken,
        isBorrow: false,
      }));
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash, aaveUSDCStrategySteps);
      await this.opUSDCgrow.rebalance();
      expect(await this.opUSDCgrow.getInvestStrategySteps()).to.deep.eq(amUSDCStrategySteps.map(v => Object.values(v)));
      expect(await this.opUSDCgrow.investStrategyHash()).to.eq(
        generateStrategyHashV2(amUSDCStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash),
      );
      const _afterRebalance = await this.usdc.balanceOf(this.opUSDCgrow.address);
      expect(_beforeRebalance).gt(_afterRebalance);
      expect(await this.usdc.balanceOf(this.opUSDCgrow.address)).to.eq("0");
      const expectedLPTokenBalance = await getLastStrategyStepBalanceLP(
        amUSDCStrategySteps as StrategyStepType[],
        this.registry,
        this.opUSDCgrow,
        this.usdc,
      );
      const actualLPTokenBalance = await this.opUSDCgrow.getLastStrategyStepBalanceLP(amUSDCStrategySteps);
      expect(actualLPTokenBalance).to.eq(expectedLPTokenBalance);
      expect(expectedLPTokenBalance).to.gt("0");
    });

    it("bob deposit some to opUSDCgrow, calls vault deposit", async function () {
      const _userDepositUSDC = BigNumber.from("2000000000");
      await setTokenBalanceInStorage(
        this.usdc,
        this.signers.bob.address,
        new BN(_userDepositUSDC.toString()).div(new BN(to_10powNumber_BN("6").toString())).toString(),
      );
      const _balanceInopUSDCgrowUT = await this.usdc.balanceOf(this.opUSDCgrow.address);
      const _oraStratValueUT = await getOraValueUT(
        amUSDCStrategySteps as StrategyStepType[],
        this.registry,
        this.opUSDCgrow,
        this.usdc,
      );

      const totalSupply = await this.opUSDCgrow.totalSupply();
      const _expectedShares = _userDepositUSDC.mul(totalSupply).div(_balanceInopUSDCgrowUT.add(_oraStratValueUT));
      const _expectedTotalSupply = totalSupply.add(_expectedShares);
      const _userBalanceBeforeVT = await this.opUSDCgrow.balanceOf(this.signers.bob.address);
      await this.usdc.connect(this.signers.bob).approve(this.opUSDCgrow.address, _userDepositUSDC);
      await this.opUSDCgrow
        .connect(this.signers.bob)
        .userDepositVault(this.signers.bob.address, _userDepositUSDC, "0x", this._bobMerkleProof, []);
      const _balanceBeforeDeposit = await this.usdc.balanceOf(this.opUSDCgrow.address);
      await this.opUSDCgrow.vaultDepositAllToStrategy();

      const _balanceAfterDeposit = await this.usdc.balanceOf(this.opUSDCgrow.address);
      const _userBalanceAfterVT = await this.opUSDCgrow.balanceOf(this.signers.bob.address);
      expect(_balanceBeforeDeposit).gt(_balanceAfterDeposit);
      const _actualShares = _userBalanceAfterVT.sub(_userBalanceBeforeVT);
      expect(_actualShares).to.eq(_expectedShares);
      expect(await this.opUSDCgrow.totalSupply()).to.eq(_expectedTotalSupply);
    });

    it("bob withdraw some to opUSDCgrow", async function () {
      const _userWithdrawVT = (await this.opUSDCgrow.balanceOf(this.signers.bob.address)).div(2);
      const _totalSupply = await this.opUSDCgrow.totalSupply();
      const _expectedTotalSupply = _totalSupply.sub(_userWithdrawVT);
      const _balanceInopWETHgrowUT = await this.usdc.balanceOf(this.opUSDCgrow.address);
      const _oraStratValueUT = await getOraValueUT(
        amUSDCStrategySteps as StrategyStepType[],
        this.registry,
        this.opUSDCgrow,
        this.usdc,
      );
      const expectedUT = _userWithdrawVT.mul(_balanceInopWETHgrowUT.add(_oraStratValueUT)).div(_totalSupply);
      const _balanceBefore = await this.usdc.balanceOf(this.signers.bob.address);
      await this.opUSDCgrow
        .connect(this.signers.bob)
        .userWithdrawVault(this.signers.bob.address, _userWithdrawVT, this._bobMerkleProof, []);
      const _balanceAfter = await this.usdc.balanceOf(this.signers.bob.address);
      expect(_balanceAfter.sub(_balanceBefore)).to.gte(expectedUT.sub(expectedUT.mul(3).div(1000)));
      expect(await this.opUSDCgrow.totalSupply()).to.eq(_expectedTotalSupply);
    });

    it("rebalance opUSDCgrow to mooCurveAm3CRV", async function () {
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash, mooCurveAm3CRVStrategySteps);
      await this.opUSDCgrow.rebalance();
      // assert invest strategy hash
      expect(await this.opUSDCgrow.getInvestStrategySteps()).to.deep.eq(
        mooCurveAm3CRVStrategySteps.map(v => Object.values(v)),
      );
      expect(await this.opUSDCgrow.investStrategyHash()).to.eq(
        generateStrategyHashV2(mooCurveAm3CRVStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash),
      );
      expect(await this.usdc.balanceOf(this.opUSDCgrow.address)).to.eq("0");
      const expectedLPTokenBalance = await getLastStrategyStepBalanceLP(
        mooCurveAm3CRVStrategySteps as StrategyStepType[],
        this.registry,
        this.opUSDCgrow,
        this.usdc,
      );
      const actualLPTokenBalance = await this.opUSDCgrow.getLastStrategyStepBalanceLP(mooCurveAm3CRVStrategySteps);
      expect(actualLPTokenBalance).to.eq(expectedLPTokenBalance);
    });

    it("fail - opUSDCgrow.userDepositVault, MINIMUM_USER_DEPOSIT_VALUE_UT ", async function () {
      await this.opUSDCgrow
        .connect(this.signers.financeOperator)
        .setMinimumDepositValueUT(BigNumber.from("10000000000"));
      const _minimumUserpositUT = await this.opUSDCgrow.minimumDepositValueUT();
      const _depositUSDC = _minimumUserpositUT.div("2");
      await setTokenBalanceInStorage(
        this.usdc,
        this.signers.alice.address,
        _depositUSDC.div(to_10powNumber_BN("6")).toString(),
      );
      await this.usdc.connect(this.signers.alice).approve(this.opUSDCgrow.address, _depositUSDC);
      await expect(
        this.opUSDCgrow
          .connect(this.signers.alice)
          .userDepositVault(this.signers.alice.address, _depositUSDC, "0x", this._aliceMerkleProof, []),
      ).to.revertedWith("10");
    });

    it("fail - opUSDCgrow.userDepositVault, USER_DEPOSIT_CAP_UT", async function () {
      const _balanceUSDC = await this.usdc.balanceOf(this.signers.alice.address);
      const _totalDeposits = await this.opUSDCgrow.totalDeposits(this.signers.alice.address);
      const _userDepositCap = await this.opUSDCgrow.userDepositCapUT();
      const _fundAmountUSDC = _userDepositCap.sub(_totalDeposits).sub(_balanceUSDC).add("100000000000");
      await setTokenBalanceInStorage(
        this.usdc,
        this.signers.alice.address,
        new BN(_fundAmountUSDC.toString()).div(new BN(to_10powNumber_BN("6").toString())).toString(),
      );
      const _depositUSDC = await this.usdc.balanceOf(this.signers.alice.address);
      await this.usdc.connect(this.signers.alice).approve(this.opUSDCgrow.address, _depositUSDC);
      await expect(
        this.opUSDCgrow
          .connect(this.signers.alice)
          .userDepositVault(this.signers.alice.address, _depositUSDC, "0x", this._aliceMerkleProof, []),
      ).to.revertedWith("12");
    });

    it("fail - opUSDCgrow.userDepositVault, TOTAL_VALUE_LOCKED_LIMIT_UT", async function () {
      await this.opUSDCgrow.connect(this.signers.financeOperator).setValueControlParams(
        "100000000000", // 100,000 USDC user deposit cap
        "1000000000", // 1000 USDC minimum deposit
        "0", // 0 USDC TVL
      );
      await expect(
        this.opUSDCgrow
          .connect(this.signers.alice)
          .userDepositVault(this.signers.alice.address, "2000000000", "0x", this._aliceMerkleProof, []),
      ).to.revertedWith("11");
    });
  });
});
