import { task, types } from "hardhat/config";
import { insertContractIntoDB } from "../../helpers/db";
import { deployContract, executeFunc } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { DEPLOY_INVEST_STRATEGY_REGISTRY } from "../task-names";

task(DEPLOY_INVEST_STRATEGY_REGISTRY, "Deploy InvestStrategyRegistry")
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("deployedonce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ registry, deployedonce, insertindb }, hre) => {
    try {
      console.log("Deploy investStrategyRegistry...");
      const [owner] = await hre.ethers.getSigners();
      const investStrategyRegistry = await deployContract(
        hre,
        ESSENTIAL_CONTRACTS.INVEST_STRATEGY_REGISTRY,
        deployedonce,
        owner,
        [registry],
      );
      console.log(`Contract investStrategyRegistry: ${investStrategyRegistry.address}`);
      console.log("Registering investStrategyRegistry...");
      const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);
      await executeFunc(registryContract, owner, "setInvestStrategyRegistry(address)", [
        investStrategyRegistry.address,
      ]);
      console.log("Registered investStrategyRegistry.");
      if (insertindb) {
        const err = await insertContractIntoDB(`investStrategyRegistry`, investStrategyRegistry.address);
        if (err !== "") {
          throw err;
        }
      }
    } catch (error) {
      console.error(`${DEPLOY_INVEST_STRATEGY_REGISTRY}: `, error);
      throw error;
    }
  });
