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
  InitializableImmutableAdminUpgradeabilityProxy,
  Registry,
  RegistryProxy,
  StrategyProvider,
  Vault,
} from "../../../../typechain";
import { opUSDCsave, opWETHsave, RegistryProxy as RegistryProxyAddress } from "../../_deployments/mainnet.json";
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
import { configopUSDCsave } from "./configopUSDCsave";
import { configopWETHsave } from "./configopWETHsave";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;
const OPUSDCSAVE_VAULT_PROXY_ADDRESS = opUSDCsave.VaultProxy;
const OPWETHSAVE_VAULT_PROXY_ADDRESS = opWETHsave.VaultProxy;
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
    this.usdc = <ERC20>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address)
    );
    await setTokenBalanceInStorage(this.usdc, this.signers.admin.address, "20000");
    // ==============================================================
    await usdcRebalance();
    // ====================================================

    this.opUSDCsaveProxy = <InitializableImmutableAdminUpgradeabilityProxy>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, OPUSDCSAVE_VAULT_PROXY_ADDRESS)
    );
    this.opUSDCsaveOld = await ethers.getContractAt(oldAbis.oldVault, OPUSDCSAVE_VAULT_PROXY_ADDRESS);
    this.opUSDCsaveGasOwedToOperator = await this.opUSDCsaveOld.gasOwedToOperator();
    this.opUSDCsaveDepositQueue = await this.opUSDCsaveOld.depositQueue();
    this.opUSDCsavePricePerShareWrite = await this.opUSDCsaveOld.pricePerShareWrite();

    const opUSDCsaveAdminAddress = await this.opUSDCsaveProxy.admin();
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [opUSDCsaveAdminAddress],
    });
    // ====================================================
    await wethRebalance();
    this.opWETHsaveProxy = <InitializableImmutableAdminUpgradeabilityProxy>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, OPWETHSAVE_VAULT_PROXY_ADDRESS)
    );
    this.opWETHsaveOld = await ethers.getContractAt(oldAbis.oldVault, OPWETHSAVE_VAULT_PROXY_ADDRESS);
    this.opWETHsaveGasOwedToOperator = await this.opWETHsaveOld.gasOwedToOperator();
    this.opWETHsaveDepositQueue = await this.opWETHsaveOld.depositQueue();
    this.opWETHsavePricePerShareWrite = await this.opWETHsaveOld.pricePerShareWrite();

    const opWETHsaveAdminAddress = await this.opWETHsaveProxy.admin();
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [opWETHsaveAdminAddress],
    });
    // ====================================================
    await deployAndUpgradeUSDC();
    this.opUSDCsave = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, this.opUSDCsaveProxy.address);
    expect(await this.opUSDCsave.name()).to.eq("op USD Coin Save");
    expect(await this.opUSDCsave.symbol()).to.eq("opUSDCsave");
    expect(await this.opUSDCsave.decimals()).to.eq(6);
    // ====================================================
    await deployAndUpgradeWETH();
    this.opWETHsave = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, this.opWETHsaveProxy.address);
    expect(await this.opWETHsave.name()).to.eq("op Wrapped Ether Save");
    expect(await this.opWETHsave.symbol()).to.eq("opWETHsave");
    expect(await this.opWETHsave.decimals()).to.eq(18);
    // =======================================================
    await deployAndUpgradeRegistry(fork);
    await deployAndUpgradeRiskManager();
    const strategyProviderAddress = await deployStrategyProvider();
    this.strategyProvider = <StrategyProvider>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER, strategyProviderAddress)
    );
  });

  it("default values from for old opUSDCsave should be as expected", async function () {
    expect(await this.opUSDCsave.opTOKEN_REVISION()).to.eq("0x3");
    expect(await this.opUSDCsave.registryContract()).to.eq(getAddress(this.registry.address));
    expect(await this.opUSDCsave.whitelistedAccountsRoot()).to.eq(
      "0x0000000000000000000000000000000000000000000000000000000000000001",
    );
    expect(await this.opUSDCsave.underlyingToken()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address);
    expect(await this.opUSDCsave.underlyingTokensHash()).to.eq(ethers.constants.HashZero);
    expect(await this.opUSDCsave.name()).to.eq("op USD Coin Save");
    expect(await this.opUSDCsave.symbol()).to.eq("opUSDCsave");
    expect(await this.opUSDCsave.decimals()).to.eq(6);
    expect(await this.opUSDCsave.vaultConfiguration()).to.eq("100");
    expect(await this.opUSDCsave.userDepositCapUT()).to.eq(this.opUSDCsaveGasOwedToOperator); //gasOwedToOperator
    expect(await this.opUSDCsave.minimumDepositValueUT()).to.eq(this.opUSDCsaveDepositQueue); //depositQueue
    expect(await this.opUSDCsave.totalValueLockedLimitUT()).to.eq(this.opUSDCsavePricePerShareWrite); //pricePerShareWrite
  });

  it("default values for old opWETHsave should be as expected", async function () {
    expect(await this.opWETHsave.opTOKEN_REVISION()).to.eq("0x3");
    expect(await this.opWETHsave.registryContract()).to.eq(getAddress(this.registry.address));
    expect(await this.opWETHsave.whitelistedAccountsRoot()).to.eq(
      "0x0000000000000000000000000000000000000000000000000000000000000001",
    );
    expect(await this.opWETHsave.underlyingToken()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].WETH.address);
    expect(await this.opWETHsave.underlyingTokensHash()).to.eq(ethers.constants.HashZero);
    expect(await this.opWETHsave.name()).to.eq("op Wrapped Ether Save");
    expect(await this.opWETHsave.symbol()).to.eq("opWETHsave");
    expect(await this.opWETHsave.decimals()).to.eq(18);
    expect(await this.opWETHsave.vaultConfiguration()).to.eq("100");
    expect(await this.opWETHsave.userDepositCapUT()).to.eq(this.opWETHsaveGasOwedToOperator); //gasOwedToOperator
    expect(await this.opWETHsave.minimumDepositValueUT()).to.eq(this.opWETHsaveDepositQueue); //depositQueue
    expect(await this.opWETHsave.totalValueLockedLimitUT()).to.eq(this.opWETHsavePricePerShareWrite); //pricePerShareWrite
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
  it("setVaultConfiguration() for opUSDCsave new", async function () {
    await this.opUSDCsave
      .connect(this.signers.governance)
      .setVaultConfiguration("1811018241397843937822879938261491478723170994297509433919320763695890432000");
    const vaultConfigurationV2 = await this.opUSDCsave.vaultConfiguration();
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

  it("setVaultConfiguration() for opWETHsave new", async function () {
    await this.opWETHsave
      .connect(this.signers.governance)
      .setVaultConfiguration("1811018241397843937822879938261491478723170994297509433919320763695890432000");
    const vaultConfigurationV2 = await this.opWETHsave.vaultConfiguration();
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
    expect(await this.opUSDCsave.investStrategyHash()).to.eq(ethers.constants.HashZero);
    expect(await (await this.opUSDCsave.getInvestStrategySteps()).length).to.eq(0);
  });

  it("null strategy for WETH vault", async function () {
    expect(await this.opWETHsave.investStrategyHash()).to.eq(ethers.constants.HashZero);
    expect(await (await this.opWETHsave.getInvestStrategySteps()).length).to.eq(0);
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
      await configopUSDCsave(this.strategyProvider.address, fork);
      await configopWETHsave(this.strategyProvider.address, fork);
      expect(await this.opUSDCsave.getNextBestInvestStrategy()).to.deep.eq(
        cvxusdn3CrvStrategySteps.map(v => Object.values(v)),
      );
      expect(await this.opUSDCsave.underlyingTokensHash()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash);
      assertVaultConfiguration(
        await this.opUSDCsave.vaultConfiguration(),
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
      expect(await this.opUSDCsave.userDepositCapUT()).to.eq("100000000000");
      expect(await this.opUSDCsave.minimumDepositValueUT()).to.eq("1000000000");
      expect(await this.opUSDCsave.totalValueLockedLimitUT()).to.eq("10000000000000");

      // await deployments.fixture("ConfigopWETHsave");
      // await deployments.fixture("SetBestStrategyopWETHsave");
      expect(await this.opWETHsave.getNextBestInvestStrategy()).to.deep.eq(
        convexSteCRVStrategySteps.map(v => Object.values(v)),
      );
      expect(await this.opWETHsave.underlyingTokensHash()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash);
      assertVaultConfiguration(
        await this.opWETHsave.vaultConfiguration(),
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
      expect(await this.opWETHsave.userDepositCapUT()).to.eq("5000000000000000000");
      expect(await this.opWETHsave.minimumDepositValueUT()).to.eq("250000000000000000");
      expect(await this.opWETHsave.totalValueLockedLimitUT()).to.eq("5000000000000000000000");
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

    it("lp token balance should be as expected after rebalance of opUSDCsave to usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-CurveSwapPool-MIM-3LP3CRV-f-DEPOSIT-Convex-cvxMIM-3LP3CRV-f", async function () {
      expect(await this.opUSDCsave.getNextBestInvestStrategy()).to.deep.eq(
        cvxusdn3CrvStrategySteps.map(v => Object.values(v)),
      );
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash, mimStrategySteps);
      expect(await this.opUSDCsave.getNextBestInvestStrategy()).to.deep.eq(mimStrategySteps.map(v => Object.values(v)));
      await this.opUSDCsave.rebalance();
      // assert invest strategy hash
      expect(await this.opUSDCsave.getInvestStrategySteps()).to.deep.eq(mimStrategySteps.map(v => Object.values(v)));
      expect(await this.opUSDCsave.investStrategyHash()).to.eq(
        generateStrategyHashV2(mimStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash),
      );
      expect(await this.usdc.balanceOf(this.opUSDCsave.address)).to.eq("0");
      const expectedLPTokenBalance = await getLastStrategyStepBalanceLP(
        mimStrategySteps as StrategyStepType[],
        this.registry,
        this.opUSDCsave,
        this.usdc,
      );
      const actualLPTokenBalance = await this.opUSDCsave.getLastStrategyStepBalanceLP(mimStrategySteps);
      expect(actualLPTokenBalance).to.eq(expectedLPTokenBalance);
    });

    it("lp token balance should be as expected after rebalance of opWETHsave to weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV", async function () {
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash, convexSteCRVStrategySteps);
      expect(await this.opWETHsave.getNextBestInvestStrategy()).to.deep.eq(
        convexSteCRVStrategySteps.map(v => Object.values(v)),
      );
      const _beforeRebalance = await this.weth.balanceOf(this.opWETHsave.address);
      await this.opWETHsave.rebalance();
      const _afterRebalance = await this.weth.balanceOf(this.opWETHsave.address);
      expect(_beforeRebalance).gt(_afterRebalance);
      expect(await this.opWETHsave.getInvestStrategySteps()).to.deep.eq(
        convexSteCRVStrategySteps.map(v => Object.values(v)),
      );
      expect(await this.opWETHsave.investStrategyHash()).to.eq(
        generateStrategyHashV2(convexSteCRVStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash),
      );
      expect(await this.weth.balanceOf(this.opWETHsave.address)).to.eq("0");
      const expectedLPTokenBalance = await getLastStrategyStepBalanceLP(
        convexSteCRVStrategySteps as StrategyStepType[],
        this.registry,
        this.opWETHsave,
        this.weth,
      );
      const actualLPTokenBalance = await this.opWETHsave.getLastStrategyStepBalanceLP(convexSteCRVStrategySteps);
      expect(actualLPTokenBalance).to.eq(expectedLPTokenBalance);
      expect(expectedLPTokenBalance).to.gt("0");
    });

    it("underlying token balance of opUSDCsave should be expected after pausing", async function () {
      const underlyingTokenBalanceBefore = await this.usdc.balanceOf(this.opUSDCsave.address);
      await this.opUSDCsave.connect(this.signers.governance).setUnpaused(false);
      assertVaultConfiguration(
        await this.opUSDCsave.vaultConfiguration(),
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
      expect((await this.opUSDCsave.getInvestStrategySteps()).length).to.eq(0);
      expect(await this.opUSDCsave.investStrategyHash()).to.eq(ethers.constants.HashZero);
      const underlyingTokenBalanceAfter = await this.usdc.balanceOf(this.opUSDCsave.address);
      expect(underlyingTokenBalanceAfter).gt(underlyingTokenBalanceBefore);
      const lpTokenBalance = await this.opUSDCsave.getLastStrategyStepBalanceLP(mimStrategySteps);
      expect(lpTokenBalance).to.eq("0");
      expect(await this.opUSDCsave.investStrategyHash()).to.eq(ethers.constants.HashZero);
    });

    it("underlying token balance of opWETHsave should be expected after pausing", async function () {
      const underlyingTokenBalanceBefore = await this.weth.balanceOf(this.opWETHsave.address);
      await this.opWETHsave.connect(this.signers.governance).setUnpaused(false);
      assertVaultConfiguration(
        await this.opWETHsave.vaultConfiguration(),
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
      expect((await this.opWETHsave.getInvestStrategySteps()).length).to.eq(0);
      expect(await this.opWETHsave.investStrategyHash()).to.eq(ethers.constants.HashZero);
      const underlyingTokenBalanceAfter = await this.weth.balanceOf(this.opWETHsave.address);
      expect(underlyingTokenBalanceAfter).gt(underlyingTokenBalanceBefore);
      const lpTokenBalance = await this.opWETHsave.getLastStrategyStepBalanceLP(mimStrategySteps);
      expect(lpTokenBalance).to.eq("0");
      expect(await this.opWETHsave.investStrategyHash()).to.eq(ethers.constants.HashZero);
    });

    it("unpause opUSDCsave and rebalance to cvxFRAX3CRV", async function () {
      const _beforeRebalance = await this.usdc.balanceOf(this.opUSDCsave.address);
      await this.opUSDCsave.connect(this.signers.governance).setUnpaused(true);
      assertVaultConfiguration(
        await this.opUSDCsave.vaultConfiguration(),
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
      await this.opUSDCsave.rebalance();
      expect(await this.opUSDCsave.getInvestStrategySteps()).to.deep.eq(
        cvxFRAX3CRVStrategySteps.map(v => Object.values(v)),
      );
      expect(await this.opUSDCsave.investStrategyHash()).to.eq(
        generateStrategyHashV2(cvxFRAX3CRVStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash),
      );
      const _afterRebalance = await this.usdc.balanceOf(this.opUSDCsave.address);
      expect(_beforeRebalance).gt(_afterRebalance);
      expect(await this.usdc.balanceOf(this.opUSDCsave.address)).to.eq("0");
      const expectedLPTokenBalance = await getLastStrategyStepBalanceLP(
        cvxFRAX3CRVStrategySteps as StrategyStepType[],
        this.registry,
        this.opUSDCsave,
        this.usdc,
      );
      const actualLPTokenBalance = await this.opUSDCsave.getLastStrategyStepBalanceLP(cvxFRAX3CRVStrategySteps);
      expect(actualLPTokenBalance).to.eq(expectedLPTokenBalance);
      expect(expectedLPTokenBalance).to.gt("0");
    });

    it("opWETHsave unpause and rebalance to weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV", async function () {
      await this.opWETHsave.connect(this.signers.governance).setUnpaused(true);
      assertVaultConfiguration(
        await this.opWETHsave.vaultConfiguration(),
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
      const _beforeRebalance = await this.weth.balanceOf(this.opWETHsave.address);
      await this.opWETHsave.rebalance();
      const _afterRebalance = await this.weth.balanceOf(this.opWETHsave.address);
      expect(_beforeRebalance).gt(_afterRebalance);
      expect(await this.opWETHsave.getInvestStrategySteps()).to.deep.eq(
        convexSteCRVStrategySteps.map(v => Object.values(v)),
      );
      expect(await this.opWETHsave.investStrategyHash()).to.eq(
        generateStrategyHashV2(convexSteCRVStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash),
      );
    });

    it("alice deposit some to opWETHsave, calls vault deposit", async function () {
      const _userDepositWETH = BigNumber.from("250000000000000000");
      await setTokenBalanceInStorage(
        this.weth,
        this.signers.alice.address,
        new BN(_userDepositWETH.toString()).div(new BN(to_10powNumber_BN("18").toString())).toString(),
      );
      await this.weth.connect(this.signers.alice).approve(this.opWETHsave.address, _userDepositWETH);
      const _balanceInopWETHsaveUT = await this.weth.balanceOf(this.opWETHsave.address);
      const _oraStratValueUT = await getOraValueUT(
        convexSteCRVStrategySteps as StrategyStepType[],
        this.registry,
        this.opWETHsave,
        this.weth,
      );
      const totalSupply = await this.opWETHsave.totalSupply();
      const _expectedShares = _userDepositWETH.mul(totalSupply).div(_balanceInopWETHsaveUT.add(_oraStratValueUT));
      const _expectedTotalSupply = totalSupply.add(_expectedShares);
      const _userBalanceBeforeVT = await this.opWETHsave.balanceOf(this.signers.alice.address);
      await this.opWETHsave.connect(this.signers.alice).userDepositVault(_userDepositWETH, this._aliceMerkleProof, []);
      const _balanceBeforeDeposit = await this.weth.balanceOf(this.opWETHsave.address);
      await this.opWETHsave.vaultDepositAllToStrategy();
      const _balanceAfterDeposit = await this.weth.balanceOf(this.opWETHsave.address);
      const _userBalanceAfterVT = await this.opWETHsave.balanceOf(this.signers.alice.address);
      expect(_balanceBeforeDeposit).gt(_balanceAfterDeposit);
      const _actualShares = _userBalanceAfterVT.sub(_userBalanceBeforeVT);
      expect(_actualShares).to.eq(_expectedShares);
      expect(await this.opWETHsave.totalSupply()).to.eq(_expectedTotalSupply);
    });
    it("alice withdraw some to opWETHsave", async function () {
      const _userWithdrawVT = (await this.opWETHsave.balanceOf(this.signers.alice.address)).div(2);
      const _totalSupply = await this.opWETHsave.totalSupply();
      const _expectedTotalSupply = _totalSupply.sub(_userWithdrawVT);
      const _balanceInopWETHsaveUT = await this.weth.balanceOf(this.opWETHsave.address);
      const _oraStratValueUT = await getOraValueUT(
        convexSteCRVStrategySteps as StrategyStepType[],
        this.registry,
        this.opWETHsave,
        this.weth,
      );
      const expectedUT = _userWithdrawVT.mul(_balanceInopWETHsaveUT.add(_oraStratValueUT)).div(_totalSupply);
      const _balanceBefore = await this.weth.balanceOf(this.signers.alice.address);
      await this.opWETHsave.connect(this.signers.alice).userWithdrawVault(_userWithdrawVT, this._aliceMerkleProof, []);
      const _balanceAfter = await this.weth.balanceOf(this.signers.alice.address);
      expect(_balanceAfter.sub(_balanceBefore)).gte(expectedUT.sub(expectedUT.mul(7).div(100)));
      expect(await this.opWETHsave.totalSupply()).to.eq(_expectedTotalSupply);
    });
    it("bob deposit some to opUSDCsave, calls vault deposit", async function () {
      const _userDepositUSDC = BigNumber.from("2500000000");
      await setTokenBalanceInStorage(
        this.usdc,
        this.signers.bob.address,
        new BN(_userDepositUSDC.toString()).div(new BN(to_10powNumber_BN("6").toString())).toString(),
      );
      await this.usdc.connect(this.signers.bob).approve(this.opUSDCsave.address, _userDepositUSDC);
      const _balanceInopUSDCsaveUT = await this.usdc.balanceOf(this.opUSDCsave.address);
      const _oraStratValueUT = await getOraValueUT(
        cvxFRAX3CRVStrategySteps as StrategyStepType[],
        this.registry,
        this.opUSDCsave,
        this.usdc,
      );
      const totalSupply = await this.opUSDCsave.totalSupply();
      const _expectedShares = _userDepositUSDC.mul(totalSupply).div(_balanceInopUSDCsaveUT.add(_oraStratValueUT));
      const _expectedTotalSupply = totalSupply.add(_expectedShares);
      const _userBalanceBeforeVT = await this.opUSDCsave.balanceOf(this.signers.bob.address);
      await this.opUSDCsave.connect(this.signers.bob).userDepositVault(_userDepositUSDC, this._bobMerkleProof, []);
      const _balanceBeforeDeposit = await this.usdc.balanceOf(this.opUSDCsave.address);
      await this.opUSDCsave.vaultDepositAllToStrategy();
      const _balanceAfterDeposit = await this.usdc.balanceOf(this.opUSDCsave.address);
      const _userBalanceAfterVT = await this.opUSDCsave.balanceOf(this.signers.bob.address);
      expect(_balanceBeforeDeposit).gt(_balanceAfterDeposit);
      const _actualShares = _userBalanceAfterVT.sub(_userBalanceBeforeVT);
      expect(_actualShares).to.eq(_expectedShares);
      expect(await this.opUSDCsave.totalSupply()).to.eq(_expectedTotalSupply);
    });
    it("bob withdraw some to opUSDCsave", async function () {
      const _userWithdrawVT = (await this.opUSDCsave.balanceOf(this.signers.bob.address)).div(2);
      const _totalSupply = await this.opUSDCsave.totalSupply();
      const _expectedTotalSupply = _totalSupply.sub(_userWithdrawVT);
      const _balanceInopWETHsaveUT = await this.usdc.balanceOf(this.opUSDCsave.address);
      const _oraStratValueUT = await getOraValueUT(
        cvxFRAX3CRVStrategySteps as StrategyStepType[],
        this.registry,
        this.opUSDCsave,
        this.usdc,
      );
      const expectedUT = _userWithdrawVT.mul(_balanceInopWETHsaveUT.add(_oraStratValueUT)).div(_totalSupply);
      const _balanceBefore = await this.usdc.balanceOf(this.signers.bob.address);
      await this.opUSDCsave.connect(this.signers.bob).userWithdrawVault(_userWithdrawVT, this._bobMerkleProof, []);
      const _balanceAfter = await this.usdc.balanceOf(this.signers.bob.address);
      expect(_balanceAfter.sub(_balanceBefore)).to.gte(expectedUT.sub(expectedUT.mul(3).div(1000)));
      expect(await this.opUSDCsave.totalSupply()).to.eq(_expectedTotalSupply);
    });
    it("rebalance opUSDCsave to mim", async function () {
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash, mimStrategySteps);
      await this.opUSDCsave.rebalance();
      // assert invest strategy hash
      expect(await this.opUSDCsave.getInvestStrategySteps()).to.deep.eq(mimStrategySteps.map(v => Object.values(v)));
      expect(await this.opUSDCsave.investStrategyHash()).to.eq(
        generateStrategyHashV2(mimStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash),
      );
      expect(await this.usdc.balanceOf(this.opUSDCsave.address)).to.eq("0");
      const expectedLPTokenBalance = await getLastStrategyStepBalanceLP(
        mimStrategySteps as StrategyStepType[],
        this.registry,
        this.opUSDCsave,
        this.usdc,
      );
      const actualLPTokenBalance = await this.opUSDCsave.getLastStrategyStepBalanceLP(mimStrategySteps);
      expect(actualLPTokenBalance).to.eq(expectedLPTokenBalance);
    });
    it("fail - opUSDCsave.userDepositVault, MINIMUM_USER_DEPOSIT_VALUE_UT ", async function () {
      const _minimumUserpositUT = await this.opUSDCsave.minimumDepositValueUT();
      const _depositUSDC = _minimumUserpositUT.div("2");
      await setTokenBalanceInStorage(
        this.usdc,
        this.signers.alice.address,
        _depositUSDC.div(to_10powNumber_BN("6")).toString(),
      );
      await this.usdc.connect(this.signers.alice).approve(this.opUSDCsave.address, _depositUSDC);
      await expect(
        this.opUSDCsave.connect(this.signers.alice).userDepositVault(_depositUSDC, this._aliceMerkleProof, []),
      ).to.revertedWith("10");
    });
    it("fail - opWETHsave.userDepositVault, MINIMUM_USER_DEPOSIT_VALUE_UT", async function () {
      const _minimumUserdepositUT = await this.opWETHsave.minimumDepositValueUT();
      const _depositWETH = _minimumUserdepositUT.div("2");
      await setTokenBalanceInStorage(
        this.weth,
        this.signers.bob.address,
        new BN(_depositWETH.toString()).div(new BN(to_10powNumber_BN("18").toString())).toString(),
      );
      await this.weth.connect(this.signers.bob).approve(this.opWETHsave.address, _depositWETH);
      await expect(
        this.opWETHsave.connect(this.signers.bob).userDepositVault(_depositWETH, this._bobMerkleProof, []),
      ).to.revertedWith("10");
    });
    it("fail - opUSDCsave.userDepositVault, USER_DEPOSIT_CAP_UT", async function () {
      const _balanceUSDC = await this.usdc.balanceOf(this.signers.alice.address);
      const _totalDeposits = await this.opUSDCsave.totalDeposits(this.signers.alice.address);
      const _userDepositCap = await this.opUSDCsave.userDepositCapUT();
      const _fundAmountUSDC = _userDepositCap.sub(_totalDeposits).sub(_balanceUSDC).add("1000000000");
      await setTokenBalanceInStorage(
        this.usdc,
        this.signers.alice.address,
        new BN(_fundAmountUSDC.toString()).div(new BN(to_10powNumber_BN("6").toString())).toString(),
      );
      const _depositUSDC = await this.usdc.balanceOf(this.signers.alice.address);
      await this.usdc.connect(this.signers.alice).approve(this.opUSDCsave.address, _depositUSDC);
      await expect(
        this.opUSDCsave.connect(this.signers.alice).userDepositVault(_depositUSDC, this._aliceMerkleProof, []),
      ).to.revertedWith("12");
    });
    it("fail - opWETHsave.userDepositVault, USER_DEPOSIT_CAP_UT", async function () {
      const _userDepositCap = await this.opWETHsave.userDepositCapUT();
      const _fundAmountWETH = _userDepositCap.add("10000000000000");
      await setTokenBalanceInStorage(
        this.weth,
        this.signers.bob.address,
        new BN(_fundAmountWETH.toString()).div(new BN(to_10powNumber_BN("18").toString())).toString(),
      );
      const _depositWETH = await this.weth.balanceOf(this.signers.bob.address);
      await this.weth.connect(this.signers.bob).approve(this.opWETHsave.address, _depositWETH);
      await expect(
        this.opWETHsave.connect(this.signers.bob).userDepositVault(_depositWETH, this._bobMerkleProof, []),
      ).to.revertedWith("12");
    });
    it("fail - opWETHsave.userDepositVault, TOTAL_VALUE_LOCKED_LIMIT_UT", async function () {
      await this.opWETHsave.connect(this.signers.financeOperator).setValueControlParams(
        "100000000000000000000000", // 1 WETH user deposit cap
        "250000000000000000", // 0.25 WETH minimum deposit
        "0", // 0 WETH TVL
      );
      const _depositWETH = await this.weth.balanceOf(this.signers.bob.address);
      await expect(
        this.opWETHsave.connect(this.signers.bob).userDepositVault(_depositWETH, this._bobMerkleProof, []),
      ).to.revertedWith("11");
    });
    it("fail - opUSDCsave.userDepositVault, TOTAL_VALUE_LOCKED_LIMIT_UT", async function () {
      await this.opUSDCsave.connect(this.signers.financeOperator).setValueControlParams(
        "100000000000", // 100,000 USDC user deposit cap
        "1000000000", // 1000 USDC minimum deposit
        "0", // 0 USDC TVL
      );
      await expect(
        this.opUSDCsave.connect(this.signers.alice).userDepositVault("2500000000", this._aliceMerkleProof, []),
      ).to.revertedWith("11");
    });
  });
});
