import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import BN from "bignumber.js";
import { BigNumber } from "ethers";
import { getAddress } from "ethers/lib/utils";
import { assertVaultConfiguration, Signers, to_10powNumber_BN } from "../../helpers/utils";
import {
  ERC20,
  InitializableImmutableAdminUpgradeabilityProxy,
  Registry,
  RegistryProxy,
  RiskManagerProxy,
  StrategyProvider,
  Vault,
} from "../../typechain";
import { opUSDCgrow, opWETHgrow, RegistryProxy as RegistryProxyAddress } from "../../_deployments/mainnet.json";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { getLastStrategyStepBalanceLP, getOraValueUT, setTokenBalanceInStorage } from "./utils";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../helpers/constants/tokens";
import { eEVMNetwork } from "../../helper-hardhat-config";
import { StrategiesByTokenByChain } from "../../helpers/data/adapter-with-strategies";
import { StrategyStepType } from "../../helpers/type";
import { generateStrategyHashV2 } from "../../helpers/helpers";
import { oldAbis } from "../../helpers/data/oldAbis";
import { getRiskProfileCode, getUnpause } from "../../helpers/utils";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;
const OPUSDCGROW_VAULT_PROXY_ADDRESS = opUSDCgrow.VaultProxy;
const OPWETHGROW_VAULT_PROXY_ADDRESS = opWETHgrow.VaultProxy;
const REGISTRY_PROXY_ADDRESS = RegistryProxyAddress;

