import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import BN from "bignumber.js";
import { BigNumber } from "ethers";
import { getAddress } from "ethers/lib/utils";
import { assertVaultConfiguration, Signers, to_10powNumber_BN } from "../../../../helpers/utils";
import {
  ERC20,
  ERC20Permit,
  ERC20Permit__factory,
  InitializableImmutableAdminUpgradeabilityProxy,
  Registry,
  RegistryProxy,
  StrategyProvider,
  Vault,
} from "../../../../typechain";
import { opUSDCearn, opWETHearn, RegistryProxy as RegistryProxyAddress } from "../../_deployments/mainnet.json";
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
import { wethRebalance } from "./wethRebalance";
import { deployAndUpgradeUSDC } from "./deployAndUpgradeUSDC";
import { deployAndUpgradeWETH } from "./deployAndUpgradeWETH";
import { deployAndUpgradeRegistry } from "./deployAndUpgradeRegistry";
import { deployAndUpgradeRiskManager } from "./deployAndUpgradeRiskManager";
import { deployStrategyProvider } from "./deployStrategyProvider";
import { approveAndMapLiquidityPoolToAdapter } from "./approveAndMapLiquidityPoolToAdapter";
import { configopUSDCearn } from "./configopUSDCearn";
import { configopWETHearn } from "./configopWETHearn";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;
const OPUSDCEARN_VAULT_PROXY_ADDRESS = opUSDCearn.VaultProxy;
const OPWETHEARN_VAULT_PROXY_ADDRESS = opWETHearn.VaultProxy;
const REGISTRY_PROXY_ADDRESS = RegistryProxyAddress;

