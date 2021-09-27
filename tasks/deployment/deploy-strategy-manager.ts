import { task, types } from "hardhat/config";
import { insertContractIntoDB } from "../../helpers/db";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { isAddress, executeFunc, deployContract } from "../../helpers/helpers";
import { DEPLOY_STRATEGY_MANAGER } from "../task-names";

task(DEPLOY_STRATEGY_MANAGER, "Deploy Strategy Manager")
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("deployedonce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ deployedonce, insertindb, registry }, hre) => {
    const [owner] = await hre.ethers.getSigners();

    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    const strategyManagerContract = await deployContract(
      hre,
      ESSENTIAL_CONTRACTS.STRATEGY_MANAGER,
      deployedonce,
      owner,
      [registry],
    );

    console.log(`Contract strategyManager : ${strategyManagerContract.address}`);

    const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);

    await executeFunc(registryContract, owner, "setStrategyManager(address)", [strategyManagerContract.address]);

    if (insertindb) {
      const err = await insertContractIntoDB(`strategyManager`, strategyManagerContract.address);
      if (err !== "") {
        console.log(err);
      }
    }
  });
