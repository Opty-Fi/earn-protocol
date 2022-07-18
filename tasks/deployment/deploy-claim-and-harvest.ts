import { task, types } from "hardhat/config";
import { deployClaimAndHarvest } from "../../helpers/contracts-deployments";
import TASKS from "../task-names";

task(TASKS.DEPLOYMENT_TASKS.DEPLOY_CLAIM_AND_HARVEST.NAME, TASKS.DEPLOYMENT_TASKS.DEPLOY_CLAIM_AND_HARVEST.DESCRIPTION)
  .addParam("deployedOnce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .setAction(async ({ deployedOnce }, hre) => {
    try {
      const [owner] = await hre.ethers.getSigners();
      console.log("Deploying claimAndHarvest...");
      const claimAndHarvest = await deployClaimAndHarvest(hre, owner, deployedOnce);
      console.log("Finished deploying claimAndHarvest");
      console.log(`Contract claimAndHarvest : ${claimAndHarvest.address}`);
    } catch (error) {
      console.error(`${TASKS.DEPLOYMENT_TASKS.DEPLOY_CLAIM_AND_HARVEST.NAME}: `, error);
      throw error;
    }
  });
