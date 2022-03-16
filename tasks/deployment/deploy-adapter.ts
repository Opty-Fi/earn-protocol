import { task, types } from "hardhat/config";
import { Contract } from "ethers";
import { deployAdapter } from "../../helpers/contracts-deployments";
import { isAddress } from "../../helpers/helpers";
import { ADAPTERS } from "../../helpers/constants/adapters";
import TASKS from "../task-names";

task(TASKS.DEPLOYMENT_TASKS.DEPLOY_ADAPTER.NAME, TASKS.DEPLOYMENT_TASKS.DEPLOY_ADAPTER.DESCRIPTION)
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("name", "the name of adapter", "", types.string)
  .addParam("deployedonce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .setAction(async ({ registry, name, deployedonce, insertindb }, hre) => {
    if (name === "") {
      throw new Error("name cannot be empty");
    }

    if (!ADAPTERS.map(adapter => adapter.toUpperCase()).includes(name.toUpperCase())) {
      throw new Error("adapter does not exist");
    }

    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    try {
      const [owner] = await hre.ethers.getSigners();
      const adaptersContract: Contract = await deployAdapter(hre, owner, name, registry, deployedonce);
      console.log("Finished deploying adapter");
      console.log(`${name} address : ${adaptersContract.address}`);
    } catch (error) {
      console.error(`${TASKS.DEPLOYMENT_TASKS.DEPLOY_ADAPTER.NAME}: `, error);
      throw new Error();
    }
  });
