import { task, types } from "hardhat/config";
import { insertContractIntoDB } from "../../helpers/db";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { deployOptyStakingRateBalancer } from "../../helpers/contracts-deployments";
import { isAddress, executeFunc } from "../../helpers/helpers";
import { DEPLOY_OPTY_STAKING_RATE_BALANCER } from "../task-names";

task(DEPLOY_OPTY_STAKING_RATE_BALANCER, "Deploy Opty Staking Rate Balancer")
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
      console.log("Deploying OPTYStakingRateBalancer...");
      const [owner] = await hre.ethers.getSigners();
      const optyStakingRateBalancer = await deployOptyStakingRateBalancer(hre, owner, deployedonce, registry);
      console.log("Finished deploying OPTYStakingRateBalancer");
      console.log(`Contract OPTYStakingRateBalancer : ${optyStakingRateBalancer.address}`);
      console.log("Registering OPTYStakingRateBalancer...");
      const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);
      await executeFunc(registryContract, owner, "setOPTYStakingRateBalancer(address)", [
        optyStakingRateBalancer.address,
      ]);
      console.log("Registered OPTYStakingRateBalancer.");
      if (insertindb) {
        const err = await insertContractIntoDB(`optyStakingRateBalancer`, optyStakingRateBalancer.address);
        if (err !== "") {
          throw err;
        }
      }
    } catch (error) {
      console.error(`${DEPLOY_OPTY_STAKING_RATE_BALANCER}: `, error);
      throw error;
    }
  });
