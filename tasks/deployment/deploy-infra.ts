import { task, types } from "hardhat/config";
import { CONTRACTS } from "../../helpers/type";
import { deployEssentialContracts } from "../../helpers/contracts-deployments";
import TASKS from "../task-names";

task(TASKS.DEPLOYMENT_TASKS.DEPLOY_INFRA.NAME, TASKS.DEPLOYMENT_TASKS.DEPLOY_INFRA.DESCRIPTION)
  .addParam("deployedOnce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .setAction(async ({ deployedOnce }, hre) => {
    try {
      console.log(`\tDeploying Infrastructure contracts ...`);
      const [owner] = await hre.ethers.getSigners();
      const essentialContracts: CONTRACTS = await deployEssentialContracts(hre, owner, deployedOnce);
      const essentialContractNames = Object.keys(essentialContracts);
      for (let i = 0; i < essentialContractNames.length; i++) {
        console.log(
          `${essentialContractNames[i].toUpperCase()} address : ${
            essentialContracts[essentialContractNames[i]].address
          }`,
        );
      }
      console.log("Finished deploying infrastructure contracts");
    } catch (error) {
      console.error(`${TASKS.DEPLOYMENT_TASKS.DEPLOY_INFRA.NAME}: `, error);
      throw error;
    }
  });
