import { task, types } from "hardhat/config";
import { insertContractIntoDB } from "../../helpers/db";
import { deployContract, isAddress, executeFunc, getContractInstance } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { DEPLOY_HARVEST_CODE_PROVIDER } from "../task-names";

task(DEPLOY_HARVEST_CODE_PROVIDER, "Deploy Harvest Code Provider")
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

    const harvestCodeProvider = await deployContract(
      hre,
      ESSENTIAL_CONTRACTS.HARVEST_CODE_PROVIDER,
      deployedonce,
      owner,
      [registry],
    );

    await executeFunc(registry, owner, "setHarvestCodeProvider(address)", [harvestCodeProvider.address]);

    console.log("Finished deploying harvestCodeProvider");

    console.log(`Contract harvestCodeProvider : ${harvestCodeProvider.address}`);

    const registryContract = await getContractInstance(hre, ESSENTIAL_CONTRACTS.REGISTRY, registry);

    await executeFunc(registryContract, owner, "setHarvestCodeProvider(address)", [harvestCodeProvider.address]);

    if (insertindb) {
      const err = await insertContractIntoDB(`harvestCodeProvider`, harvestCodeProvider.address);
      if (err !== "") {
        console.log(err);
      }
    }
  });
