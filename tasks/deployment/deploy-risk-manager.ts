import { task, types } from "hardhat/config";
import { deployRiskManager } from "../../helpers/contracts-deployments";
import { insertContractIntoDB } from "../../helpers/db";
import { isAddress, executeFunc } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { DEPLOY_RISK_MANAGER } from "../task-names";

task(DEPLOY_RISK_MANAGER, "Deploy Risk Manager")
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
      console.log("Deploying RiskManager...");
      const riskManagerContract = await deployRiskManager(hre, owner, deployedonce, registry);
      console.log("Finished deploying RiskManager");
      console.log(`Contract RiskManager : ${riskManagerContract.address}`);
      console.log("Registering RiskManager...");
      const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);
      await executeFunc(registryContract, owner, "setRiskManager(address)", [riskManagerContract.address]);
      console.log("Registered RiskManager.");
      if (insertindb) {
        const err = await insertContractIntoDB(`riskManager`, riskManagerContract.address);
        if (err !== "") {
          throw err;
        }
      }
    } catch (error) {
      console.error(`${DEPLOY_RISK_MANAGER}: `, error);
      throw error;
    }
  });