// ================================================================
const mim =
  StrategiesByTokenByChain[fork].USDC[
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
  StrategiesByTokenByChain[fork].WETH["weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV"]
    .strategy;
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
  StrategiesByTokenByChain[fork].USDC[
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
const cvxusdn3Crv =
  StrategiesByTokenByChain[fork].USDC["USDC-DEPOSIT-Curve_3Crv-DEPOSIT-Curve_USDN-3Crv-DEPOSIT-Convex_CurveUsdn-3Crv"]
    .strategy;
const cvxusdn3CrvStrategySteps = cvxusdn3Crv.map(strategy => ({
  pool: strategy.contract,
  outputToken: strategy.outputToken,
  isBorrow: false,
}));
describe("Vault Ethereum on-chain upgrade", () => {
  before(async function () {
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: process.env.MAINNET_NODE_URL,
            blockNumber: 14389356,
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
    this.usdc = <ERC20>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address)
    );
    await setTokenBalanceInStorage(this.usdc, this.signers.admin.address, "20000");
    // ==============================================================
    await usdcRebalance();
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
    await wethRebalance();
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
    // ====================================================
    await deployAndUpgradeUSDC();
    this.opUSDCgrow = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, this.opUSDCgrowProxy.address);
    expect(await this.opUSDCgrow.name()).to.eq("op USD Coin Growth");
    expect(await this.opUSDCgrow.symbol()).to.eq("opUSDCgrow");
    expect(await this.opUSDCgrow.decimals()).to.eq(6);
    // ====================================================
    await deployAndUpgradeWETH();
    this.opWETHgrow = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, this.opWETHgrowProxy.address);
    expect(await this.opWETHgrow.name()).to.eq("op Wrapped Ether Growth");
    expect(await this.opWETHgrow.symbol()).to.eq("opWETHgrow");
    expect(await this.opWETHgrow.decimals()).to.eq(18);
    // =======================================================
    await deployAndUpgradeRegistry();
    await deployAndUpgradeRiskManager();
    const strategyProviderAddress = await deployStrategyProvider();
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

  describe("test frax, usdn3Crv and steth strategy", async function () {
    before(async function () {
      this.usdc = <ERC20>(
        await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address)
      );
      this.weth = <ERC20>(
        await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, MULTI_CHAIN_VAULT_TOKENS[fork].WETH.address)
      );

      await this.registry.connect(this.signers.governance).setOperator(this.signers.admin.address);
      await this.registry.connect(this.signers.governance).setRiskOperator(this.signers.admin.address);
      this.signers.operator = await ethers.getSigner(this.signers.admin.address);
      this.signers.riskOperator = await ethers.getSigner(this.signers.admin.address);
      await approveAndMapLiquidityPoolToAdapter();
      await configopUSDCgrow(this.strategyProvider.address);
      await configopWETHgrow(this.strategyProvider.address);
      expect(await this.opUSDCgrow.getNextBestInvestStrategy()).to.deep.eq(
        cvxusdn3CrvStrategySteps.map(v => Object.values(v)),
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
      expect(await this.opUSDCgrow.minimumDepositValueUT()).to.eq("1000000000");
      expect(await this.opUSDCgrow.totalValueLockedLimitUT()).to.eq("10000000000000");

      // await deployments.fixture("ConfigopWETHgrow");
      // await deployments.fixture("SetBestStrategyopWETHgrow");
      expect(await this.opWETHgrow.getNextBestInvestStrategy()).to.deep.eq(
        convexSteCRVStrategySteps.map(v => Object.values(v)),
      );
      expect(await this.opWETHgrow.underlyingTokensHash()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash);
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
      expect(await this.opWETHgrow.userDepositCapUT()).to.eq("5000000000000000000");
      expect(await this.opWETHgrow.minimumDepositValueUT()).to.eq("250000000000000000");
      expect(await this.opWETHgrow.totalValueLockedLimitUT()).to.eq("5000000000000000000000");
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
      this._aliceMerkleProof = [
        "0xa6dbedb2f3b19deb69641088e4887ef7450cd51ad6b3a1fd536b2ada6f5b4af6",
        "0xa00292acdaaa579733e7c6ee9c3decae0119af01f3d8c85914963c483c90822f",
        "0x34e15e679e9f745ce592b6b4d6c9ed816305c27bc27096c097a2d18940fbb3a5",
        "0x2e606144ed526ba457ee8c00abff95ade16d48693a1b10e7eadf24c3133f8aaa",
        "0xd26266e87147476474d1448d8ec57b00830a72a6d2c32738c58eb64d866f8af3",
        "0x18ad4449dbea1254aa03b50783f10bd75f388172fc6a0b8e1668f401aa9be667",
        "0x8cb1cca1947a3b8d0781e3eeffff3bd7a6c04c479d36729b4f4fd0256c1676fa",
        "0xfbcd91ee20e3296ddfefc6a0ccbd55572fa04eef664ffaf7a8ebadb5464fb8bc",
        "0x52d024af79b0c1fec8bc809126def5a2fdf04c4bfc4d12d096f0e0609d0d23d2",
        "0xfc4530f66ccf89c672f81c2f0440b2355eb88d51565dc7f90141596e391ace6a",
      ];
      this._bobMerkleProof = [
        "0x430a51443e1ccd53de5b75ac2c465fef84ce352550c4d0040f15a3cc6118dd05",
        "0x1811644fa6fa0dd1f4b0ec5767bf0638ee92a6978f11e1578e47bee406f52bc5",
        "0xabf82a22f132c59b881754b021128ec49064e417bf01c584ea081c4085418905",
        "0xe86263b49d75c566a1bcb59192a7a122c33b68305ca0415770e5ea3c521ea837",
        "0x587dd9e2664b0e2cd77fe90e41b137cd63ac875df7029d1ba4c6a2a83414fea2",
        "0x1d3cab42850715c241202c57052d0123cc022b8a214aaca8c23979fdb47b0c5a",
        "0x8cb1cca1947a3b8d0781e3eeffff3bd7a6c04c479d36729b4f4fd0256c1676fa",
        "0xfbcd91ee20e3296ddfefc6a0ccbd55572fa04eef664ffaf7a8ebadb5464fb8bc",
        "0x52d024af79b0c1fec8bc809126def5a2fdf04c4bfc4d12d096f0e0609d0d23d2",
        "0xfc4530f66ccf89c672f81c2f0440b2355eb88d51565dc7f90141596e391ace6a",
      ];
      // const strategyProviderAddress = await deployStrategyProvider();
      // this.strategyProvider = <StrategyProvider>(
      //   await ethers.getContractAt(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER, strategyProviderAddress)
      // );
    });

    it("lp token balance should be as expected after rebalance of opUSDCgrow to usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-CurveSwapPool-MIM-3LP3CRV-f-DEPOSIT-Convex-cvxMIM-3LP3CRV-f", async function () {
      expect(await this.opUSDCgrow.getNextBestInvestStrategy()).to.deep.eq(
        cvxusdn3CrvStrategySteps.map(v => Object.values(v)),
      );
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash, mimStrategySteps);
      expect(await this.opUSDCgrow.getNextBestInvestStrategy()).to.deep.eq(mimStrategySteps.map(v => Object.values(v)));
      await this.opUSDCgrow.rebalance();
      // assert invest strategy hash
      expect(await this.opUSDCgrow.getInvestStrategySteps()).to.deep.eq(mimStrategySteps.map(v => Object.values(v)));
      expect(await this.opUSDCgrow.investStrategyHash()).to.eq(
        generateStrategyHashV2(mimStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash),
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
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash, convexSteCRVStrategySteps);
      expect(await this.opWETHgrow.getNextBestInvestStrategy()).to.deep.eq(
        convexSteCRVStrategySteps.map(v => Object.values(v)),
      );
      const _beforeRebalance = await this.weth.balanceOf(this.opWETHgrow.address);
      await this.opWETHgrow.rebalance();
      const _afterRebalance = await this.weth.balanceOf(this.opWETHgrow.address);
      expect(_beforeRebalance).gt(_afterRebalance);
      expect(await this.opWETHgrow.getInvestStrategySteps()).to.deep.eq(
        convexSteCRVStrategySteps.map(v => Object.values(v)),
      );
      expect(await this.opWETHgrow.investStrategyHash()).to.eq(
        generateStrategyHashV2(convexSteCRVStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash),
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
        StrategiesByTokenByChain[fork].USDC[
          "usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-CurveMetapoolSwapPool-FRAX3CRV-f-DEPOSIT-Convex-cvxFRAX3CRV-f"
        ].strategy;
      const convexFraxStrategySteps = convexFrax.map(strategy => ({
        pool: strategy.contract,
        outputToken: strategy.outputToken,
        isBorrow: false,
      }));
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash, convexFraxStrategySteps);
      await this.opUSDCgrow.rebalance();
      expect(await this.opUSDCgrow.getInvestStrategySteps()).to.deep.eq(
        cvxFRAX3CRVStrategySteps.map(v => Object.values(v)),
      );
      expect(await this.opUSDCgrow.investStrategyHash()).to.eq(
        generateStrategyHashV2(cvxFRAX3CRVStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash),
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
        generateStrategyHashV2(convexSteCRVStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash),
      );
    });

    it("alice deposit some to opWETHgrow, calls vault deposit", async function () {
      const _userDepositWETH = BigNumber.from("250000000000000000");
      await setTokenBalanceInStorage(
        this.weth,
        this.signers.alice.address,
        new BN(_userDepositWETH.toString()).div(new BN(to_10powNumber_BN("18").toString())).toString(),
      );
      await this.weth.connect(this.signers.alice).approve(this.opWETHgrow.address, _userDepositWETH);
      const _balanceInopWETHgrowUT = await this.weth.balanceOf(this.opWETHgrow.address);
      const _oraStratValueUT = await getOraValueUT(
        convexSteCRVStrategySteps as StrategyStepType[],
        this.registry,
        this.opWETHgrow,
        this.weth,
      );
      const totalSupply = await this.opWETHgrow.totalSupply();
      const _expectedShares = _userDepositWETH.mul(totalSupply).div(_balanceInopWETHgrowUT.add(_oraStratValueUT));
      const _expectedTotalSupply = totalSupply.add(_expectedShares);
      const _userBalanceBeforeVT = await this.opWETHgrow.balanceOf(this.signers.alice.address);
      await this.opWETHgrow.connect(this.signers.alice).userDepositVault(_userDepositWETH, this._aliceMerkleProof, []);
      const _balanceBeforeDeposit = await this.weth.balanceOf(this.opWETHgrow.address);
      await this.opWETHgrow.vaultDepositAllToStrategy();
      const _balanceAfterDeposit = await this.weth.balanceOf(this.opWETHgrow.address);
      const _userBalanceAfterVT = await this.opWETHgrow.balanceOf(this.signers.alice.address);
      expect(_balanceBeforeDeposit).gt(_balanceAfterDeposit);
      const _actualShares = _userBalanceAfterVT.sub(_userBalanceBeforeVT);
      expect(_actualShares).to.eq(_expectedShares);
      expect(await this.opWETHgrow.totalSupply()).to.eq(_expectedTotalSupply);
    });
    it("alice withdraw some to opWETHgrow", async function () {
      const _userWithdrawVT = (await this.opWETHgrow.balanceOf(this.signers.alice.address)).div(2);
      const _totalSupply = await this.opWETHgrow.totalSupply();
      const _expectedTotalSupply = _totalSupply.sub(_userWithdrawVT);
      const _balanceInopWETHgrowUT = await this.weth.balanceOf(this.opWETHgrow.address);
      const _oraStratValueUT = await getOraValueUT(
        convexSteCRVStrategySteps as StrategyStepType[],
        this.registry,
        this.opWETHgrow,
        this.weth,
      );
      const expectedUT = _userWithdrawVT.mul(_balanceInopWETHgrowUT.add(_oraStratValueUT)).div(_totalSupply);
      const _balanceBefore = await this.weth.balanceOf(this.signers.alice.address);
      await this.opWETHgrow.connect(this.signers.alice).userWithdrawVault(_userWithdrawVT, this._aliceMerkleProof, []);
      const _balanceAfter = await this.weth.balanceOf(this.signers.alice.address);
      expect(_balanceAfter.sub(_balanceBefore)).gte(expectedUT.sub(expectedUT.mul(7).div(100)));
      expect(await this.opWETHgrow.totalSupply()).to.eq(_expectedTotalSupply);
    });
    it("bob deposit some to opUSDCgrow, calls vault deposit", async function () {
      const _userDepositUSDC = BigNumber.from("2500000000");
      await setTokenBalanceInStorage(
        this.usdc,
        this.signers.bob.address,
        new BN(_userDepositUSDC.toString()).div(new BN(to_10powNumber_BN("6").toString())).toString(),
      );
      await this.usdc.connect(this.signers.bob).approve(this.opUSDCgrow.address, _userDepositUSDC);
      const _balanceInopUSDCgrowUT = await this.usdc.balanceOf(this.opUSDCgrow.address);
      const _oraStratValueUT = await getOraValueUT(
        cvxFRAX3CRVStrategySteps as StrategyStepType[],
        this.registry,
        this.opUSDCgrow,
        this.usdc,
      );
      const totalSupply = await this.opUSDCgrow.totalSupply();
      const _expectedShares = _userDepositUSDC.mul(totalSupply).div(_balanceInopUSDCgrowUT.add(_oraStratValueUT));
      const _expectedTotalSupply = totalSupply.add(_expectedShares);
      const _userBalanceBeforeVT = await this.opUSDCgrow.balanceOf(this.signers.bob.address);
      await this.opUSDCgrow.connect(this.signers.bob).userDepositVault(_userDepositUSDC, this._bobMerkleProof, []);
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
        cvxFRAX3CRVStrategySteps as StrategyStepType[],
        this.registry,
        this.opUSDCgrow,
        this.usdc,
      );
      const expectedUT = _userWithdrawVT.mul(_balanceInopWETHgrowUT.add(_oraStratValueUT)).div(_totalSupply);
      const _balanceBefore = await this.usdc.balanceOf(this.signers.bob.address);
      await this.opUSDCgrow.connect(this.signers.bob).userWithdrawVault(_userWithdrawVT, this._bobMerkleProof, []);
      const _balanceAfter = await this.usdc.balanceOf(this.signers.bob.address);
      expect(_balanceAfter.sub(_balanceBefore)).to.gte(expectedUT.sub(expectedUT.mul(3).div(1000)));
      expect(await this.opUSDCgrow.totalSupply()).to.eq(_expectedTotalSupply);
    });
    it("rebalance opUSDCgrow to mim", async function () {
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash, mimStrategySteps);
      await this.opUSDCgrow.rebalance();
      // assert invest strategy hash
      expect(await this.opUSDCgrow.getInvestStrategySteps()).to.deep.eq(mimStrategySteps.map(v => Object.values(v)));
      expect(await this.opUSDCgrow.investStrategyHash()).to.eq(
        generateStrategyHashV2(mimStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash),
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

async function setZeroStrategy() {
  const { getAddress } = ethers.utils;
  const registryProxyAddress = "0x99fa011e33a8c6196869dec7bc407e896ba67fe3";
  const registryProxyInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_PROXY, registryProxyAddress);
  const oldRegistryImplementationAddress = "0x9ff914d0005564a941429d1685477851d1836672";
  const actualRegistryImplementationAddress = await registryProxyInstance.registryImplementation();
  if (getAddress(oldRegistryImplementationAddress) == getAddress(actualRegistryImplementationAddress)) {
    console.log("\n");
    console.log("Set zero strategy");
    console.log("\n");

    const registryInstance = await ethers.getContractAt(oldAbis.oldRegistry, registryProxyAddress);

    const strategyOperatorAddress = await registryInstance.getStrategyOperator();

    const signerStrategyOperator = await ethers.getSigner(strategyOperatorAddress);

    const strategyProviderAddress = "0x23f028cbbd6cdac0e430f6d943ff695a32f8461a";

    const strategyProviderInstance = await ethers.getContractAt(oldAbis.oldStrategyProvider, strategyProviderAddress);

    const oldUSDCTokensHash = "0x987a96a91381a62e90a58f1c68177b52aa669f3bd7798e321819de5f870d4ddd";
    const oldWETHTokensHash = "0x23a659933d87059bc00a17f29f4d98c03eb8986a90c1bec799741278c741576d";

    const opUSDCgrowProxyAddress = "0x6d8bfdb4c4975bb086fc9027e48d5775f609ff88";
    const opUSDCgrowInstance = await ethers.getContractAt(oldAbis.oldVault, opUSDCgrowProxyAddress);
    const opWETHgrowProxyAddress = "0xff2fbd9fbc6d03baa77cf97a3d5671bea183b9a8";
    const opWETHgrowInstance = await ethers.getContractAt(oldAbis.oldVault, opWETHgrowProxyAddress);

    const opUSDCgrowRiskProfileCode = await opUSDCgrowInstance.riskProfileCode();
    const opWETHgrowRiskProfileCode = await opWETHgrowInstance.riskProfileCode();

    console.log("opUSDCgrowRiskProfileCode ", opUSDCgrowRiskProfileCode);
    console.log("\n");
    console.log("opWETHgrowRiskProfileCode ", opWETHgrowRiskProfileCode);
    console.log("\n");

    const defaultStrategyState = await strategyProviderInstance.getDefaultStrategyState();
    console.log("defaultStrategyState ", defaultStrategyState);
    console.log("\n");
    const usdcBestStrategyHash = await strategyProviderInstance.rpToTokenToBestStrategy(
      opUSDCgrowRiskProfileCode,
      oldUSDCTokensHash,
    );
    const usdcDefaultStrategyHash = await strategyProviderInstance.rpToTokenToDefaultStrategy(
      opUSDCgrowRiskProfileCode,
      oldUSDCTokensHash,
    );
    const wethBestStrategyHash = await strategyProviderInstance.rpToTokenToBestStrategy(
      opWETHgrowRiskProfileCode,
      oldWETHTokensHash,
    );
    const wethDefaultStrategyHash = await strategyProviderInstance.rpToTokenToDefaultStrategy(
      opWETHgrowRiskProfileCode,
      oldWETHTokensHash,
    );

    console.log("usdcBestStrategyHash ", usdcBestStrategyHash);
    console.log("\n");
    console.log("usdcDefaultStrategyHash ", usdcDefaultStrategyHash);
    console.log("\n");
    console.log("wethBestStrategyHash ", wethBestStrategyHash);
    console.log("\n");
    console.log("wethDefaultStrategyHash ", wethDefaultStrategyHash);
    console.log("\n");

    console.log("StrategyProvider.setBestStrategy");
    console.log("\n");
    if (usdcBestStrategyHash != ethers.constants.HashZero) {
      console.log("StrategyOperator setting HashZero as best strategy for USDC...");
      console.log("\n");
      const tx1 = await strategyProviderInstance
        .connect(signerStrategyOperator)
        .setBestStrategy(opUSDCgrowRiskProfileCode, oldUSDCTokensHash, ethers.constants.HashZero);
      await tx1.wait(1);
      console.log(
        "usdcBestStrategyHash ",
        await strategyProviderInstance.rpToTokenToBestStrategy(opUSDCgrowRiskProfileCode, oldUSDCTokensHash),
      );
      console.log("\n");
    } else {
      console.log("best strategy for USDC is already HashZero...");
      console.log("\n");
    }
    if (wethBestStrategyHash != ethers.constants.HashZero) {
      console.log("StrategyOperator setting HashZero as best strategy for WETH...");
      console.log("\n");
      const tx2 = await strategyProviderInstance
        .connect(signerStrategyOperator)
        .setBestStrategy(opWETHgrowRiskProfileCode, oldWETHTokensHash, ethers.constants.HashZero);
      await tx2.wait(1);
      console.log(
        "wethBestStrategyHash ",
        await strategyProviderInstance.rpToTokenToBestStrategy(opWETHgrowRiskProfileCode, oldWETHTokensHash),
      );
      console.log("\n");
    } else {
      console.log("best strategy for WETH is already HashZero...");
      console.log("\n");
    }

    console.log("StrategyProvider.setBestDefaultStrategy");
    console.log("\n");
    if (usdcDefaultStrategyHash != ethers.constants.HashZero) {
      console.log("StrategyOperator setting HashZero as best default strategy for USDC...");
      console.log("\n");
      const tx3 = await strategyProviderInstance
        .connect(signerStrategyOperator)
        .setBestDefaultStrategy(opUSDCgrowRiskProfileCode, oldUSDCTokensHash, ethers.constants.HashZero);
      await tx3.wait(1);
      console.log(
        "usdcDefaultStrategyHash ",
        await strategyProviderInstance.rpToTokenToDefaultStrategy(opUSDCgrowRiskProfileCode, oldUSDCTokensHash),
      );
      console.log("\n");
    } else {
      console.log("default strategy for USDC is already HashZero...");
      console.log("\n");
    }
    if (wethDefaultStrategyHash != ethers.constants.HashZero) {
      console.log("StrategyOperator setting HashZero as best default strategy for WETH...");
      console.log("\n");
      const tx4 = await strategyProviderInstance
        .connect(signerStrategyOperator)
        .setBestDefaultStrategy(opWETHgrowRiskProfileCode, oldWETHTokensHash, ethers.constants.HashZero);
      await tx4.wait(1);
      console.log(
        "wethDefaultStrategyHash ",
        await strategyProviderInstance.rpToTokenToDefaultStrategy(opWETHgrowRiskProfileCode, oldWETHTokensHash),
      );
      console.log("\n");
    } else {
      console.log("default strategy for WETH is already HashZero...");
      console.log("\n");
    }
    console.log("Checking strategy hash on next rebalance from RiskManager..");
    console.log("\n");
    const riskManageProxyAddress = "0x4379031f3191d89693bc8b6dac4d3d06466ea952";
    const riskManagerInstance = await ethers.getContractAt(oldAbis.oldRiskManager, riskManageProxyAddress);
    console.log(
      "opWETHgrow next strategy ",
      await riskManagerInstance.getBestStrategy(opWETHgrowRiskProfileCode, [
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      ]),
    );
    console.log("\n");
    console.log(
      "opUSDCgrow next strategy ",
      await riskManagerInstance.getBestStrategy(opUSDCgrowRiskProfileCode, [
        "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      ]),
    );
    console.log("\n");
  } else {
    console.log("Migration is already done");
    console.log("\n");
  }
}

async function usdcRebalance() {
  const opUSDCgrowProxyAddress = "0x6d8bfdb4c4975bb086fc9027e48d5775f609ff88";
  const oldopUSDCgrowImplementation = "0xfad37e3197e6331647030954512964cd2e55acaf";
  const opUSDCgrowProxyInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, opUSDCgrowProxyAddress);
  const actualopUSDCgrowImplementation = await opUSDCgrowProxyInstance.implementation();
  if (getAddress(oldopUSDCgrowImplementation) == getAddress(actualopUSDCgrowImplementation)) {
    console.log("\n");
    console.log("USDC vault...");
    console.log("\n");
    const opUSDCgrowInstance = await ethers.getContractAt(oldAbis.oldVault, opUSDCgrowProxyAddress);

    const usdcCurrentStrategyHash = await opUSDCgrowInstance.investStrategyHash();
    console.log("USDC current strategy ", usdcCurrentStrategyHash);
    console.log("\n");
    if (usdcCurrentStrategyHash != ethers.constants.HashZero) {
      console.log("rebalancing USDC...");
      console.log("\n");
      const tx = await opUSDCgrowInstance.rebalance();
      await tx.wait(1);
      console.log("usdcCurrentStrategyHash ", await opUSDCgrowInstance.investStrategyHash());
    } else {
      console.log("USDC vault current strategy is HashZero..");
      console.log("\n");
    }
  } else {
    console.log("Migration is already done");
    console.log("\n");
  }
}

async function wethRebalance() {
  const opWETHgrowProxyAddress = "0xff2fbd9fbc6d03baa77cf97a3d5671bea183b9a8";
  const oldopWETHgrowImplementation = "0x72ce52a66713257b9805ffa0a0b14162d4b95b69";
  const opWETHgrowProxyInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, opWETHgrowProxyAddress);
  const actualopWETHgrowImplementation = await opWETHgrowProxyInstance.implementation();
  if (getAddress(oldopWETHgrowImplementation) == getAddress(actualopWETHgrowImplementation)) {
    console.log("\n");
    console.log("WETH vault..");
    console.log("\n");
    const opWETHgrowInstance = await ethers.getContractAt(oldAbis.oldVault, opWETHgrowProxyAddress);

    const wethCurrentStrategyHash = await opWETHgrowInstance.investStrategyHash();
    console.log("WETH current strategy ", wethCurrentStrategyHash);
    console.log("\n");
    if (wethCurrentStrategyHash != ethers.constants.HashZero) {
      console.log("rebalancing WETH...");
      console.log("\n");
      const tx = await opWETHgrowInstance.rebalance();
      await tx.wait(1);
      console.log("wethCurrentStrategyHash ", await opWETHgrowInstance.investStrategyHash());
    } else {
      console.log("WETH vault current strategy is HashZero..");
      console.log("\n");
    }
  } else {
    console.log("Migration is already done");
    console.log("\n");
  }
}

async function deployAndUpgradeUSDC() {
  const registryProxyAddress = "0x99fa011e33a8c6196869dec7bc407e896ba67fe3";
  const opUSDCgrowFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.VAULT);
  const opUSDCgrow = await opUSDCgrowFactory.deploy(registryProxyAddress, "USD Coin", "USDC", "Growth", "grow");
  const { getAddress } = ethers.utils;
  const opUSDCgrowProxyAddress = "0x6d8bfdb4c4975bb086fc9027e48d5775f609ff88";
  const opUSDCgrowAddress = opUSDCgrow.address;

  const opUSDCgrowProxyInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, opUSDCgrowProxyAddress);
  const proxyAdminAddress = await opUSDCgrowProxyInstance.admin();
  const proxyAdminSigner = await ethers.getSigner(proxyAdminAddress);

  const implementationAddress = await opUSDCgrowProxyInstance.implementation();

  console.log("opUSDCgrow upgrade");
  console.log("\n");
  if (getAddress(implementationAddress) != getAddress(opUSDCgrowAddress)) {
    console.log("Admin upgrading opUSDCgrow..");
    console.log("\n");
    const tx1 = await opUSDCgrowProxyInstance.connect(proxyAdminSigner).upgradeTo(opUSDCgrowAddress);
    await tx1.wait(1);
  } else {
    console.log("opUSDCgrow is upto date..");
    console.log("\n");
  }
}

