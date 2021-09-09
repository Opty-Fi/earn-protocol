import { task, types } from "hardhat/config";
import { Contract } from "ethers";
import { deployAdapter } from "../../helpers/contracts-deployments";
import { insertContractIntoDB } from "../../helpers/db";
import { isAddress } from "../../helpers/helpers";
import { ADAPTER } from "../../helpers/constants";
import { DEPLOY_ADAPTER } from "../task-names";

task(DEPLOY_ADAPTER, "Deploy Adapter contract")
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("name", "the name of adapter", "", types.string)
  .addParam("deployedonce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .addParam("insertindb", "insert the deployed contract addresses in DB", false, types.boolean)
  .setAction(async ({ registry, name, deployedonce, insertindb }, hre) => {
    const [owner] = await hre.ethers.getSigners();

    if (name === "") {
      throw new Error("name cannot be empty");
    }

    if (!ADAPTER.map(adapter => adapter.toUpperCase()).includes(name.toUpperCase())) {
      throw new Error("adapter does not exist");
    }

    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    const adaptersContract: Contract = await deployAdapter(hre, owner, name, registry, deployedonce);

    console.log("Finished deploying adapter");
    console.log(`${name} address : ${adaptersContract.address}`);

    if (insertindb) {
      const err = await insertContractIntoDB(name, adaptersContract.address);
      if (err !== "") {
        console.log(err);
      }
    }
  });
