import { task, types } from "hardhat/config";
import { ADAPTERS } from "../../helpers/constants/adapters";
import { isAddress } from "../../helpers/helpers";
import TASKS from "../task-names";

task(TASKS.DEPLOYMENT_TASKS.DEPLOY_ADAPTERS.NAME, TASKS.DEPLOYMENT_TASKS.DEPLOY_ADAPTERS.DESCRIPTION)
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("deployedonce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .setAction(async ({ registry, deployedonce }, hre) => {
    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    try {
      for (const adapter of ADAPTERS) {
        try {
          await hre.run(TASKS.DEPLOYMENT_TASKS.DEPLOY_ADAPTER.NAME, {
            registry: registry,
            name: adapter,
            deployedonce: deployedonce,
          });
          console.log("--------------------");
        } catch (error) {
          throw new Error(`${adapter}, ${error}`);
        }
      }
      console.log("Finished deploying adapters");
    } catch (error) {
      console.error(`${TASKS.DEPLOYMENT_TASKS.DEPLOY_ADAPTERS.NAME}: `, error);
      throw error;
    }
  });