async function deployAndUpgradeWETH() {
  const registryProxyAddress = "0x99fa011e33a8c6196869dec7bc407e896ba67fe3";
  const opWETHgrowFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.VAULT);
  const opWETHgrow = await opWETHgrowFactory.deploy(registryProxyAddress, "Wrapped Ether", "WETH", "Growth", "grow");
  const { getAddress } = ethers.utils;
  const opWETHgrowProxyAddress = "0xff2fbd9fbc6d03baa77cf97a3d5671bea183b9a8";
  const opWETHgrowAddress = opWETHgrow.address;

  const opWETHgrowProxyInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, opWETHgrowProxyAddress);
  const proxyAdminAddress = await opWETHgrowProxyInstance.admin();
  const proxyAdminSigner = await ethers.getSigner(proxyAdminAddress);

  const implementationAddress = await opWETHgrowProxyInstance.implementation();

  console.log("opWETHgrow upgrade");
  console.log("\n");
  if (getAddress(implementationAddress) != getAddress(opWETHgrowAddress)) {
    console.log("Admin upgrading opWETHgrow..");
    console.log("\n");
    const tx1 = await opWETHgrowProxyInstance.connect(proxyAdminSigner).upgradeTo(opWETHgrowAddress);
    await tx1.wait(1);
  } else {
    console.log("opWETHgrow is upto date..");
    console.log("\n");
  }
}

