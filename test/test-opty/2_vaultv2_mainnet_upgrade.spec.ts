import { artifacts, waffle, ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import chai, { expect } from "chai";
import { deployContract, solidity } from "ethereum-waffle";
import { Artifact } from "hardhat/types";
import { getAddress } from "ethers/lib/utils";
import { Signers } from "../../helpers/utils";
import {
  ERC20,
  InitializableImmutableAdminUpgradeabilityProxy,
  Registry,
  RegistryProxy,
  RegistryV2,
  RiskManagerProxy,
  RiskManagerV2,
  StrategyProvider,
  StrategyProviderV2,
  Vault,
  VaultV2,
} from "../../typechain";
import {
  opUSDCgrow,
  opWETHgrow,
  RegistryProxy as RegistryProxyAddress,
  RiskManagerProxy as RiskManagerProxyAddress,
  StrategyProvider as StrategyProviderAddress,
  ConvexFinanceAdapter as ConvexFinanceAdapterAddress,
} from "../../_deployments/mainnet.json";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { getLastStrategyStepBalanceLP, setTokenBalanceInStorage } from "./utils";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../helpers/constants/tokens";
import { eEVMNetwork } from "../../helper-hardhat-config";
import { StrategiesByTokenByChain } from "../../helpers/data/adapter-with-strategies";
import { StrategyStepType } from "../../helpers/type";
import { generateStrategyHashV2 } from "../../helpers/helpers";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;
const OPUSDCGROW_VAULT_PROXY_ADDRESS = opUSDCgrow.VaultProxy;
const OPWETHGROW_VAULT_PROXY_ADDRESS = opWETHgrow.VaultProxy;
const OPUSDCGROW_VAULT_ADDRESS = opUSDCgrow.Vault;
const OPWETHGROW_VAULT_ADDRESS = opWETHgrow.Vault;
const REGISTRY_PROXY_ADDRESS = RegistryProxyAddress;
const RISK_MANAGER_PROXY = RiskManagerProxyAddress;
const STRATEGY_PROVIDER_ADDRESS = StrategyProviderAddress;
const CONVEX_FINANCE_ADAPTER = ConvexFinanceAdapterAddress;

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

describe("VaultV2 Ethereum on-chain upgrade", () => {
  before(async function () {
    this.vaultV2Artifact = <Artifact>await artifacts.readArtifact(ESSENTIAL_CONTRACTS.VAULT_V2);
    this.registryV2Artifact = <Artifact>await artifacts.readArtifact(ESSENTIAL_CONTRACTS.REGISTRY_V2);
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
    this.strategyProvider = <StrategyProvider>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER, STRATEGY_PROVIDER_ADDRESS)
    );
    const oldUSDCTokensHash = "0x987a96a91381a62e90a58f1c68177b52aa669f3bd7798e321819de5f870d4ddd";
    await this.strategyProvider
      .connect(this.signers.strategyOperator)
      .setBestStrategy("1", oldUSDCTokensHash, ethers.constants.HashZero);
    await this.strategyProvider
      .connect(this.signers.strategyOperator)
      .setBestDefaultStrategy("1", oldUSDCTokensHash, ethers.constants.HashZero);
    const oldWETHTokensHash = "0x23a659933d87059bc00a17f29f4d98c03eb8986a90c1bec799741278c741576d";
    await this.strategyProvider
      .connect(this.signers.strategyOperator)
      .setBestStrategy("1", oldWETHTokensHash, ethers.constants.HashZero);
    await this.strategyProvider
      .connect(this.signers.strategyOperator)
      .setBestDefaultStrategy("1", oldWETHTokensHash, ethers.constants.HashZero);
    this.opUSDCgrow = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, OPUSDCGROW_VAULT_ADDRESS);
    this.opWETHgrow = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, OPWETHGROW_VAULT_ADDRESS);
    this.usdc = <ERC20>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address)
    );
    await setTokenBalanceInStorage(this.usdc, this.signers.admin.address, "20000");
    // ==============================================================

    const riskManagerV2Artifact: Artifact = await artifacts.readArtifact(ESSENTIAL_CONTRACTS.RISK_MANAGER_V2);
    const strategyProviderV2Artifact: Artifact = await artifacts.readArtifact(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER_V2);
    // testing already deployed contracts
    // this code block may fail if the block number is made greater than
    // the block at which vaults are upgraded to V2 or fork is other than Ethereum
    // ====================================================
    this.opUSDCgrowProxy = <InitializableImmutableAdminUpgradeabilityProxy>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, OPUSDCGROW_VAULT_PROXY_ADDRESS)
    );
    this.opUSDCgrow = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, OPUSDCGROW_VAULT_PROXY_ADDRESS);
    await this.opUSDCgrow.rebalance();
    this.opUSDCgrowGasOwedToOperator = await this.opUSDCgrow.gasOwedToOperator();
    this.opUSDCgrowDepositQueue = await this.opUSDCgrow.depositQueue();
    this.opUSDCgrowPricePerShareWrite = await this.opUSDCgrow.pricePerShareWrite();
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
    this.opWETHgrow = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, OPWETHGROW_VAULT_PROXY_ADDRESS);
    await this.opWETHgrow.rebalance();
    this.opWETHgrowGasOwedToOperator = await this.opWETHgrow.gasOwedToOperator();
    this.opWETHgrowDepositQueue = await this.opWETHgrow.depositQueue();
    this.opWETHgrowPricePerShareWrite = await this.opWETHgrow.pricePerShareWrite();
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
    this.opUSDCgrowV2 = <VaultV2>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_V2, this.opUSDCgrowProxy.address);
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
    this.opWETHgrowV2 = <VaultV2>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_V2, this.opWETHgrowProxy.address);
    // =======================================================
    this.registryV2 = <RegistryV2>await waffle.deployContract(this.signers.deployer, this.registryV2Artifact);
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

  it("default values from for v1 opUSDCgrow should be as expected", async function () {
    expect(await this.opUSDCgrowV2.opTOKEN_REVISION()).to.eq("0x3");
    expect(await this.opUSDCgrowV2.registryContract()).to.eq(getAddress(this.registryV2.address));
    expect(await this.opUSDCgrowV2.riskProfileCode()).to.eq("1");
    expect(await this.opUSDCgrowV2.underlyingToken()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address);
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
    expect(await this.opWETHgrowV2.underlyingToken()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].WETH.address);
    expect(await this.opWETHgrowV2.underlyingTokensHash()).to.eq(ethers.constants.HashZero);
    expect(await this.opWETHgrowV2.name()).to.eq("op Wrapped Ether Growth");
    expect(await this.opWETHgrowV2.symbol()).to.eq("opWETHgrow");
    expect(await this.opWETHgrowV2.decimals()).to.eq(18);
    expect(await this.opWETHgrowV2.maxVaultValueJump()).to.eq("100");
  });

  it("vaultConfigurationV2() for opUSDCgrow V2", async function () {
    const vaultConfigurationV2 = await this.opUSDCgrowV2.vaultConfiguration();
    expect(vaultConfigurationV2.emergencyShutdown).to.be.false;
    expect(vaultConfigurationV2.unpaused).to.be.false;
    expect(vaultConfigurationV2.allowWhitelistedState).to.be.false;
    expect(vaultConfigurationV2.depositFeeFlatUT).to.eq("0");
    expect(vaultConfigurationV2.depositFeePct).to.eq("0");
    expect(vaultConfigurationV2.withdrawalFeeFlatUT).to.eq("0");
    expect(vaultConfigurationV2.withdrawalFeePct).to.eq("0");
    expect(await this.opUSDCgrowV2.userDepositCapUT()).to.eq(this.opUSDCgrowGasOwedToOperator); //gasOwedToOperator
    expect(await this.opUSDCgrowV2.minimumDepositValueUT()).to.eq(this.opUSDCgrowDepositQueue); //depositQueue
    expect(await this.opUSDCgrowV2.totalValueLockedLimitUT()).to.eq(this.opUSDCgrowPricePerShareWrite); //pricePerShareWrite
  });

  it("vaultConfigurationV2() for opWETHgrow V2", async function () {
    const vaultConfigurationV2 = await this.opWETHgrowV2.vaultConfiguration();
    expect(vaultConfigurationV2.emergencyShutdown).to.be.false;
    expect(vaultConfigurationV2.unpaused).to.be.false;
    expect(vaultConfigurationV2.allowWhitelistedState).to.be.false;
    expect(vaultConfigurationV2.depositFeeFlatUT).to.eq("0");
    expect(vaultConfigurationV2.depositFeePct).to.eq("0");
    expect(vaultConfigurationV2.withdrawalFeeFlatUT).to.eq("0");
    expect(vaultConfigurationV2.withdrawalFeePct).to.eq("0");
    expect(await this.opWETHgrowV2.userDepositCapUT()).to.eq(this.opWETHgrowGasOwedToOperator); //gasOwedToOperator
    expect(await this.opWETHgrowV2.minimumDepositValueUT()).to.eq(this.opWETHgrowDepositQueue); //depositQueue
    expect(await this.opWETHgrowV2.totalValueLockedLimitUT()).to.eq(this.opWETHgrowPricePerShareWrite); //pricePerShareWrite
  });

  it("null strategy for USDC vault", async function () {
    expect(await this.opUSDCgrowV2.investStrategyHash()).to.eq(ethers.constants.HashZero);
    expect(await (await this.opUSDCgrowV2.getInvestStrategySteps()).length).to.eq(0);
  });

  it("null strategy for WETH vault", async function () {
    expect(await this.opWETHgrowV2.investStrategyHash()).to.eq(ethers.constants.HashZero);
    expect(await (await this.opWETHgrowV2.getInvestStrategySteps()).length).to.eq(0);
  });

  describe("test frax and steth strategy", async function () {
    before(async function () {
      this.usdc = <ERC20>(
        await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, MULTI_CHAIN_VAULT_TOKENS["mainnet"].USDC.address)
      );
      this.weth = <ERC20>(
        await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, MULTI_CHAIN_VAULT_TOKENS["mainnet"].WETH.address)
      );

      // const curveMetapoolDepositAdapterArtifact = await artifacts.readArtifact("CurveMetapoolDepositAdapter");
      const curveSwapPoolAdapterArtifact = await artifacts.readArtifact("CurveSwapPoolAdapter");
      const curveMetapoolSwapAdapterArtifact = await artifacts.readArtifact("CurveMetapoolSwapAdapter");
      const lidoAdapterArtifact = await artifacts.readArtifact("LidoAdapter");

      // // deploy curve metapool deposit adapter
      // const curveMetapoolDepositAdapter = await deployContract(
      //   this.signers.operator,
      //   curveMetapoolDepositAdapterArtifact,
      //   [this.registryV2.address],
      // );
      // console.log("curveMetapoolDepositAdapter ", curveMetapoolDepositAdapter.address);
      // deploy curve swap pool
      const curveSwapPoolAdapter = await deployContract(this.signers.operator, curveSwapPoolAdapterArtifact, [
        this.registryV2.address,
      ]);
      // deploy curve metapool swap adapter
      const curveMetapoolSwapAdapter = await deployContract(this.signers.operator, curveMetapoolSwapAdapterArtifact, [
        this.registryV2.address,
      ]);
      // deploy lido adapter
      const lidoAdapter = await deployContract(this.signers.operator, lidoAdapterArtifact, [this.registryV2.address]);
      // approveliquiditypools and map to adapters
      const registryV2Instance = await ethers.getContractAt(this.registryV2Artifact.abi, this.registryV2.address);
      await registryV2Instance
        .connect(this.signers.operator)
        ["approveLiquidityPoolAndMapToAdapter((address,address)[])"]([
          // ["0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B", curveMetapoolDepositAdapter.address],
          ["0xbE0F6478E0E4894CFb14f32855603A083A57c7dA", ConvexFinanceAdapterAddress],
          ["0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7", curveSwapPoolAdapter.address],
          ["0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B", curveMetapoolSwapAdapter.address],
          ["0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", lidoAdapter.address],
          ["0xDC24316b9AE028F1497c275EB9192a3Ea0f67022", curveSwapPoolAdapter.address],
          ["0x9518c9063eB0262D791f38d8d6Eb0aca33c63ed0", ConvexFinanceAdapterAddress],
          ["0x5a6A4D54456819380173272A5E8E9B9904BdF41B", curveMetapoolSwapAdapter.address],
          ["0xabB54222c2b77158CC975a2b715a3d703c256F05", ConvexFinanceAdapterAddress],
        ]);
      await registryV2Instance.connect(this.signers.riskOperator)["rateLiquidityPool((address,uint8)[])"]([
        // ["0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B", 80],
        ["0xbE0F6478E0E4894CFb14f32855603A083A57c7dA", 80],
        ["0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7", 80],
        ["0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B", 80],
        ["0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", 80],
        ["0xDC24316b9AE028F1497c275EB9192a3Ea0f67022", 80],
        ["0x9518c9063eB0262D791f38d8d6Eb0aca33c63ed0", 80],
        ["0x5a6A4D54456819380173272A5E8E9B9904BdF41B", 80],
        ["0xabB54222c2b77158CC975a2b715a3d703c256F05", 80],
      ]);

      // console.log(
      //   "curvemetapooldeposit adapter from registry ",
      //   await this.registryV2.getLiquidityPoolToAdapter("0xA79828DF1850E8a3A3064576f380D90aECDD3359"),
      // );

      await this.registryV2
        .connect(this.signers.operator)
        ["setTokensHashToTokens(bytes32,address[])"](MULTI_CHAIN_VAULT_TOKENS["mainnet"].USDC.hash, [
          MULTI_CHAIN_VAULT_TOKENS["mainnet"].USDC.address,
        ]);
      await this.registryV2
        .connect(this.signers.operator)
        ["setTokensHashToTokens(bytes32,address[])"](MULTI_CHAIN_VAULT_TOKENS["mainnet"].WETH.hash, [
          MULTI_CHAIN_VAULT_TOKENS["mainnet"].WETH.address,
        ]);
      await this.opUSDCgrowV2
        .connect(this.signers.operator)
        .setUnderlyingTokenAndTokensHash(this.usdc.address, MULTI_CHAIN_VAULT_TOKENS["mainnet"].USDC.hash);
      await this.opWETHgrowV2
        .connect(this.signers.operator)
        .setUnderlyingTokenAndTokensHash(this.weth.address, MULTI_CHAIN_VAULT_TOKENS["mainnet"].WETH.hash);

      await this.opUSDCgrowV2.connect(this.signers.governance).setUnpaused(true);
      await this.opWETHgrowV2.connect(this.signers.governance).setUnpaused(true);
      await this.opUSDCgrowV2.connect(this.signers.financeOperator).setValueControlParams(
        "100000000000", // 100,000 USDC userdepositcap
        "1000000000", // 1000 USDC minimum deposit
        "1000000000000", // 1,000,000 USDC TVL
        "100", // 0.01% vault jump
      );
      await this.opWETHgrowV2.connect(this.signers.financeOperator).setValueControlParams(
        "100000000000000000000000", // 100,000 WETH userdepositcap
        "1000000000000000000000", // 1000 USDC minimum deposit
        "1000000000000000000000000", // 1,000,000 USDC TVL
        "100", // 0.01% vault jump
      );
    });

    it.only("lp token balance should be as expected after rebalance of opUSDCgrowV2 to usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-CurveSwapPool-MIM-3LP3CRV-f-DEPOSIT-Convex-cvxMIM-3LP3CRV-f", async function () {
      await this.strategyProviderV2
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS["mainnet"].USDC.hash, mimStrategySteps);
      await this.opUSDCgrowV2.rebalance();
      // assert invest strategy hash
      expect(await this.opUSDCgrowV2.getInvestStrategySteps()).to.deep.eq(mimStrategySteps.map(v => Object.values(v)));
      expect(await this.opUSDCgrowV2.investStrategyHash()).to.eq(
        generateStrategyHashV2(mimStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS["mainnet"].USDC.hash),
      );
      expect(await this.usdc.balanceOf(this.opUSDCgrowV2.address)).to.eq("0");
      const expectedLPTokenBalance = await getLastStrategyStepBalanceLP(
        mimStrategySteps as StrategyStepType[],
        this.registryV2,
        this.opUSDCgrowV2,
        this.usdc,
      );
      const actualLPTokenBalance = await this.opUSDCgrowV2.getLastStrategyStepBalanceLP(mimStrategySteps);
      expect(actualLPTokenBalance).to.eq(expectedLPTokenBalance);
    });

    it.only("lp token balance should be as expected after rebalance of opWETHgrowV2 to weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV", async function () {
      await this.strategyProviderV2
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS["mainnet"].WETH.hash, convexSteCRVStrategySteps);
      await this.opWETHgrowV2.rebalance();
      expect(await this.opWETHgrowV2.getInvestStrategySteps()).to.deep.eq(
        convexSteCRVStrategySteps.map(v => Object.values(v)),
      );
      expect(await this.opWETHgrowV2.investStrategyHash()).to.eq(
        generateStrategyHashV2(convexSteCRVStrategyStepsContract, MULTI_CHAIN_VAULT_TOKENS["mainnet"].WETH.hash),
      );
      expect(await this.weth.balanceOf(this.opWETHgrowV2.address)).to.eq("0");
      const expectedLPTokenBalance = await getLastStrategyStepBalanceLP(
        convexSteCRVStrategySteps as StrategyStepType[],
        this.registryV2,
        this.opWETHgrowV2,
        this.weth,
      );
      const actualLPTokenBalance = await this.opWETHgrowV2.getLastStrategyStepBalanceLP(convexSteCRVStrategySteps);
      expect(actualLPTokenBalance).to.eq(expectedLPTokenBalance);
      expect(expectedLPTokenBalance).to.gt("0");
    });

    it.only("underlying token balance of opUSDCgrowV2 should be expected after pausing", async function () {
      const underlyingTokenBalanceBefore = await this.usdc.balanceOf(this.opUSDCgrowV2.address);
      await this.opUSDCgrowV2.connect(this.signers.governance).setUnpaused(false);
      expect((await this.opUSDCgrowV2.getInvestStrategySteps()).length).to.eq(0);
      expect(await this.opUSDCgrowV2.investStrategyHash()).to.eq(ethers.constants.HashZero);
      const underlyingTokenBalanceAfter = await this.usdc.balanceOf(this.opUSDCgrowV2.address);
      expect(underlyingTokenBalanceAfter).gt(underlyingTokenBalanceBefore);
      const lpTokenBalance = await this.opUSDCgrowV2.getLastStrategyStepBalanceLP(mimStrategySteps);
      expect(lpTokenBalance).to.eq("0");
      expect(await this.opUSDCgrowV2.investStrategyHash()).to.eq(ethers.constants.HashZero);
    });

    it.only("underlying token balance of opWETHgrowV2 should be expected after pausing", async function () {
      const underlyingTokenBalanceBefore = await this.weth.balanceOf(this.opWETHgrowV2.address);
      await this.opWETHgrowV2.connect(this.signers.governance).setUnpaused(false);
      expect((await this.opWETHgrowV2.getInvestStrategySteps()).length).to.eq(0);
      expect(await this.opWETHgrowV2.investStrategyHash()).to.eq(ethers.constants.HashZero);
      const underlyingTokenBalanceAfter = await this.weth.balanceOf(this.opWETHgrowV2.address);
      expect(underlyingTokenBalanceAfter).gt(underlyingTokenBalanceBefore);
      const lpTokenBalance = await this.opWETHgrowV2.getLastStrategyStepBalanceLP(mimStrategySteps);
      expect(lpTokenBalance).to.eq("0");
      expect(await this.opWETHgrowV2.investStrategyHash()).to.eq(ethers.constants.HashZero);
    });

    it("unpause opUSDCgrowV2 and rebalance to mim", async function () {
      console.log(
        "USDC before rebalance to mim ",
        await (await this.usdc.balanceOf(this.opUSDCgrowV2.address)).toString(),
      );
      await this.opUSDCgrowV2.connect(this.signers.governance).setUnpaused(true);
      const convexFrax =
        StrategiesByTokenByChain["mainnet"].USDC[
          "usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-CurveMetapoolSwapPool-FRAX3CRV-f-DEPOSIT-Convex-cvxFRAX3CRV-f"
        ].strategy;
      const convexFraxStrategySteps = convexFrax.map(strategy => ({
        pool: strategy.contract,
        outputToken: strategy.outputToken,
        isBorrow: false,
      }));
      await this.strategyProviderV2
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS["mainnet"].USDC.hash, convexFraxStrategySteps);
      await this.opUSDCgrowV2.rebalance();
      console.log(
        "USDC after rebalance to mim ",
        await (await this.usdc.balanceOf(this.opUSDCgrowV2.address)).toString(),
      );
    });

    it("userDepositVault() for opWETHgrow", async function () {
      console.log("user deposit on v2");
      console.log(
        "weth - getLastStrategyStepBalance ",
        await (
          await this.opWETHgrowV2.getLastStrategyStepBalanceLP(await this.opWETHgrowV2.getInvestStrategySteps())
        ).toString(),
      );
      console.log("weth strategy : ", await this.opWETHgrowV2.investStrategyHash());
      console.log("WETH after ", await this.weth.balanceOf(this.opWETHgrowV2.address));
      await this.opWETHgrowV2.connect(this.signers.governance).setUnpaused(false);
      console.log("WETH after pause", await this.weth.balanceOf(this.opWETHgrowV2.address));
      console.log("weth strategy after pause: ", await this.opWETHgrowV2.investStrategyHash());
    });
    it("rebalance() for opUSDCgrow", async function () {
      console.log("rebalance on v2");
    });
    it("userWithdrawVault()", async function () {
      console.log("user withdraw on v2");
    });
  });
});
