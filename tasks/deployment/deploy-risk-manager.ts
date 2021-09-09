import { task, types } from "hardhat/config";
import { deployRiskManager } from "../../helpers/contracts-deployments";
import { insertContractIntoDB } from "../../helpers/db";
import { isAddress } from "../../helpers/helpers";
import { DEPLOY_RISK_MANAGER } from "../task-names";

task(DEPLOY_RISK_MANAGER, "Deploy Risk Manager")
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

    const riskManagerContract = await deployRiskManager(hre, owner, deployedonce, registry);

    console.log("Finished deploying riskManager");

    console.log(`Contract riskManager : ${riskManagerContract.address}`);

    if (insertindb) {
      const err = await insertContractIntoDB(`riskManager`, riskManagerContract.address);
      if (err !== "") {
        console.log(err);
      }
    }
  });