async function deployAndUpgradeRegistry() {
  const registryProxyAddress: string = "0x99fa011e33a8c6196869dec7bc407e896ba67fe3";
  const registryFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.REGISTRY);
  const registryV2 = await registryFactory.deploy();
  let registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryV2.address);
  let registryProxyInstance = <RegistryProxy>(
    await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_PROXY, registryProxyAddress)
  );
  const operatorAddress = await registryProxyInstance.operator();
  const operatorSigner = await ethers.getSigner(operatorAddress);
  const governanceAddress = await registryProxyInstance.governance();
  const governanceSigner = await ethers.getSigner(governanceAddress);
  registryProxyInstance = <RegistryProxy>(
    await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_PROXY, registryProxyAddress)
  );
  // upgrade registry
  const registryImplementation = await registryProxyInstance.registryImplementation();
  console.log("Registry implementation Before ", registryImplementation);
  console.log("registryV2.address ", registryV2.address);
  console.log("\n");
  if (getAddress(registryImplementation) != getAddress(registryV2.address)) {
    const pendingImplementation = await registryProxyInstance.pendingRegistryImplementation();
    if (getAddress(pendingImplementation) != getAddress(registryV2.address)) {
      console.log("\n");
      console.log("operator setting pending implementation...");
      console.log("\n");
      const setPendingImplementationTx = await registryProxyInstance
        .connect(operatorSigner)
        .setPendingImplementation(registryV2.address);
      await setPendingImplementationTx.wait(1);
    } else {
      console.log("Pending implementation is already set");
      console.log("\n");
    }
    console.log("governance upgrading Registry...");
    console.log("\n");
    const becomeTx = await registryV2Instance.connect(governanceSigner).become(registryProxyAddress);
    await becomeTx.wait(1);
    console.log("Registry implementation after ", await registryProxyInstance.registryImplementation());
    console.log("\n");
  }

  registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);

  // approve tokens and map to tokens hash
  const onlySetTokensHash = [];
  const approveTokenAndMapHash = [];
  const tokenHashes: string[] = await registryV2Instance.getTokenHashes();
  const usdcApproved = await registryV2Instance.isApprovedToken(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address);

  if (usdcApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash)) {
    console.log("only set USDC hash");
    console.log("\n");
    onlySetTokensHash.push([MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash, [MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address]]);
  }

  if (!usdcApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash)) {
    console.log("approve USDC and set hash");
    console.log("\n");
    approveTokenAndMapHash.push([
      MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash,
      [MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address],
    ]);
  }

  const wethApproved = await registryV2Instance.isApprovedToken(MULTI_CHAIN_VAULT_TOKENS[fork].WETH.address);

  if (wethApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash)) {
    console.log("only set WETH hash");
    console.log("\n");
    onlySetTokensHash.push([MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash, [MULTI_CHAIN_VAULT_TOKENS[fork].WETH.address]]);
  }

  if (!wethApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash)) {
    console.log("approve WETH and set hash");
    console.log("\n");
    approveTokenAndMapHash.push([
      MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash,
      [MULTI_CHAIN_VAULT_TOKENS[fork].WETH.address],
    ]);
  }

  if (approveTokenAndMapHash.length > 0) {
    console.log("approve token and map hash");
    console.log("\n");
    const approveTokenAndMapToTokensHashTx = await registryV2Instance
      .connect(operatorSigner)
      ["approveTokenAndMapToTokensHash((bytes32,address[])[])"](approveTokenAndMapHash);
    await approveTokenAndMapToTokensHashTx.wait(1);
  }

  if (onlySetTokensHash.length > 0) {
    console.log("operator mapping only tokenshash to tokens..", onlySetTokensHash);
    console.log("\n");
    const onlyMapToTokensHashTx = await registryV2Instance
      .connect(operatorSigner)
      ["setTokensHashToTokens((bytes32,address[])[])"](onlySetTokensHash);
    await onlyMapToTokensHashTx.wait(1);
  }
}

