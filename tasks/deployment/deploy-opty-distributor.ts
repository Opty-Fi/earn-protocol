import { task, types } from "hardhat/config";
import { insertContractIntoDB } from "../../helpers/db";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { isAddress, deployContract, executeFunc } from "../../helpers/helpers";
import { DEPLOY_OPTY_DISTRIBUTOR } from "../task-names";

task(DEPLOY_OPTY_DISTRIBUTOR, "Deploy Opty Distributor")
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("opty", "the address of opty", "", types.string)
  .addParam("deployedonce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ deployedonce, insertindb, registry, opty }, hre) => {
    const [owner] = await hre.ethers.getSigners();

    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    if (opty === "") {
      throw new Error("opty cannot be empty");
    }

    if (!isAddress(opty)) {
      throw new Error("opty address is invalid");
    }

    const optyDistributor = await deployContract(hre, ESSENTIAL_CONTRACTS.OPTY_DISTRIBUTOR, deployedonce, owner, [
      registry,
      opty,
    ]);

    console.log("Finished deploying OPTYDistributor");

    console.log(`Contract optyDistributor : ${optyDistributor.address}`);

    const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);

    await executeFunc(registryContract, owner, "setOPTYDistributor(address)", [optyDistributor.address]);

    if (insertindb) {
      const err = await insertContractIntoDB(`optyDistributor`, optyDistributor.address);
      if (err !== "") {
        console.log(err);
      }
    }
  });
