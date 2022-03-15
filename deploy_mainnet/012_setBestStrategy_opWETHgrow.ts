import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { StrategiesByTokenByChain } from "../helpers/data/adapter-with-strategies";

const func: DeployFunction = async ({ ethers, deployments }: HardhatRuntimeEnvironment) => {
  const opWETHgrowProxyAddress = "0xff2fbd9fbc6d03baa77cf97a3d5671bea183b9a8";
  const strategyProviderAddress = await (await deployments.get("StrategyProvider")).address;
  const strategyProviderInstance = await ethers.getContractAt(
    ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER,
    strategyProviderAddress,
  );
  const opWETHgrowInstance = await ethers.getContractAt("Vault", opWETHgrowProxyAddress);

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
    await strategyProviderInstance.setBestStrategy(
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
};
export default func;
func.tags = ["SetBestStrategyopWETHgrow"];
func.dependencies = ["ConfigopWETHgrow", "DeployopWETHgrow", "UpgradeopWETHgrow"];