async function deployAndUpgradeRiskManager() {
  const registryProxyAddress: string = "0x99fa011e33a8c6196869dec7bc407e896ba67fe3";

  const riskManagerFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.RISK_MANAGER);
  const riskManagerV2 = await riskManagerFactory.deploy(registryProxyAddress);

  const riskManagerV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER, riskManagerV2.address);
  const riskManagerProxyAddress: string = "0x4379031f3191d89693bc8b6dac4d3d06466ea952";

  const riskManagerInstance = <RiskManagerProxy>(
    await ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER_PROXY, riskManagerProxyAddress)
  );

  const registryV2Instance = <Registry>await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const operatorAddress = await registryV2Instance.operator();
  const operatorSigner = await ethers.getSigner(operatorAddress);
  const governanceAddress = await registryV2Instance.governance();
  const governanceSigner = await ethers.getSigner(governanceAddress);

  const riskManagerImplementation = await riskManagerInstance.riskManagerImplementation();

  console.log("==RiskManager implementation==");
  console.log("\n");
  if (getAddress(riskManagerV2.address) != getAddress(riskManagerImplementation)) {
    const pendingImplementation = await riskManagerInstance.pendingRiskManagerImplementation();
    if (getAddress(pendingImplementation) != getAddress(riskManagerV2Instance.address)) {
      console.log("operator setting pending implementation...");
      console.log("\n");
      const setPendingImplementationTx = await riskManagerInstance
        .connect(operatorSigner)
        .setPendingImplementation(riskManagerV2.address);
      await setPendingImplementationTx.wait(1);
    } else {
      console.log("Pending implementation for risk manager is already set.");
      console.log("\n");
    }
    console.log("governance upgrading risk manager...");
    console.log("\n");
    const becomeTx = await riskManagerV2Instance.connect(governanceSigner).become(riskManagerProxyAddress);
    await becomeTx.wait(1);
    const riskManagerRegisteredInRegistry = await registryV2Instance.riskManager();
    if (getAddress(riskManagerRegisteredInRegistry) != getAddress(riskManagerInstance.address)) {
      console.log("operator registering upgraded RiskManager ...");
      console.log("\n");
      const setRiskManagerTx = await registryV2Instance.connect(operatorSigner).setRiskManager(riskManagerProxyAddress);
      await setRiskManagerTx.wait();
    } else {
      console.log("Risk manager is already registered.");
      console.log("\n");
    }
  } else {
    console.log("RiskManager is already upgraded");
    console.log("\n");
  }
}

async function deployStrategyProvider(): Promise<string> {
  const registryProxyAddress: string = "0x99fa011e33a8c6196869dec7bc407e896ba67fe3";

  const strategyProviderFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER);
  const strategyProviderV2 = await strategyProviderFactory.deploy(registryProxyAddress);

  const registryV2Instance = <Registry>await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const operatorAddress = await registryV2Instance.operator();
  const operatorSigner = await ethers.getSigner(operatorAddress);

  const oldStrategyProvider = await registryV2Instance.getStrategyProvider();

  console.log("==StrategyProvider registration==");
  console.log("\n");
  if (getAddress(oldStrategyProvider) !== getAddress(strategyProviderV2.address)) {
    console.log("operator registering StrategyProvider..");
    const setStrategyProviderTx = await registryV2Instance
      .connect(operatorSigner)
      .setStrategyProvider(strategyProviderV2.address);
    await setStrategyProviderTx.wait(1);
  } else {
    console.log("StrategyProvider already registered");
    console.log("\n");
  }
  return await registryV2Instance.getStrategyProvider();
}

