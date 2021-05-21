import { task, types } from "hardhat/config";
import { insertContractIntoDB } from "../../helpers/db";
import { deployContract } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { isAddress } from "../../helpers/helpers";

task("deploy-strategy-manager", "Deploy Strategy Manager")
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("harvestcodeprovider", "the address of harvestCodeProvider", "", types.string)
  .addParam("deployedonce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ deployedonce, insertindb, registry, harvestcodeprovider }, hre) => {
    const [owner] = await hre.ethers.getSigners();

    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    if (harvestcodeprovider === "") {
      throw new Error("harvestcodeprovider cannot be empty");
    }

    if (!isAddress(harvestcodeprovider)) {
      throw new Error("harvestcodeprovider address is invalid");
    }

    const strategyManagerContract = await deployContract(
      hre,
      ESSENTIAL_CONTRACTS.STRATEGY_MANAGER,
      deployedonce,
      owner,
      [registry, harvestcodeprovider],
    );

    console.log(`Contract strategyManager : ${strategyManagerContract.address}`);

    if (insertindb) {
      const err = await insertContractIntoDB(`strategyManager`, strategyManagerContract.address);
      if (err !== "") {
        console.log(err);
      }
    }
  });
