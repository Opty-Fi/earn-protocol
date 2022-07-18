import { task, types } from "hardhat/config";
import { deployStrategyManager } from "../../helpers/contracts-deployments";
import TASKS from "../task-names";

task(TASKS.DEPLOYMENT_TASKS.DEPLOY_STRATEGY_MANAGER.NAME, TASKS.DEPLOYMENT_TASKS.DEPLOY_STRATEGY_MANAGER.DESCRIPTION)
  .addParam("deployedOnce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .setAction(async ({ deployedOnce }, hre) => {
    try {
      const [owner] = await hre.ethers.getSigners();
      console.log("Deploying StrategyManager...");
      const strategyManager = await deployStrategyManager(hre, owner, deployedOnce);
      console.log("Finished deploying StrategyManager");
      console.log(`Contract StrategyManager : ${strategyManager.address}`);
    } catch (error) {
      console.error(`${TASKS.DEPLOYMENT_TASKS.DEPLOY_STRATEGY_MANAGER.NAME}: `, error);
      throw error;
    }
  });
