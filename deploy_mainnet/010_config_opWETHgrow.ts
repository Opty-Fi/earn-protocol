import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { StrategiesByTokenByChain } from "../helpers/data/adapter-with-strategies";
import { getRiskProfileCode, getUnpause } from "../helpers/utils";

const func: DeployFunction = async ({ ethers, deployments }: HardhatRuntimeEnvironment) => {
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
    await opWETHgrowInstance.connect(governanceSigner).setRiskProfileCode(expectedRiskProfileCode);
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
    await opWETHgrowInstance.connect(governanceSigner).setVaultConfiguration(expectedConfig);
  }

  console.log("Operator setting UnderlyingTokensHash...");
  console.log("\n");

  const tokensHash = await opWETHgrowInstance.underlyingTokensHash();

  if (tokensHash != MULTI_CHAIN_VAULT_TOKENS["mainnet"].WETH.hash) {
    console.log("setting tokenshash..");
    console.log("\n");
    await opWETHgrowInstance
      .connect(operatorSigner)
      .setUnderlyingTokensHash(MULTI_CHAIN_VAULT_TOKENS["mainnet"].WETH.hash);
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
    await opWETHgrowInstance
      .connect(financeOperatorSigner)
      .setValueControlParams(expectedUserDepositCapUT, expectedMinimumDepositValueUT, expectedTotalValueLockedLimitUT);
  }

  console.log("unpause opWETHgrow");
  console.log("\n");
  const vaultConfiguration = await opWETHgrowInstance.vaultConfiguration();
  const unpause = getUnpause(vaultConfiguration);

  if (!unpause) {
    console.log("Governance unpausing opWETHgrow vault...");
    console.log("\n");
    await opWETHgrowInstance.connect(governanceSigner).setUnpaused(true);
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
    await opWETHgrowInstance.connect(governanceSigner).setWhitelistedAccountsRoot(expectedAccountsRoot);
  } else {
    console.log("whitelisted accounts root for opWETHgrow is as expected");
    console.log("\n");
  }

  const strategyProviderAddress = await (await deployments.get("StrategyProvider")).address;
  const strategyProviderInstance = await ethers.getContractAt(
    ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER,
    strategyProviderAddress,
  );
  const strategyOperatorSigner = await ethers.getSigner(await registryV2Instance.strategyOperator());

  console.log("Operator setting best strategy for opWETHgrow...");
  console.log("\n");

  const currentBestStrategySteps = await strategyProviderInstance.getRpToTokenToBestStrategy(
    "1",
    MULTI_CHAIN_VAULT_TOKENS["mainnet"].WETH.hash,
  );
  const currentBestStrategyHash = await opWETHgrowInstance.computeInvestStrategyHash(currentBestStrategySteps);
  const expectedStrategySteps =
    StrategiesByTokenByChain["mainnet"].WETH[
      "weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV"
    ].strategy;
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
    await strategyProviderInstance.connect(strategyOperatorSigner).setBestStrategy(
      "1",
      MULTI_CHAIN_VAULT_TOKENS["mainnet"].WETH.hash,
      expectedStrategySteps.map(x => ({
        pool: x.contract,
        outputToken: x.outputToken,
        isBorrow: x.isBorrow,
      })),
    );
  } else {
    console.log("best strategy is upto date.");
    console.log("\n");
  }
  console.log("Next Best Strategy ", await opWETHgrowInstance.getNextBestInvestStrategy());
  console.log("\n");
};
export default func;
func.tags = ["ConfigopWETHgrow"];
func.dependencies = ["ConfigopUSDCgrow"];
