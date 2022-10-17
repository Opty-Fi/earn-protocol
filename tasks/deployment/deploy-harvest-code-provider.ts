import { task, types } from "hardhat/config";
import { deployContract, isAddress, executeFunc } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import TASKS from "../task-names";

task(
  TASKS.DEPLOYMENT_TASKS.DEPLOY_HARVEST_CODE_PROVIDER.NAME,
  TASKS.DEPLOYMENT_TASKS.DEPLOY_HARVEST_CODE_PROVIDER.DESCRIPTION,
)
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("deployedOnce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .setAction(async ({ deployedOnce, registry }, hre) => {
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
        deployedOnce,
        owner,
        [registry],
      );
      console.log("Finished deploying harvestCodeProvider");
      console.log(`Contract harvestCodeProvider : ${harvestCodeProvider.address}`);
      const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);
      await executeFunc(registryContract, owner, "setHarvestCodeProvider(address)", [harvestCodeProvider.address]);
    } catch (error) {
      console.error(`${TASKS.DEPLOYMENT_TASKS.DEPLOY_HARVEST_CODE_PROVIDER.NAME}: `, error);
      throw error;
    }
  });