async function approveAndMapLiquidityPoolToAdapter() {
  const registryProxyAddress = "0x99fa011e33a8c6196869dec7bc407e896ba67fe3";
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const curveSwapPoolAdapterFactory = await ethers.getContractFactory("CurveSwapPoolAdapter");
  const curveSwapPoolAdapter = await curveSwapPoolAdapterFactory.deploy(registryProxyAddress);
  const curveMetapoolSwapAdapterFactory = await ethers.getContractFactory("CurveMetapoolSwapAdapter");
  const curveMetaPoolSwapAdapter = await curveMetapoolSwapAdapterFactory.deploy(registryProxyAddress);
  const lidoAdapterFactory = await ethers.getContractFactory("LidoAdapter");
  const lidoAdapter = await lidoAdapterFactory.deploy(registryProxyAddress);
  const aaveV1AdapterAddress = "0x80647b9a016e197dc7adbf14cc2b21b58b830bcc";
  const aaveV2AdapterAddress = "0x962f0877c2706c513cdc82ec8ee7e1c29fbef5d0";
  const compoundAdapterAddress = "0x9680624ad6bf5a34ce496a483400585136c575a4";
  const convexFinanceAdapterAddress = "0xcb612cce8f0ccddfade6ce28774534292da2c970";
  const operatorAddress = await registryV2Instance.getOperator();
  const operatorSigner = await ethers.getSigner(operatorAddress);
  const riskOperatorAddress = await registryV2Instance.getRiskOperator();
  const riskOperatorSigner = await ethers.getSigner(riskOperatorAddress);

  // approve liquidity pools and map to adapter
  const poolsWithRatings: { [key: string]: { rate: number; adapter: string } } = {
    "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7": { rate: 80, adapter: curveSwapPoolAdapter.address }, // curve Pool for DAI/USDC/USDT
    "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022": { rate: 80, adapter: curveSwapPoolAdapter.address }, // curve ETH/stETH StableSwap
    "0x5a6A4D54456819380173272A5E8E9B9904BdF41B": { rate: 80, adapter: curveMetaPoolSwapAdapter.address }, // curve MIM Metapool
    "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B": { rate: 80, adapter: curveMetaPoolSwapAdapter.address }, // curve swap pool for FRAX3CRV
    "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84": { rate: 80, adapter: lidoAdapter.address }, // lido deposit Pool for stETH
    "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8": { rate: 90, adapter: aaveV1AdapterAddress }, // aave v1 lending pool address provider
    "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413": { rate: 90, adapter: aaveV2AdapterAddress }, // aave v2 lending pool address provider
    "0x39AA39c021dfbaE8faC545936693aC917d5E7563": { rate: 90, adapter: compoundAdapterAddress }, // compound usdc pool
    "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5": { rate: 90, adapter: compoundAdapterAddress }, // compound eth pool
    "0xabB54222c2b77158CC975a2b715a3d703c256F05": { rate: 80, adapter: convexFinanceAdapterAddress }, // convex pool cvxMIM-3LP3CRV-f
    "0xbE0F6478E0E4894CFb14f32855603A083A57c7dA": { rate: 80, adapter: convexFinanceAdapterAddress }, // convex pool for cvxFRAX3CRV-f
    "0x9518c9063eB0262D791f38d8d6Eb0aca33c63ed0": { rate: 80, adapter: convexFinanceAdapterAddress }, // convex pool for cvxsteCR:{rate:80, adapter:}
    "0x87650D7bbfC3A9F10587d7778206671719d9910D": { rate: 80, adapter: curveSwapPoolAdapter.address },
    "0x4f062658EaAF2C1ccf8C8e36D6824CDf41167956": { rate: 80, adapter: curveSwapPoolAdapter.address },
    "0x3eF6A01A0f81D6046290f3e2A8c5b843e738E604": { rate: 80, adapter: curveSwapPoolAdapter.address },
    "0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb": { rate: 80, adapter: curveSwapPoolAdapter.address },
    "0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1": { rate: 80, adapter: curveSwapPoolAdapter.address },
    "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171": { rate: 80, adapter: curveSwapPoolAdapter.address },
    "0x8474DdbE98F5aA3179B3B3F5942D724aFcdec9f6": { rate: 80, adapter: curveSwapPoolAdapter.address },
    "0xC18cC39da8b11dA8c3541C598eE022258F9744da": { rate: 80, adapter: curveSwapPoolAdapter.address },
    "0x8038C01A0390a8c547446a0b2c18fc9aEFEcc10c": { rate: 80, adapter: curveSwapPoolAdapter.address },
    "0x890f4e345B1dAED0367A877a1612f86A1f86985f": { rate: 80, adapter: curveSwapPoolAdapter.address },
    "0x42d7025938bEc20B69cBae5A77421082407f053A": { rate: 80, adapter: curveSwapPoolAdapter.address },
    "0x3689f325E88c2363274E5F3d44b6DaB8f9e1f524": { rate: 80, adapter: convexFinanceAdapterAddress }, // cvxusdc3CRV
  };

  const onlyMapPoolsToAdapters = [];
  const approveLiquidityPoolAndMap = [];
  const ratePools: [string, number][] = [];

  for (const pool of Object.keys(poolsWithRatings)) {
    const { rating, isLiquidityPool } = await registryV2Instance.getLiquidityPool(pool);
    const adapter = await registryV2Instance.liquidityPoolToAdapter(pool);
    if (!isLiquidityPool && getAddress(adapter) != getAddress(poolsWithRatings[pool].adapter)) {
      approveLiquidityPoolAndMap.push([pool, poolsWithRatings[pool].adapter]);
    }
    if (isLiquidityPool && getAddress(adapter) != getAddress(poolsWithRatings[pool].adapter)) {
      onlyMapPoolsToAdapters.push([pool, poolsWithRatings[pool].adapter]);
    }
    if (rating != poolsWithRatings[pool].rate) {
      ratePools.push([pool, poolsWithRatings[pool].rate]);
    }
  }

  console.log("==Approve liquidity pool and map to adapter==");
  if (approveLiquidityPoolAndMap.length > 0) {
    // approve liquidity pool and map adapter
    console.log(
      `operator approving and mapping ${approveLiquidityPoolAndMap.length} pools ...`,
      approveLiquidityPoolAndMap,
    );
    const approveLiquidityPoolAndMapAdapterTx = await registryV2Instance
      .connect(operatorSigner)
      ["approveLiquidityPoolAndMapToAdapter((address,address)[])"](approveLiquidityPoolAndMap);
    await approveLiquidityPoolAndMapAdapterTx.wait();
  } else {
    console.log("Already approved liquidity pool and map to adapter");
  }

  console.log("==Only map liquidity pool to adapter==");
  if (onlyMapPoolsToAdapters.length > 0) {
    // only map pool to adapter
    console.log(`operator only mapping ${onlyMapPoolsToAdapters.length} pools ...`, onlyMapPoolsToAdapters);
    const mapToAdapterTx = await registryV2Instance
      .connect(operatorSigner)
      ["setLiquidityPoolToAdapter((address,address)[])"](onlyMapPoolsToAdapters);
    await mapToAdapterTx.wait();
  } else {
    console.log("Already mapped to adapter");
  }

  console.log("==Only rate liquidity pool==");
  if (ratePools.length > 0) {
    // rate pools
    console.log(`risk operator rating ${ratePools.length} pools ...`, ratePools);
    const rateAdapterTx = await registryV2Instance
      .connect(riskOperatorSigner)
      ["rateLiquidityPool((address,uint8)[])"](ratePools);
    await rateAdapterTx.wait();
  } else {
    console.log("Already rate liquidity pool");
  }
}