// ================================================================
const mim =
  StrategiesByTokenByChain[fork]["Earn"].USDC[
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
  StrategiesByTokenByChain[fork]["Earn"].WETH[
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
  StrategiesByTokenByChain[fork]["Earn"].USDC[
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
  StrategiesByTokenByChain[fork]["Earn"].USDC[
    "usdc-DEPOSIT-Curve_3Crv-DEPOSIT-Curve_USDN-3Crv-DEPOSIT-Convex_CurveUsdn-3Crv"
  ].strategy;
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
    this.usdc = <ERC20Permit>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address)
    );
    await setTokenBalanceInStorage(this.usdc, this.signers.admin.address, "20000");
    // ==============================================================
    await usdcRebalance();
    // ====================================================

    this.opUSDCearnProxy = <InitializableImmutableAdminUpgradeabilityProxy>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, OPUSDCEARN_VAULT_PROXY_ADDRESS)
    );
    this.opUSDCearnOld = await ethers.getContractAt(oldAbis.oldVault, OPUSDCEARN_VAULT_PROXY_ADDRESS);
    this.opUSDCearnGasOwedToOperator = await this.opUSDCearnOld.gasOwedToOperator();
    this.opUSDCearnDepositQueue = await this.opUSDCearnOld.depositQueue();
    this.opUSDCearnPricePerShareWrite = await this.opUSDCearnOld.pricePerShareWrite();

    const opUSDCearnAdminAddress = await this.opUSDCearnProxy.admin();
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [opUSDCearnAdminAddress],
    });
    // ====================================================
    await wethRebalance();
    this.opWETHearnProxy = <InitializableImmutableAdminUpgradeabilityProxy>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, OPWETHEARN_VAULT_PROXY_ADDRESS)
    );
    this.opWETHearnOld = await ethers.getContractAt(oldAbis.oldVault, OPWETHEARN_VAULT_PROXY_ADDRESS);
    this.opWETHearnGasOwedToOperator = await this.opWETHearnOld.gasOwedToOperator();
    this.opWETHearnDepositQueue = await this.opWETHearnOld.depositQueue();
    this.opWETHearnPricePerShareWrite = await this.opWETHearnOld.pricePerShareWrite();

    const opWETHearnAdminAddress = await this.opWETHearnProxy.admin();
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [opWETHearnAdminAddress],
    });
    // ====================================================
    await deployAndUpgradeUSDC();
    this.opUSDCearn = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, this.opUSDCearnProxy.address);
    // ====================================================
    await deployAndUpgradeWETH();
    this.opWETHearn = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, this.opWETHearnProxy.address);
    // =======================================================
    await deployAndUpgradeRegistry(fork);
    await deployAndUpgradeRiskManager();
    const strategyProviderAddress = await deployStrategyProvider();
    this.strategyProvider = <StrategyProvider>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER, strategyProviderAddress)
    );
  });

  it("default values for old opUSDCearn should be as expected", async function () {
    expect(await this.opUSDCearn.opTOKEN_REVISION()).to.eq("0x4");
    expect(await this.opUSDCearn.registryContract()).to.eq(getAddress(this.registry.address));
    expect(await this.opUSDCearn.whitelistedAccountsRoot()).to.eq(
      "0x0000000000000000000000000000000000000000000000000000000000000001",
    );
    expect(await this.opUSDCearn.underlyingToken()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address);
    expect(await this.opUSDCearn.underlyingTokensHash()).to.eq(ethers.constants.HashZero);
    expect(await this.opUSDCearn.name()).to.eq("op USD Coin Growth");
    expect(await this.opUSDCearn.symbol()).to.eq("opUSDCgrow");
    expect(await this.opUSDCearn.decimals()).to.eq(6);
    expect(await this.opUSDCearn.vaultConfiguration()).to.eq("100");
    expect(await this.opUSDCearn.userDepositCapUT()).to.eq(this.opUSDCearnGasOwedToOperator); //gasOwedToOperator
    expect(await this.opUSDCearn.minimumDepositValueUT()).to.eq(this.opUSDCearnDepositQueue); //depositQueue
    expect(await this.opUSDCearn.totalValueLockedLimitUT()).to.eq(this.opUSDCearnPricePerShareWrite); //pricePerShareWrite
  });

  it("default values for old opWETHearn should be as expected", async function () {
    expect(await this.opWETHearn.opTOKEN_REVISION()).to.eq("0x4");
    expect(await this.opWETHearn.registryContract()).to.eq(getAddress(this.registry.address));
    expect(await this.opWETHearn.whitelistedAccountsRoot()).to.eq(
      "0x0000000000000000000000000000000000000000000000000000000000000001",
    );
    expect(await this.opWETHearn.underlyingToken()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].WETH.address);
    expect(await this.opWETHearn.underlyingTokensHash()).to.eq(ethers.constants.HashZero);
    expect(await this.opWETHearn.name()).to.eq("op Wrapped Ether Growth");
    expect(await this.opWETHearn.symbol()).to.eq("opWETHgrow");
    expect(await this.opWETHearn.decimals()).to.eq(18);
    expect(await this.opWETHearn.vaultConfiguration()).to.eq("100");
    expect(await this.opWETHearn.userDepositCapUT()).to.eq(this.opWETHearnGasOwedToOperator); //gasOwedToOperator
    expect(await this.opWETHearn.minimumDepositValueUT()).to.eq(this.opWETHearnDepositQueue); //depositQueue
    expect(await this.opWETHearn.totalValueLockedLimitUT()).to.eq(this.opWETHearnPricePerShareWrite); //pricePerShareWrite
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
  it("setVaultConfiguration() for opUSDCearn new", async function () {
    await this.opUSDCearn
      .connect(this.signers.governance)
      .setVaultConfiguration("1811018241397843937822879938261491478723170994297509433919320763695890432000");
    const vaultConfigurationV2 = await this.opUSDCearn.vaultConfiguration();
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

  it("setVaultConfiguration() for opWETHearn new", async function () {
    await this.opWETHearn
      .connect(this.signers.governance)
      .setVaultConfiguration("1811018241397843937822879938261491478723170994297509433919320763695890432000");
    const vaultConfigurationV2 = await this.opWETHearn.vaultConfiguration();
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
    expect(await this.opUSDCearn.investStrategyHash()).to.eq(ethers.constants.HashZero);
    expect((await this.opUSDCearn.getInvestStrategySteps()).length).to.eq(0);
  });

  it("null strategy for WETH vault", async function () {
    expect(await this.opWETHearn.investStrategyHash()).to.eq(ethers.constants.HashZero);
    expect((await this.opWETHearn.getInvestStrategySteps()).length).to.eq(0);
  });

  describe("test frax, usdn3Crv and steth strategy", async function () {
    before(async function () {
      this.usdc = <ERC20Permit>(
        await ethers.getContractAt(ERC20Permit__factory.abi, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address)
      );
      this.weth = <ERC20>(
        await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, MULTI_CHAIN_VAULT_TOKENS[fork].WETH.address)
      );

      await this.registry.connect(this.signers.governance).setOperator(this.signers.admin.address);
      await this.registry.connect(this.signers.governance).setRiskOperator(this.signers.admin.address);
      this.signers.operator = await ethers.getSigner(this.signers.admin.address);
      this.signers.riskOperator = await ethers.getSigner(this.signers.admin.address);
      await approveAndMapLiquidityPoolToAdapter();
      await configopUSDCearn(this.strategyProvider.address, fork);
      await configopWETHearn(this.strategyProvider.address, fork);
      expect(await this.opUSDCearn.getNextBestInvestStrategy()).to.deep.eq(
        cvxusdn3CrvStrategySteps.map(v => Object.values(v)),
      );
      expect(await this.opUSDCearn.underlyingTokensHash()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash);
      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
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
      expect(await this.opUSDCearn.userDepositCapUT()).to.eq("100000000000");
      expect(await this.opUSDCearn.minimumDepositValueUT()).to.eq("1000000000");
      expect(await this.opUSDCearn.totalValueLockedLimitUT()).to.eq("10000000000000");

      // await deployments.fixture("ConfigopWETHearn");
      // await deployments.fixture("SetBestStrategyopWETHearn");
      expect(await this.opWETHearn.getNextBestInvestStrategy()).to.deep.eq(
        convexSteCRVStrategySteps.map(v => Object.values(v)),
      );
      expect(await this.opWETHearn.underlyingTokensHash()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash);
      assertVaultConfiguration(
        await this.opWETHearn.vaultConfiguration(),
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
      expect(await this.opWETHearn.userDepositCapUT()).to.eq("5000000000000000000");
      expect(await this.opWETHearn.minimumDepositValueUT()).to.eq("250000000000000000");
      expect(await this.opWETHearn.totalValueLockedLimitUT()).to.eq("5000000000000000000000");
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

    it("lp token balance should be as expected after rebalance of opUSDCearn to usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-CurveSwapPool-MIM-3LP3CRV-f-DEPOSIT-Convex-cvxMIM-3LP3CRV-f", async function () {
      expect(await this.opUSDCearn.getNextBestInvestStrategy()).to.deep.eq(
        cvxusdn3CrvStrategySteps.map(v => Object.values(v)),
      );
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash, mimStrategySteps);
      expect(await this.opUSDCearn.getNextBestInvestStrategy()).to.deep.eq(mimStrategySteps.map(v => Object.values(v)));
      await this.opUSDCearn.rebalance();
      // assert invest strategy hash
      expect(await this.opUSDCearn.getInvestStrategySteps()).to.deep.eq(mimStrategySteps.map(v => Object.values(v)));
      expect(await this.opUSDCearn.investStrategyHash()).to.eq(
        generateStrategyHashV2(mimStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash),
      );
      expect(await this.usdc.balanceOf(this.opUSDCearn.address)).to.eq("0");
      const expectedLPTokenBalance = await getLastStrategyStepBalanceLP(
        mimStrategySteps as StrategyStepType[],
        this.registry,
        this.opUSDCearn,
        this.usdc,
      );
      const actualLPTokenBalance = await this.opUSDCearn.getLastStrategyStepBalanceLP(mimStrategySteps);
      expect(actualLPTokenBalance).to.eq(expectedLPTokenBalance);
    });

    it("lp token balance should be as expected after rebalance of opWETHearn to weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV", async function () {
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash, convexSteCRVStrategySteps);
      expect(await this.opWETHearn.getNextBestInvestStrategy()).to.deep.eq(
        convexSteCRVStrategySteps.map(v => Object.values(v)),
      );
      const _beforeRebalance = await this.weth.balanceOf(this.opWETHearn.address);
      await this.opWETHearn.rebalance();
      const _afterRebalance = await this.weth.balanceOf(this.opWETHearn.address);
      expect(_beforeRebalance).gt(_afterRebalance);
      expect(await this.opWETHearn.getInvestStrategySteps()).to.deep.eq(
        convexSteCRVStrategySteps.map(v => Object.values(v)),
      );
      expect(await this.opWETHearn.investStrategyHash()).to.eq(
        generateStrategyHashV2(convexSteCRVStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash),
      );
      expect(await this.weth.balanceOf(this.opWETHearn.address)).to.eq("0");
      const expectedLPTokenBalance = await getLastStrategyStepBalanceLP(
        convexSteCRVStrategySteps as StrategyStepType[],
        this.registry,
        this.opWETHearn,
        this.weth,
      );
      const actualLPTokenBalance = await this.opWETHearn.getLastStrategyStepBalanceLP(convexSteCRVStrategySteps);
      expect(actualLPTokenBalance).to.eq(expectedLPTokenBalance);
      expect(expectedLPTokenBalance).to.gt("0");
    });

    it("underlying token balance of opUSDCearn should be expected after pausing", async function () {
      const underlyingTokenBalanceBefore = await this.usdc.balanceOf(this.opUSDCearn.address);
      await this.opUSDCearn.connect(this.signers.governance).setUnpaused(false);
      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
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
      expect((await this.opUSDCearn.getInvestStrategySteps()).length).to.eq(0);
      expect(await this.opUSDCearn.investStrategyHash()).to.eq(ethers.constants.HashZero);
      const underlyingTokenBalanceAfter = await this.usdc.balanceOf(this.opUSDCearn.address);
      expect(underlyingTokenBalanceAfter).gt(underlyingTokenBalanceBefore);
      const lpTokenBalance = await this.opUSDCearn.getLastStrategyStepBalanceLP(mimStrategySteps);
      expect(lpTokenBalance).to.eq("0");
      expect(await this.opUSDCearn.investStrategyHash()).to.eq(ethers.constants.HashZero);
    });

    it("underlying token balance of opWETHearn should be expected after pausing", async function () {
      const underlyingTokenBalanceBefore = await this.weth.balanceOf(this.opWETHearn.address);
      await this.opWETHearn.connect(this.signers.governance).setUnpaused(false);
      assertVaultConfiguration(
        await this.opWETHearn.vaultConfiguration(),
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
      expect((await this.opWETHearn.getInvestStrategySteps()).length).to.eq(0);
      expect(await this.opWETHearn.investStrategyHash()).to.eq(ethers.constants.HashZero);
      const underlyingTokenBalanceAfter = await this.weth.balanceOf(this.opWETHearn.address);
      expect(underlyingTokenBalanceAfter).gt(underlyingTokenBalanceBefore);
      const lpTokenBalance = await this.opWETHearn.getLastStrategyStepBalanceLP(mimStrategySteps);
      expect(lpTokenBalance).to.eq("0");
      expect(await this.opWETHearn.investStrategyHash()).to.eq(ethers.constants.HashZero);
    });

    it("unpause opUSDCearn and rebalance to cvxFRAX3CRV", async function () {
      const _beforeRebalance = await this.usdc.balanceOf(this.opUSDCearn.address);
      await this.opUSDCearn.connect(this.signers.governance).setUnpaused(true);
      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
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
        StrategiesByTokenByChain[fork]["Earn"].USDC[
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
      await this.opUSDCearn.rebalance();
      expect(await this.opUSDCearn.getInvestStrategySteps()).to.deep.eq(
        cvxFRAX3CRVStrategySteps.map(v => Object.values(v)),
      );
      expect(await this.opUSDCearn.investStrategyHash()).to.eq(
        generateStrategyHashV2(cvxFRAX3CRVStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash),
      );
      const _afterRebalance = await this.usdc.balanceOf(this.opUSDCearn.address);
      expect(_beforeRebalance).gt(_afterRebalance);
      expect(await this.usdc.balanceOf(this.opUSDCearn.address)).to.eq("0");
      const expectedLPTokenBalance = await getLastStrategyStepBalanceLP(
        cvxFRAX3CRVStrategySteps as StrategyStepType[],
        this.registry,
        this.opUSDCearn,
        this.usdc,
      );
      const actualLPTokenBalance = await this.opUSDCearn.getLastStrategyStepBalanceLP(cvxFRAX3CRVStrategySteps);
      expect(actualLPTokenBalance).to.eq(expectedLPTokenBalance);
      expect(expectedLPTokenBalance).to.gt("0");
    });

    it("opWETHearn unpause and rebalance to weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV", async function () {
      await this.opWETHearn.connect(this.signers.governance).setUnpaused(true);
      assertVaultConfiguration(
        await this.opWETHearn.vaultConfiguration(),
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
      const _beforeRebalance = await this.weth.balanceOf(this.opWETHearn.address);
      await this.opWETHearn.rebalance();
      const _afterRebalance = await this.weth.balanceOf(this.opWETHearn.address);
      expect(_beforeRebalance).gt(_afterRebalance);
      expect(await this.opWETHearn.getInvestStrategySteps()).to.deep.eq(
        convexSteCRVStrategySteps.map(v => Object.values(v)),
      );
      expect(await this.opWETHearn.investStrategyHash()).to.eq(
        generateStrategyHashV2(convexSteCRVStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash),
      );
    });

    it("alice deposit some to opWETHearn, calls vault deposit", async function () {
      const _userDepositWETH = BigNumber.from("250000000000000000");
      await setTokenBalanceInStorage(
        this.weth,
        this.signers.alice.address,
        new BN(_userDepositWETH.toString()).div(new BN(to_10powNumber_BN("18").toString())).toString(),
      );
      await this.weth.connect(this.signers.alice).approve(this.opWETHearn.address, _userDepositWETH);
      const _balanceInopWETHearnUT = await this.weth.balanceOf(this.opWETHearn.address);
      const _oraStratValueUT = await getOraValueUT(
        convexSteCRVStrategySteps as StrategyStepType[],
        this.registry,
        this.opWETHearn,
        this.weth,
      );
      const totalSupply = await this.opWETHearn.totalSupply();
      const _expectedShares = _userDepositWETH.mul(totalSupply).div(_balanceInopWETHearnUT.add(_oraStratValueUT));
      const _expectedTotalSupply = totalSupply.add(_expectedShares);
      const _userBalanceBeforeVT = await this.opWETHearn.balanceOf(this.signers.alice.address);
      await this.opWETHearn
        .connect(this.signers.alice)
        .userDepositVault(this.signers.alice.address, _userDepositWETH, "0x", this._aliceMerkleProof, []);
      const _balanceBeforeDeposit = await this.weth.balanceOf(this.opWETHearn.address);
      await this.opWETHearn.vaultDepositAllToStrategy();
      const _balanceAfterDeposit = await this.weth.balanceOf(this.opWETHearn.address);
      const _userBalanceAfterVT = await this.opWETHearn.balanceOf(this.signers.alice.address);
      expect(_balanceBeforeDeposit).gt(_balanceAfterDeposit);
      const _actualShares = _userBalanceAfterVT.sub(_userBalanceBeforeVT);
      expect(_actualShares).to.eq(_expectedShares);
      expect(await this.opWETHearn.totalSupply()).to.eq(_expectedTotalSupply);
    });
    it("alice withdraw some to opWETHearn", async function () {
      const _userWithdrawVT = (await this.opWETHearn.balanceOf(this.signers.alice.address)).div(2);
      const _totalSupply = await this.opWETHearn.totalSupply();
      const _expectedTotalSupply = _totalSupply.sub(_userWithdrawVT);
      const _balanceInopWETHearnUT = await this.weth.balanceOf(this.opWETHearn.address);
      const _oraStratValueUT = await getOraValueUT(
        convexSteCRVStrategySteps as StrategyStepType[],
        this.registry,
        this.opWETHearn,
        this.weth,
      );
      const expectedUT = _userWithdrawVT.mul(_balanceInopWETHearnUT.add(_oraStratValueUT)).div(_totalSupply);
      const _balanceBefore = await this.weth.balanceOf(this.signers.alice.address);
      await this.opWETHearn
        .connect(this.signers.alice)
        .userWithdrawVault(this.signers.alice.address, _userWithdrawVT, this._aliceMerkleProof, []);
      const _balanceAfter = await this.weth.balanceOf(this.signers.alice.address);
      expect(_balanceAfter.sub(_balanceBefore)).gte(expectedUT.sub(expectedUT.mul(7).div(100)));
      expect(await this.opWETHearn.totalSupply()).to.eq(_expectedTotalSupply);
    });
    it("bob deposit some to opUSDCearn, calls vault deposit", async function () {
      const _userDepositUSDC = BigNumber.from("2500000000");
      await setTokenBalanceInStorage(
        this.usdc,
        this.signers.bob.address,
        new BN(_userDepositUSDC.toString()).div(new BN(to_10powNumber_BN("6").toString())).toString(),
      );
      const _balanceInopUSDCearnUT = await this.usdc.balanceOf(this.opUSDCearn.address);
      const _oraStratValueUT = await getOraValueUT(
        cvxFRAX3CRVStrategySteps as StrategyStepType[],
        this.registry,
        this.opUSDCearn,
        this.usdc,
      );
      const totalSupply = await this.opUSDCearn.totalSupply();
      const _expectedShares = _userDepositUSDC.mul(totalSupply).div(_balanceInopUSDCearnUT.add(_oraStratValueUT));
      const _expectedTotalSupply = totalSupply.add(_expectedShares);
      const _userBalanceBeforeVT = await this.opUSDCearn.balanceOf(this.signers.bob.address);
      await this.usdc.connect(this.signers.bob).approve(this.opUSDCearn.address, _userDepositUSDC);
      await this.opUSDCearn
        .connect(this.signers.bob)
        .userDepositVault(this.signers.bob.address, _userDepositUSDC, "0x", this._bobMerkleProof, []);
      const _balanceBeforeDeposit = await this.usdc.balanceOf(this.opUSDCearn.address);
      await this.opUSDCearn.vaultDepositAllToStrategy();
      const _balanceAfterDeposit = await this.usdc.balanceOf(this.opUSDCearn.address);
      const _userBalanceAfterVT = await this.opUSDCearn.balanceOf(this.signers.bob.address);
      expect(_balanceBeforeDeposit).gt(_balanceAfterDeposit);
      const _actualShares = _userBalanceAfterVT.sub(_userBalanceBeforeVT);
      expect(_actualShares).to.eq(_expectedShares);
      expect(await this.opUSDCearn.totalSupply()).to.eq(_expectedTotalSupply);
    });
    it("bob withdraw some to opUSDCearn", async function () {
      const _userWithdrawVT = (await this.opUSDCearn.balanceOf(this.signers.bob.address)).div(2);
      const _totalSupply = await this.opUSDCearn.totalSupply();
      const _expectedTotalSupply = _totalSupply.sub(_userWithdrawVT);
      const _balanceInopWETHearnUT = await this.usdc.balanceOf(this.opUSDCearn.address);
      const _oraStratValueUT = await getOraValueUT(
        cvxFRAX3CRVStrategySteps as StrategyStepType[],
        this.registry,
        this.opUSDCearn,
        this.usdc,
      );
      const expectedUT = _userWithdrawVT.mul(_balanceInopWETHearnUT.add(_oraStratValueUT)).div(_totalSupply);
      const _balanceBefore = await this.usdc.balanceOf(this.signers.bob.address);
      await this.opUSDCearn
        .connect(this.signers.bob)
        .userWithdrawVault(this.signers.bob.address, _userWithdrawVT, this._bobMerkleProof, []);
      const _balanceAfter = await this.usdc.balanceOf(this.signers.bob.address);
      expect(_balanceAfter.sub(_balanceBefore)).to.gte(expectedUT.sub(expectedUT.mul(3).div(1000)));
      expect(await this.opUSDCearn.totalSupply()).to.eq(_expectedTotalSupply);
    });
    it("rebalance opUSDCearn to mim", async function () {
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash, mimStrategySteps);
      await this.opUSDCearn.rebalance();
      // assert invest strategy hash
      expect(await this.opUSDCearn.getInvestStrategySteps()).to.deep.eq(mimStrategySteps.map(v => Object.values(v)));
      expect(await this.opUSDCearn.investStrategyHash()).to.eq(
        generateStrategyHashV2(mimStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash),
      );
      expect(await this.usdc.balanceOf(this.opUSDCearn.address)).to.eq("0");
      const expectedLPTokenBalance = await getLastStrategyStepBalanceLP(
        mimStrategySteps as StrategyStepType[],
        this.registry,
        this.opUSDCearn,
        this.usdc,
      );
      const actualLPTokenBalance = await this.opUSDCearn.getLastStrategyStepBalanceLP(mimStrategySteps);
      expect(actualLPTokenBalance).to.eq(expectedLPTokenBalance);
    });
    it("fail - opUSDCearn.userDepositVault, MINIMUM_USER_DEPOSIT_VALUE_UT ", async function () {
      const _minimumUserpositUT = await this.opUSDCearn.minimumDepositValueUT();
      const _depositUSDC = _minimumUserpositUT.div("2");
      await setTokenBalanceInStorage(
        this.usdc,
        this.signers.alice.address,
        _depositUSDC.div(to_10powNumber_BN("6")).toString(),
      );
      await this.usdc.connect(this.signers.alice).approve(this.opUSDCearn.address, _depositUSDC);
      await expect(
        this.opUSDCearn
          .connect(this.signers.alice)
          .userDepositVault(this.signers.alice.address, _depositUSDC, "0x", this._aliceMerkleProof, []),
      ).to.revertedWith("10");
    });
    it("fail - opWETHearn.userDepositVault, MINIMUM_USER_DEPOSIT_VALUE_UT", async function () {
      const _minimumUserdepositUT = await this.opWETHearn.minimumDepositValueUT();
      const _depositWETH = _minimumUserdepositUT.div("2");
      await setTokenBalanceInStorage(
        this.weth,
        this.signers.bob.address,
        new BN(_depositWETH.toString()).div(new BN(to_10powNumber_BN("18").toString())).toString(),
      );
      await this.weth.connect(this.signers.bob).approve(this.opWETHearn.address, _depositWETH);
      await expect(
        this.opWETHearn
          .connect(this.signers.bob)
          .userDepositVault(this.signers.bob.address, _depositWETH, "0x", this._bobMerkleProof, []),
      ).to.revertedWith("10");
    });
    it("fail - opUSDCearn.userDepositVault, USER_DEPOSIT_CAP_UT", async function () {
      const _balanceUSDC = await this.usdc.balanceOf(this.signers.alice.address);
      const _totalDeposits = await this.opUSDCearn.totalDeposits(this.signers.alice.address);
      const _userDepositCap = await this.opUSDCearn.userDepositCapUT();
      const _fundAmountUSDC = _userDepositCap.sub(_totalDeposits).sub(_balanceUSDC).add("1000000000");
      await setTokenBalanceInStorage(
        this.usdc,
        this.signers.alice.address,
        new BN(_fundAmountUSDC.toString()).div(new BN(to_10powNumber_BN("6").toString())).toString(),
      );
      const _depositUSDC = await this.usdc.balanceOf(this.signers.alice.address);
      await this.usdc.connect(this.signers.alice).approve(this.opUSDCearn.address, _depositUSDC);
      await expect(
        this.opUSDCearn
          .connect(this.signers.alice)
          .userDepositVault(this.signers.alice.address, _depositUSDC, "0x", this._aliceMerkleProof, []),
      ).to.revertedWith("12");
    });
    it("fail - opWETHearn.userDepositVault, USER_DEPOSIT_CAP_UT", async function () {
      const _userDepositCap = await this.opWETHearn.userDepositCapUT();
      const _fundAmountWETH = _userDepositCap.add("10000000000000");
      await setTokenBalanceInStorage(
        this.weth,
        this.signers.bob.address,
        new BN(_fundAmountWETH.toString()).div(new BN(to_10powNumber_BN("18").toString())).toString(),
      );
      const _depositWETH = await this.weth.balanceOf(this.signers.bob.address);
      await this.weth.connect(this.signers.bob).approve(this.opWETHearn.address, _depositWETH);
      await expect(
        this.opWETHearn
          .connect(this.signers.bob)
          .userDepositVault(this.signers.bob.address, _depositWETH, "0x", this._bobMerkleProof, []),
      ).to.revertedWith("12");
    });
    it("fail - opWETHearn.userDepositVault, TOTAL_VALUE_LOCKED_LIMIT_UT", async function () {
      await this.opWETHearn.connect(this.signers.financeOperator).setValueControlParams(
        "100000000000000000000000", // 1 WETH user deposit cap
        "250000000000000000", // 0.25 WETH minimum deposit
        "0", // 0 WETH TVL
      );
      const _depositWETH = await this.weth.balanceOf(this.signers.bob.address);
      await expect(
        this.opWETHearn
          .connect(this.signers.bob)
          .userDepositVault(this.signers.bob.address, _depositWETH, "0x", this._bobMerkleProof, []),
      ).to.revertedWith("11");
    });
    it("fail - opUSDCearn.userDepositVault, TOTAL_VALUE_LOCKED_LIMIT_UT", async function () {
      await this.opUSDCearn.connect(this.signers.financeOperator).setValueControlParams(
        "100000000000", // 100,000 USDC user deposit cap
        "1000000000", // 1000 USDC minimum deposit
        "0", // 0 USDC TVL
      );
      await expect(
        this.opUSDCearn
          .connect(this.signers.alice)
          .userDepositVault(this.signers.alice.address, "2500000000", "0x", this._aliceMerkleProof, []),
      ).to.revertedWith("11");
    });
  });
});
