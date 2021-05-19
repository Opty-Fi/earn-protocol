import { task, types } from "hardhat/config";
import { insertContractIntoDB } from "../../helpers/db";
import { deployContract } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants";
task("deploy-strategy-provider", "Deploy Strategy Provider")
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("deployedonce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ deployedonce, insertindb, registry }, hre) => {
    const [owner] = await hre.ethers.getSigners();

    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    const strategyProvider = await deployContract(hre, ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER, deployedonce, owner, [
      registry,
    ]);

    console.log(`Contract strategyProvider : ${strategyProvider.address}`);

    if (insertindb) {
      const err = await insertContractIntoDB(`strategyProvider`, strategyProvider.address);
      if (err !== "") {
        console.log(err);
      }
    }
  });