async function configopWETHgrow(strategyProviderAddress: string) {
  const { BigNumber } = ethers;
  const registryProxyAddress = "0x99fa011e33a8c6196869dec7bc407e896ba67fe3";
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const opWETHgrowProxyAddress = "0xff2fbd9fbc6d03baa77cf97a3d5671bea183b9a8";

  const opWETHgrowInstance = await ethers.getContractAt("Vault", opWETHgrowProxyAddress);
  const financeOperatorSigner = await ethers.getSigner(await registryV2Instance.financeOperator());
  const operatorSigner = await ethers.getSigner(await registryV2Instance.operator());
  const governanceSigner = await ethers.getSigner(await registryV2Instance.governance());

  console.log("set risk profile code for opWETHgrow");
  console.log("\n");
  const expectedRiskProfileCode = BigNumber.from("1");
  const _vaultConfiguration_ = await opWETHgrowInstance.vaultConfiguration();
  if (expectedRiskProfileCode.eq(getRiskProfileCode(_vaultConfiguration_))) {
    console.log("risk profile code  is as expected");
    console.log("\n");
  } else {
    console.log("Governance setting risk profile code for opWETHgrow..");
    console.log("\n");
    const txn = await opWETHgrowInstance.connect(governanceSigner).setRiskProfileCode(expectedRiskProfileCode);
    await txn.wait(1);
  }

  console.log("vaultConfiguration for opWETHgrow");
  console.log("\n");
  const expectedConfig = BigNumber.from("2715643938564376714569528258641865758826842749497826340477583138757711757312");
  const _vaultConfiguration = await opWETHgrowInstance.vaultConfiguration();
  if (expectedConfig.eq(_vaultConfiguration)) {
    console.log("vaultConfiguration is as expected");
    console.log("\n");
  } else {
    console.log("Governance setting vault configuration for opWETHgrow..");
    console.log("\n");
    const tx1 = await opWETHgrowInstance.connect(governanceSigner).setVaultConfiguration(expectedConfig);
    await tx1.wait(1);
  }

  console.log("Operator setting UnderlyingTokensHash...");
  console.log("\n");

  const tokensHash = await opWETHgrowInstance.underlyingTokensHash();

  if (tokensHash != MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash) {
    console.log("setting tokenshash..");
    console.log("\n");
    const tx2 = await opWETHgrowInstance
      .connect(operatorSigner)
      .setUnderlyingTokensHash(MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash);
    await tx2.wait(1);
  } else {
    console.log("Tokenshash is upto date");
    console.log("\n");
  }

  console.log("Finance operator setting opWETHgrow config...");
  console.log("\n");
  const actualUserDepositCapUT = await opWETHgrowInstance.userDepositCapUT();
  const actualMinimumDepositValueUT = await opWETHgrowInstance.minimumDepositValueUT();
  const actualTotalValueLockedLimitUT = await opWETHgrowInstance.totalValueLockedLimitUT();

  const expectedUserDepositCapUT = BigNumber.from("5000000000000000000"); // 5 WETH user deposit cap
  const expectedMinimumDepositValueUT = BigNumber.from("250000000000000000"); // 0.25 WETH minimum deposit
  const expectedTotalValueLockedLimitUT = BigNumber.from("5000000000000000000000"); // 5000 WETH TVL limit

  console.log("opWETHgrow.setValueControlParams()");
  console.log("\n");
  if (
    expectedUserDepositCapUT.eq(actualUserDepositCapUT) &&
    expectedMinimumDepositValueUT.eq(actualMinimumDepositValueUT) &&
    expectedTotalValueLockedLimitUT.eq(actualTotalValueLockedLimitUT)
  ) {
    console.log("userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT is upto date on opWETHgrow");
    console.log("\n");
  } else {
    console.log("Updating userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT on opWETHgrow...");
    console.log("\n");
    const tx3 = await opWETHgrowInstance
      .connect(financeOperatorSigner)
      .setValueControlParams(expectedUserDepositCapUT, expectedMinimumDepositValueUT, expectedTotalValueLockedLimitUT);
    await tx3.wait(1);
  }

  console.log("unpause opWETHgrow");
  console.log("\n");
  const vaultConfiguration = await opWETHgrowInstance.vaultConfiguration();
  const unpause = getUnpause(vaultConfiguration);

  if (!unpause) {
    console.log("Governance unpausing opWETHgrow vault...");
    console.log("\n");
    const tx4 = await opWETHgrowInstance.connect(governanceSigner).setUnpaused(true);
    await tx4.wait();
  } else {
    console.log("opWETHgrow is already unpaused...");
    console.log("\n");
  }

  console.log("whitelisting for opWETHgrow");
  const expectedAccountsRoot = "0x62689e8751ba85bee0855c30d61d17345faa5b23e82626a83f8d63db50d67694";
  const actualAccountsRoot = await opWETHgrowInstance.whitelistedAccountsRoot();
  if (actualAccountsRoot != expectedAccountsRoot) {
    console.log("Governance setting whitelisted account root opWETHgrow vault...");
    console.log("\n");
    const tx5 = await opWETHgrowInstance.connect(governanceSigner).setWhitelistedAccountsRoot(expectedAccountsRoot);
    await tx5.wait(1);
  } else {
    console.log("whitelisted accounts root for opWETHgrow is as expected");
    console.log("\n");
  }

  const strategyProviderInstance = await ethers.getContractAt(
    ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER,
    strategyProviderAddress,
  );
  const strategyOperatorSigner = await ethers.getSigner(await registryV2Instance.strategyOperator());

  console.log("Operator setting best strategy for opWETHgrow...");
  console.log("\n");

  const currentBestStrategySteps = await strategyProviderInstance.getRpToTokenToBestStrategy(
    "1",
    MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash,
  );
  const currentBestStrategyHash = await opWETHgrowInstance.computeInvestStrategyHash(currentBestStrategySteps);
  const expectedStrategySteps =
    StrategiesByTokenByChain[fork].WETH["weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV"]
      .strategy;
  const expectedStrategyHash = await opWETHgrowInstance.computeInvestStrategyHash(
    expectedStrategySteps.map(x => ({
      pool: x.contract,
      outputToken: x.outputToken,
      isBorrow: x.isBorrow,
    })),
  );

  if (currentBestStrategyHash !== expectedStrategyHash) {
    console.log("Strategy operator setting best strategy..");
    console.log("\n");
    const tx6 = await strategyProviderInstance.connect(strategyOperatorSigner).setBestStrategy(
      "1",
      MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash,
      expectedStrategySteps.map(x => ({
        pool: x.contract,
        outputToken: x.outputToken,
        isBorrow: x.isBorrow,
      })),
    );
    await tx6.wait(1);
  } else {
    console.log("best strategy is upto date.");
    console.log("\n");
  }
  console.log("Next Best Strategy ", await opWETHgrowInstance.getNextBestInvestStrategy());
  console.log("\n");
}

