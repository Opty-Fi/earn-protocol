import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import BN from "bignumber.js";
import { BigNumber } from "ethers";
import { getAddress } from "ethers/lib/utils";
import { assertVaultConfiguration, Signers, to_10powNumber_BN } from "../../../../helpers/utils";
import { ERC20, ERC20Permit, InitializableImmutableAdminUpgradeabilityProxy } from "../../../../typechain";
import { opUSDCgrow, opWETHgrow, RegistryProxy as RegistryProxyAddress } from "../../_deployments/mainnet.json";
import { ESSENTIAL_CONTRACTS } from "../../../../helpers/constants/essential-contracts-name";
import { getLastStrategyStepBalanceLPOld, getOraValueUTOld, setTokenBalanceInStorage } from "../../utils";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../../../helpers/constants/tokens";
import { eEVMNetwork } from "../../../../helper-hardhat-config";
import { StrategiesByTokenByChain } from "../../../../helpers/data/adapter-with-strategies";
import { generateStrategyHashV2Old } from "../../../../helpers/helpers";
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
import { configopUSDCgrow } from "./configopUSDCgrow";
import { configopWETHgrow } from "./configopWETHgrow";
import { VaultV3, VaultV3__factory } from "../../../../helpers/types/vaultv3";
import {
  RegistryProxyV1,
  RegistryProxyV1__factory,
  RegistryV1,
  RegistryV1__factory,
} from "../../../../helpers/types/registryV1";
import { StrategyProviderV1, StrategyProviderV1__factory } from "../../../../helpers/types/strategyProviderv1";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;
const OPUSDCGROW_VAULT_PROXY_ADDRESS = opUSDCgrow.VaultProxy;
const OPWETHGROW_VAULT_PROXY_ADDRESS = opWETHgrow.VaultProxy;
const REGISTRY_PROXY_ADDRESS = RegistryProxyAddress;

// ================================================================
const mim = [
  {
    contract: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
    outputToken: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
    isBorrow: false,
    outputTokenSymbol: "3Crv",
    adapterName: "CurveSwapPoolAdapter",
    protocol: "Curve",
  },
  {
    contract: "0x5a6A4D54456819380173272A5E8E9B9904BdF41B",
    outputToken: "0x5a6A4D54456819380173272A5E8E9B9904BdF41B",
    isBorrow: false,
    outputTokenSymbol: "MIM-3LP3CRV-f",
    adapterName: "CurveMetapoolSwapAdapter",
    protocol: "Curve",
  },
  {
    contract: "0xabB54222c2b77158CC975a2b715a3d703c256F05",
    outputToken: "0xabB54222c2b77158CC975a2b715a3d703c256F05",
    isBorrow: false,
    outputTokenSymbol: "cvxMIM-3LP3CRV-f",
    adapterName: "ConvexFinanceAdapter",
    protocol: "Convex",
  },
];

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

const cvxsteCRV = [
  {
    contract: "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022",
    outputToken: "0x06325440D014e39736583c165C2963BA99fAf14E",
    isBorrow: false,
    outputTokenSymbol: "steCRV",
    adapterName: "CurveSwapPoolAdapter",
    protocol: "Curve",
  },
  {
    contract: "0x9518c9063eB0262D791f38d8d6Eb0aca33c63ed0",
    outputToken: "0x9518c9063eB0262D791f38d8d6Eb0aca33c63ed0",
    isBorrow: false,
    outputTokenSymbol: "cvxsteCRV",
    adapterName: "ConvexFinanceAdapter",
    protocol: "Convex",
  },
];
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

