import { task, types } from "hardhat/config";
import { insertContractIntoDB } from "../../helpers/db";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { isAddress, executeFunc, deployContract } from "../../helpers/helpers";
import TASKS from "../task-names";

task(TASKS.DEPLOYMENT_TASKS.DEPLOY_STRATEGY_PROVIDER.NAME, TASKS.DEPLOYMENT_TASKS.DEPLOY_STRATEGY_PROVIDER.DESCRIPTION)
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
      console.log("Deploying StrategyProvider...");
      const strategyProvider = await deployContract(hre, ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER, deployedonce, owner, [
        registry,
      ]);
      console.log("Finished deploying strategyProvider");
      console.log(`Contract strategyProvider : ${strategyProvider.address}`);
      console.log("Registering StrategyProvider...");
      const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);
      await executeFunc(registryContract, owner, "setStrategyProvider(address)", [strategyProvider.address]);
      console.log("Registered StrategyProvider.");
      if (insertindb) {
        const err = await insertContractIntoDB(`strategyProvider`, strategyProvider.address);
        if (err !== "") {
          throw err;
        }
      }
    } catch (error) {
      console.error(`${TASKS.DEPLOYMENT_TASKS.DEPLOY_STRATEGY_PROVIDER.NAME}: `, error);
      throw error;
    }
  });
