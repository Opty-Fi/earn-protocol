import { task, types } from "hardhat/config";
import { deployRegistry } from "../../helpers/contracts-deployments";
import { insertContractIntoDB } from "../../helpers/db";

task("deploy-registry", "Deploy Registry")
  .addParam("deployedonce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ deployedonce, insertindb }, hre) => {
    const [owner] = await hre.ethers.getSigners();

    const registry = await deployRegistry(hre, owner, deployedonce);

    console.log(`Contract registry : ${registry.address}`);

    if (insertindb) {
      const err = await insertContractIntoDB(`registry`, registry.address);
      if (err !== "") {
        console.log(err);
      }
    }
  });