const cvxFRAX3CRV = [
  {
    contract: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
    outputToken: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
    isBorrow: false,
    outputTokenSymbol: "3Crv",
    adapterName: "CurveSwapPoolAdapter",
    protocol: "Curve",
  },
  {
    contract: "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
    outputToken: "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
    isBorrow: false,
    outputTokenSymbol: "FRAX3CRV-f",
    adapterName: "CurveMetapoolSwapAdapter",
    protocol: "Curve",
  },
  {
    contract: "0xbE0F6478E0E4894CFb14f32855603A083A57c7dA",
    outputToken: "0xbE0F6478E0E4894CFb14f32855603A083A57c7dA",
    isBorrow: false,
    outputTokenSymbol: "cvxFRAX3CRV-f",
    adapterName: "ConvexFinanceAdapter",
    protocol: "Convex",
  },
];
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
describe(`${fork}-Vault-rev3 Ethereum on-chain upgrade`, () => {
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
    this.registryProxyV1 = <RegistryProxyV1>(
      await ethers.getContractAt(RegistryProxyV1__factory.abi, REGISTRY_PROXY_ADDRESS)
    );
    this.registryV1 = <RegistryV1>await ethers.getContractAt(RegistryV1__factory.abi, REGISTRY_PROXY_ADDRESS);
    const operatorAddress = await this.registryV1.getOperator();
    const financeOperatorAddress = await this.registryV1.getFinanceOperator();
    const governanceAddress = await this.registryV1.getGovernance();
    const strategyOperatorAddress = await this.registryV1.getStrategyOperator();
    const riskOperatorAddress = await this.registryV1.getRiskOperator();
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
    this.opUSDCgrowOld = await ethers.getContractAt(oldAbis.oldVaultV2, OPUSDCGROW_VAULT_PROXY_ADDRESS);
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
    this.opWETHgrowOld = await ethers.getContractAt(oldAbis.oldVaultV2, OPWETHGROW_VAULT_PROXY_ADDRESS);
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
    this.opUSDCgrow = <VaultV3>await ethers.getContractAt(VaultV3__factory.abi, this.opUSDCgrowProxy.address);
    expect(await this.opUSDCgrow.name()).to.eq("op USD Coin Growth");
    expect(await this.opUSDCgrow.symbol()).to.eq("opUSDCgrow");
    expect(await this.opUSDCgrow.decimals()).to.eq(6);
    // ====================================================
    await deployAndUpgradeWETH();
    this.opWETHgrow = <VaultV3>await ethers.getContractAt(VaultV3__factory.abi, this.opWETHgrowProxy.address);
    expect(await this.opWETHgrow.name()).to.eq("op Wrapped Ether Growth");
    expect(await this.opWETHgrow.symbol()).to.eq("opWETHgrow");
    expect(await this.opWETHgrow.decimals()).to.eq(18);
    // =======================================================
    await deployAndUpgradeRegistry(fork);
    await deployAndUpgradeRiskManager();
    const strategyProviderAddress = await deployStrategyProvider();
    this.strategyProviderV1 = <StrategyProviderV1>(
      await ethers.getContractAt(StrategyProviderV1__factory.abi, strategyProviderAddress)
    );
  });

  it("default values from for old opUSDCgrow should be as expected", async function () {
    expect(await this.opUSDCgrow.opTOKEN_REVISION()).to.eq("0x3");
    expect(await this.opUSDCgrow.registryContract()).to.eq(getAddress(this.registryV1.address));
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
    expect(await this.opWETHgrow.registryContract()).to.eq(getAddress(this.registryV1.address));
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

  describe(`${fork}-test frax, usdn3Crv and steth strategy`, async function () {
    before(async function () {
      this.usdc = <ERC20Permit>(
        await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address)
      );
      this.weth = <ERC20>(
        await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, MULTI_CHAIN_VAULT_TOKENS[fork].WETH.address)
      );

      await this.registryV1.connect(this.signers.governance).setOperator(this.signers.admin.address);
      await this.registryV1.connect(this.signers.governance).setRiskOperator(this.signers.admin.address);
      this.signers.operator = await ethers.getSigner(this.signers.admin.address);
      this.signers.riskOperator = await ethers.getSigner(this.signers.admin.address);
      await approveAndMapLiquidityPoolToAdapter();
      await configopUSDCgrow(this.strategyProviderV1.address, fork);
      await configopWETHgrow(this.strategyProviderV1.address, fork);
      try {
        expect(await this.opUSDCgrow.getNextBestInvestStrategy()).to.deep.eq(
          cvxusdn3CrvStrategySteps.map(v => Object.values(v)),
        );
        expect(await this.opUSDCgrow.underlyingTokensHash()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash);
      } catch (e) {
        console.log("123 ", e);
      }
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
      // this.strategyProviderV1 = <StrategyProvider>(
      //   await ethers.getContractAt(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER, strategyProviderAddress)
      // );
    });

    it("lp token balance should be as expected after rebalance of opUSDCgrow to usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-CurveSwapPool-MIM-3LP3CRV-f-DEPOSIT-Convex-cvxMIM-3LP3CRV-f", async function () {
      expect(await this.opUSDCgrow.getNextBestInvestStrategy()).to.deep.eq(
        cvxusdn3CrvStrategySteps.map(v => Object.values(v)),
      );
      await this.strategyProviderV1
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash, mimStrategySteps);
      expect(await this.opUSDCgrow.getNextBestInvestStrategy()).to.deep.eq(mimStrategySteps.map(v => Object.values(v)));
      await this.opUSDCgrow.rebalance();
      // assert invest strategy hash
      expect(await this.opUSDCgrow.getInvestStrategySteps()).to.deep.eq(mimStrategySteps.map(v => Object.values(v)));
      expect(await this.opUSDCgrow.investStrategyHash()).to.eq(
        generateStrategyHashV2Old(mimStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash),
      );
      expect(await this.usdc.balanceOf(this.opUSDCgrow.address)).to.eq("0");
      const expectedLPTokenBalance = await getLastStrategyStepBalanceLPOld(
        mimStrategySteps as {
          pool: string;
          outputToken: string;
          isBorrow: boolean;
        }[],
        this.registryV1,
        this.opUSDCgrow,
        this.usdc,
      );
      const actualLPTokenBalance = await this.opUSDCgrow.getLastStrategyStepBalanceLP(mimStrategySteps);
      expect(actualLPTokenBalance).to.eq(expectedLPTokenBalance);
    });

    it("lp token balance should be as expected after rebalance of opWETHgrow to weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV", async function () {
      await this.strategyProviderV1
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
        generateStrategyHashV2Old(convexSteCRVStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash),
      );
      expect(await this.weth.balanceOf(this.opWETHgrow.address)).to.eq("0");
      const expectedLPTokenBalance = await getLastStrategyStepBalanceLPOld(
        convexSteCRVStrategySteps as {
          pool: string;
          outputToken: string;
          isBorrow: boolean;
        }[],
        this.registryV1,
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
        StrategiesByTokenByChain[fork]["Earn"].USDC[
          "usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-CurveMetapoolSwapPool-FRAX3CRV-f-DEPOSIT-Convex-cvxFRAX3CRV-f"
        ].strategy;
      const convexFraxStrategySteps = convexFrax.map(strategy => ({
        pool: strategy.contract,
        outputToken: strategy.outputToken,
        isBorrow: false,
      }));
      await this.strategyProviderV1
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash, convexFraxStrategySteps);
      await this.opUSDCgrow.rebalance();
      expect(await this.opUSDCgrow.getInvestStrategySteps()).to.deep.eq(
        cvxFRAX3CRVStrategySteps.map(v => Object.values(v)),
      );
      expect(await this.opUSDCgrow.investStrategyHash()).to.eq(
        generateStrategyHashV2Old(cvxFRAX3CRVStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash),
      );
      const _afterRebalance = await this.usdc.balanceOf(this.opUSDCgrow.address);
      expect(_beforeRebalance).gt(_afterRebalance);
      expect(await this.usdc.balanceOf(this.opUSDCgrow.address)).to.eq("0");
      const expectedLPTokenBalance = await getLastStrategyStepBalanceLPOld(
        cvxFRAX3CRVStrategySteps as {
          pool: string;
          outputToken: string;
          isBorrow: boolean;
        }[],
        this.registryV1,
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
        generateStrategyHashV2Old(convexSteCRVStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash),
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
      const _oraStratValueUT = await getOraValueUTOld(
        convexSteCRVStrategySteps as {
          pool: string;
          outputToken: string;
          isBorrow: boolean;
        }[],
        this.registryV1,
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
      const _oraStratValueUT = await getOraValueUTOld(
        convexSteCRVStrategySteps as {
          pool: string;
          outputToken: string;
          isBorrow: boolean;
        }[],
        this.registryV1,
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
      const _oraStratValueUT = await getOraValueUTOld(
        cvxFRAX3CRVStrategySteps as {
          pool: string;
          outputToken: string;
          isBorrow: boolean;
        }[],
        this.registryV1,
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
      const _oraStratValueUT = await getOraValueUTOld(
        cvxFRAX3CRVStrategySteps as {
          pool: string;
          outputToken: string;
          isBorrow: boolean;
        }[],
        this.registryV1,
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
      await this.strategyProviderV1
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash, mimStrategySteps);
      await this.opUSDCgrow.rebalance();
      // assert invest strategy hash
      expect(await this.opUSDCgrow.getInvestStrategySteps()).to.deep.eq(mimStrategySteps.map(v => Object.values(v)));
      expect(await this.opUSDCgrow.investStrategyHash()).to.eq(
        generateStrategyHashV2Old(mimStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash),
      );
      expect(await this.usdc.balanceOf(this.opUSDCgrow.address)).to.eq("0");
      const expectedLPTokenBalance = await getLastStrategyStepBalanceLPOld(
        mimStrategySteps as {
          pool: string;
          outputToken: string;
          isBorrow: boolean;
        }[],
        this.registryV1,
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
