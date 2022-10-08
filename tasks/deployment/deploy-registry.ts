import { task, types } from "hardhat/config";
import { deployRegistry } from "../../helpers/contracts-deployments";
import TASKS from "../task-names";

task(TASKS.DEPLOYMENT_TASKS.DEPLOY_REGISTRY.NAME, TASKS.DEPLOYMENT_TASKS.DEPLOY_REGISTRY.DESCRIPTION)
  .addParam("deployedOnce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .setAction(async ({ deployedOnce }, hre) => {
    try {
      const [owner] = await hre.ethers.getSigners();
      console.log("Deploying Registry...");
      const registry = await deployRegistry(hre, owner, deployedOnce);
      console.log("Finished deploying registry");
      console.log(`Contract registry : ${registry.address}`);
    } catch (error) {
      console.error(`${TASKS.DEPLOYMENT_TASKS.DEPLOY_REGISTRY.NAME}: `, error);
      throw error;
    }
  });
