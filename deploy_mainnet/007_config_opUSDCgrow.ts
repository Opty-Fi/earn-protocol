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
    await opUSDCgrowInstance.connect(governanceSigner).setRiskProfileCode(expectedRiskProfileCode);
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
    await opUSDCgrowInstance.connect(governanceSigner).setVaultConfiguration(expectedConfig);
  }

  console.log("Operator setting UnderlyingTokensHash...");
  console.log("\n");

  const tokensHash = await opUSDCgrowInstance.underlyingTokensHash();

  if (tokensHash != MULTI_CHAIN_VAULT_TOKENS["mainnet"].USDC.hash) {
    console.log("setting tokenshash..");
    console.log("\n");
    await opUSDCgrowInstance
      .connect(operatorSigner)
      .setUnderlyingTokensHash(MULTI_CHAIN_VAULT_TOKENS["mainnet"].USDC.hash);
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
    await opUSDCgrowInstance
      .connect(financeOperatorSigner)
      .setValueControlParams(expectedUserDepositCapUT, expectedMinimumDepositValueUT, expectedTotalValueLockedLimitUT);
  }

  console.log("unpause opUSDCgrow");
  console.log("\n");
  const vaultConfiguration = await opUSDCgrowInstance.vaultConfiguration();
  const unpause = getUnpause(vaultConfiguration);

  if (!unpause) {
    console.log("Governance unpausing opUSDCgrow vault...");
    console.log("\n");
    await opUSDCgrowInstance.connect(governanceSigner).setUnpaused(true);
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
    await opUSDCgrowInstance.connect(governanceSigner).setWhitelistedAccountsRoot(expectedAccountsRoot);
  } else {
    console.log("whitelisted accounts root for opUSDCgrow is as expected");
    console.log("\n");
  }

  const strategyProviderAddress = await (await deployments.get("StrategyProvider")).address;
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
      "usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-CurveMetapoolSwapPool-FRAX3CRV-f-DEPOSIT-Convex-cvxFRAX3CRV-f"
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
    await strategyProviderInstance.connect(strategyOperatorSigner).setBestStrategy(
      "1",
      MULTI_CHAIN_VAULT_TOKENS["mainnet"].USDC.hash,
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
  console.log("Next Best Strategy ", await opUSDCgrowInstance.getNextBestInvestStrategy());
};
export default func;
func.tags = ["ConfigopUSDCgrow"];
func.dependencies = ["StrategyProvider"];
