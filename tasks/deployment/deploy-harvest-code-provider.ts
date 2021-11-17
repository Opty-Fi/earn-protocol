import { task, types } from "hardhat/config";
import { insertContractIntoDB } from "../../helpers/db";
import { deployContract, isAddress, executeFunc } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { DEPLOY_HARVEST_CODE_PROVIDER } from "../task-names";

task(DEPLOY_HARVEST_CODE_PROVIDER, "Deploy Harvest Code Provider")
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
      console.log("Deploying harvestCodeProvider...");
      const harvestCodeProvider = await deployContract(
        hre,
        ESSENTIAL_CONTRACTS.HARVEST_CODE_PROVIDER,
        deployedonce,
        owner,
        [registry],
      );
      console.log("Finished deploying harvestCodeProvider");
      console.log(`Contract harvestCodeProvider : ${harvestCodeProvider.address}`);
      const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);
      await executeFunc(registryContract, owner, "setHarvestCodeProvider(address)", [harvestCodeProvider.address]);
      if (insertindb) {
        const err = await insertContractIntoDB(`harvestCodeProvider`, harvestCodeProvider.address);
        if (err !== "") {
          throw err;
        }
      }
    } catch (error) {
      console.error(`${DEPLOY_HARVEST_CODE_PROVIDER}: `, error);
      throw error;
    }
  });
