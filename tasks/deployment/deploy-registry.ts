import { task, types } from "hardhat/config";
import { deployRegistry } from "../../helpers/contracts-deployments";
import TASKS from "../task-names";

task(TASKS.DEPLOYMENT_TASKS.DEPLOY_REGISTRY.NAME, TASKS.DEPLOYMENT_TASKS.DEPLOY_REGISTRY.DESCRIPTION)
  .addParam("deployedonce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ deployedonce }, hre) => {
    try {
      const [owner] = await hre.ethers.getSigners();
      console.log("Deploying Registry...");
      const registry = await deployRegistry(hre, owner, deployedonce);
      console.log("Finished deploying registry");
      console.log(`Contract registry : ${registry.address}`);
    } catch (error) {
      console.error(`${TASKS.DEPLOYMENT_TASKS.DEPLOY_REGISTRY.NAME}: `, error);
      throw error;
    }
  });