async function configopUSDCgrow(strategyProviderAddress: string) {
  const { BigNumber } = ethers;
  const registryProxyAddress = "0x99fa011e33a8c6196869dec7bc407e896ba67fe3";
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const opUSDCgrowProxyAddress = "0x6d8bfdb4c4975bb086fc9027e48d5775f609ff88";

  const opUSDCgrowInstance = await ethers.getContractAt("Vault", opUSDCgrowProxyAddress);
  const financeOperatorSigner = await ethers.getSigner(await registryV2Instance.financeOperator());
  const operatorSigner = await ethers.getSigner(await registryV2Instance.operator());
  const governanceSigner = await ethers.getSigner(await registryV2Instance.governance());

  console.log("set risk profile code for opUSDCgrow");
  console.log("\n");
  const expectedRiskProfileCode = BigNumber.from("1");
  const _vaultConfiguration_ = await opUSDCgrowInstance.vaultConfiguration();
  if (expectedRiskProfileCode.eq(getRiskProfileCode(_vaultConfiguration_))) {
    console.log("risk profile code  is as expected");
    console.log("\n");
  } else {
    console.log("Governance setting risk profile code for opUSDCgrow..");
    console.log("\n");
    const tx1 = await opUSDCgrowInstance.connect(governanceSigner).setRiskProfileCode(expectedRiskProfileCode);
    await tx1.wait(1);
  }

  console.log("vaultConfiguration for opUSDCgrow");
  console.log("\n");
  const expectedConfig = BigNumber.from("2715643938564376714569528258641865758826842749497826340477583138757711757312");
  const _vaultConfiguration = await opUSDCgrowInstance.vaultConfiguration();
  if (expectedConfig.eq(_vaultConfiguration)) {
    console.log("vaultConfiguration is as expected");
    console.log("\n");
  } else {
    console.log("Governance setting vault configuration for opUSDCgrow..");
    console.log("\n");
    const tx2 = await opUSDCgrowInstance.connect(governanceSigner).setVaultConfiguration(expectedConfig);
    await tx2.wait(1);
  }

  console.log("Operator setting UnderlyingTokensHash...");
  console.log("\n");

  const tokensHash = await opUSDCgrowInstance.underlyingTokensHash();

  if (tokensHash != MULTI_CHAIN_VAULT_TOKENS["mainnet"].USDC.hash) {
    console.log("setting tokenshash..");
    console.log("\n");
    const tx3 = await opUSDCgrowInstance
      .connect(operatorSigner)
      .setUnderlyingTokensHash(MULTI_CHAIN_VAULT_TOKENS["mainnet"].USDC.hash);
    await tx3.wait(1);
  } else {
    console.log("Tokenshash is upto date");
    console.log("\n");
  }

  console.log("Finance operator setting opUSDCgrow config...");
  console.log("\n");

  const actualUserDepositCapUT = await opUSDCgrowInstance.userDepositCapUT();
  const actualMinimumDepositValueUT = await opUSDCgrowInstance.minimumDepositValueUT();
  const actualTotalValueLockedLimitUT = await opUSDCgrowInstance.totalValueLockedLimitUT();

  const expectedUserDepositCapUT = BigNumber.from("100000000000"); // 100,000 USDC
  const expectedMinimumDepositValueUT = BigNumber.from("1000000000"); // 1000 USDC
  const expectedTotalValueLockedLimitUT = BigNumber.from("10000000000000"); // 10,000,000

  console.log("opUSDCgrow.setValueControlParams()");
  console.log("\n");
  if (
    expectedUserDepositCapUT.eq(actualUserDepositCapUT) &&
    expectedMinimumDepositValueUT.eq(actualMinimumDepositValueUT) &&
    expectedTotalValueLockedLimitUT.eq(actualTotalValueLockedLimitUT)
  ) {
    console.log("userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT is upto date on opUSDCgrow");
    console.log("\n");
  } else {
    console.log("Updating userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT on opUSDCgrow...");
    console.log("\n");
    const tx4 = await opUSDCgrowInstance
      .connect(financeOperatorSigner)
      .setValueControlParams(expectedUserDepositCapUT, expectedMinimumDepositValueUT, expectedTotalValueLockedLimitUT);
    await tx4.wait(1);
  }

  console.log("unpause opUSDCgrow");
  console.log("\n");
  const vaultConfiguration = await opUSDCgrowInstance.vaultConfiguration();
  const unpause = getUnpause(vaultConfiguration);

  if (!unpause) {
    console.log("Governance unpausing opUSDCgrow vault...");
    console.log("\n");
    const tx5 = await opUSDCgrowInstance.connect(governanceSigner).setUnpaused(true);
    await tx5.wait(1);
  } else {
    console.log("opUSDCgrow is already unpaused...");
    console.log("\n");
  }

  console.log("whitelisting for opUSDCgrow");
  console.log("\n");
  const expectedAccountsRoot = "0x62689e8751ba85bee0855c30d61d17345faa5b23e82626a83f8d63db50d67694";
  const actualAccountsRoot = await opUSDCgrowInstance.whitelistedAccountsRoot();
  if (actualAccountsRoot != expectedAccountsRoot) {
    console.log("Governance setting whitelisted account root opUSDCgrow vault...");
    console.log("\n");
    const tx6 = await opUSDCgrowInstance.connect(governanceSigner).setWhitelistedAccountsRoot(expectedAccountsRoot);
    await tx6.wait(1);
  } else {
    console.log("whitelisted accounts root for opUSDCgrow is as expected");
    console.log("\n");
  }

  const strategyProviderInstance = await ethers.getContractAt(
    ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER,
    strategyProviderAddress,
  );
  const strategyOperatorSigner = await ethers.getSigner(await registryV2Instance.strategyOperator());

  console.log("Operator setting best strategy for opUSDCgrow...");
  console.log("\n");

  const currentBestStrategySteps = await strategyProviderInstance.getRpToTokenToBestStrategy(
    "1",
    MULTI_CHAIN_VAULT_TOKENS["mainnet"].USDC.hash,
  );
  const currentBestStrategyHash = await opUSDCgrowInstance.computeInvestStrategyHash(currentBestStrategySteps);
  const expectedStrategySteps =
    StrategiesByTokenByChain["mainnet"].USDC[
      "USDC-DEPOSIT-Curve_3Crv-DEPOSIT-Curve_USDN-3Crv-DEPOSIT-Convex_CurveUsdn-3Crv"
    ].strategy;
  const expectedStrategyHash = await opUSDCgrowInstance.computeInvestStrategyHash(
    expectedStrategySteps.map(x => ({
      pool: x.contract,
      outputToken: x.outputToken,
      isBorrow: x.isBorrow,
    })),
  );

  if (currentBestStrategyHash !== expectedStrategyHash) {
    console.log("Strategy operator setting best strategy..");
    console.log("\n");
    const tx7 = await strategyProviderInstance.connect(strategyOperatorSigner).setBestStrategy(
      "1",
      MULTI_CHAIN_VAULT_TOKENS["mainnet"].USDC.hash,
      expectedStrategySteps.map(x => ({
        pool: x.contract,
        outputToken: x.outputToken,
        isBorrow: x.isBorrow,
      })),
    );
    await tx7.wait(1);
  } else {
    console.log("best strategy is upto date.");
    console.log("\n");
  }
  console.log("Next Best Strategy ", await opUSDCgrowInstance.getNextBestInvestStrategy());
}
