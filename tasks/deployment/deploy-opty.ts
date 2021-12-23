import { task, types } from "hardhat/config";
import { insertContractIntoDB } from "../../helpers/db";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { isAddress, deployContract, executeFunc } from "../../helpers/helpers";
import TASKS from "../task-names";

task(TASKS.DEPLOYMENT_TASKS.DEPLOY_OPTY.NAME, TASKS.DEPLOYMENT_TASKS.DEPLOY_OPTY.DESCRIPTION)
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("deployedonce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ deployedonce, insertindb, registry }, hre) => {
    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    try {
      console.log("Deploying OPTY...");
      const [owner] = await hre.ethers.getSigners();
      const opty = await deployContract(hre, ESSENTIAL_CONTRACTS.OPTY, deployedonce, owner, [
        registry,
        100000000000000,
      ]);
      console.log("Finished deploying OPTY");
      console.log(`Contract opty : ${opty.address}`);
      console.log("Registering OPTY...");
      const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);
      await executeFunc(registryContract, owner, "setOPTY(address)", [opty.address]);
      console.log("Registered OPTY.");
      if (insertindb) {
        const err = await insertContractIntoDB(`opty`, opty.address);
        if (err !== "") {
          throw err;
        }
      }
    } catch (error) {
      console.error(`${TASKS.DEPLOYMENT_TASKS.DEPLOY_OPTY.NAME}: `, error);
      throw error;
    }
  });
