import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { executeFunc } from "../../helpers/helpers";
import TASKS from "../task-names";

task(TASKS.ACTION_TASKS.SET_INVEST_STRATEGY_REGISTRY.NAME, TASKS.ACTION_TASKS.SET_INVEST_STRATEGY_REGISTRY.DESCRIPTION)
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("investstrategyregistry", "the address of investStrategyRegistry", "", types.string)
  .setAction(async ({ registry, investstrategyregistry }, hre) => {
    const [owner] = await hre.ethers.getSigners();

    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (investstrategyregistry === "") {
      throw new Error("investStrategyRegistry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    if (!isAddress(investstrategyregistry)) {
      throw new Error("investStrategyRegistry address is invalid");
    }

    try {
      const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);
      await executeFunc(registryContract, owner, "setInvestStrategyRegistry(address)", [investstrategyregistry]);
      console.log("Finished setting InvestStrategyRegistry");
    } catch (error) {
      console.error(`${TASKS.ACTION_TASKS.SET_INVEST_STRATEGY_REGISTRY.NAME}: `, error);
      throw error;
    }
  });
