import { task, types } from "hardhat/config";
import { insertContractIntoDB } from "../../helpers/db";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { isAddress, deployContract, executeFunc } from "../../helpers/helpers";
import TASKS from "../task-names";

task(TASKS.DEPLOYMENT_TASKS.DEPLOY_APR_ORACLE.NAME, TASKS.DEPLOYMENT_TASKS.DEPLOY_APR_ORACLE.DESCRIPTION)
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
      const [owner] = await hre.ethers.getSigners();
      console.log("Deploying AprOracle...");
      const aprOracle = await deployContract(hre, ESSENTIAL_CONTRACTS.APR_ORACLE, deployedonce, owner, [registry]);
      console.log("Finished deploying AprOracle");
      console.log(`Contract aprOracle : ${aprOracle.address}`);
      console.log("Registering aprOracle...");
      const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);
      await executeFunc(registryContract, owner, "setAPROracle(address)", [aprOracle.address]);
      console.log("Registered aprOracle");
      if (insertindb) {
        const err = await insertContractIntoDB(`aprOracle`, aprOracle.address);
        if (err !== "") {
          throw err;
        }
      }
    } catch (error) {
      console.error(`${TASKS.DEPLOYMENT_TASKS.DEPLOY_APR_ORACLE.NAME}: `, error);
      throw error;
    }
  });
