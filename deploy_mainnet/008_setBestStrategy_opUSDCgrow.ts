import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { StrategiesByTokenByChain } from "../helpers/data/adapter-with-strategies";

const func: DeployFunction = async ({ ethers, deployments }: HardhatRuntimeEnvironment) => {
  const opUSDCgrowProxyAddress = "0x6d8bfdb4c4975bb086fc9027e48d5775f609ff88";
  const strategyProviderAddress = await (await deployments.get("StrategyProvider")).address;
  const strategyProviderInstance = await ethers.getContractAt(
    ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER,
    strategyProviderAddress,
  );
  const opUSDCgrowInstance = await ethers.getContractAt("Vault", opUSDCgrowProxyAddress);

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
    await strategyProviderInstance.setBestStrategy(
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
};
export default func;
func.tags = ["SetBestStrategyopUSDCgrow"];
func.dependencies = ["ConfigopUSDCgrow", "DeployopUSDCgrow", "UpgradeopUSDCgrow"];
