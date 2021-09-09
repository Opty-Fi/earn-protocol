import { task, types } from "hardhat/config";
import { ADAPTER } from "../../helpers/constants";
import { isAddress } from "../../helpers/helpers";
import { DEPLOY_ADAPTERS } from "../task-names";

task(DEPLOY_ADAPTERS, "Deploy Adapter contracts")
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("deployedonce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .addParam("insertindb", "insert the deployed contract addresses in DB", false, types.boolean)
  .setAction(async ({ registry, deployedonce, insertindb }, hre) => {
    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    for (const adapter of ADAPTER) {
      try {
        await hre.run("deploy-adapter", {
          registry: registry,
          name: adapter,
          insertindb: insertindb,
          deployedonce: deployedonce,
        });
      } catch (error) {
        console.log(adapter, error);
      }
    }
    console.log("Finished deploying adapters");
  });
