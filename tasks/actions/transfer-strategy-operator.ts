import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import TASKS from "../task-names";
import { getAddress } from "ethers/lib/utils";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { Registry } from "../../typechain";

task(TASKS.ACTION_TASKS.TRANSFER_STRATEGY_OPERATOR.NAME, TASKS.ACTION_TASKS.TRANSFER_STRATEGY_OPERATOR.DESCRIPTION)
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("newStrategyOperator", "address of the new strategy operator", "", types.string)
  .setAction(async ({ registry, newStrategyOperator }, hre) => {
    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    if (!isAddress(newStrategyOperator)) {
      throw new Error("new strategy operator address is invalid");
    }

    try {
      const registryInstance = <Registry>await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);
      const currentStrategyOperator = await registryInstance.getStrategyOperator();
      console.log("current strategy operator ", currentStrategyOperator);
      if (getAddress(newStrategyOperator) != getAddress(currentStrategyOperator)) {
        const governance = await registryInstance.governance();
        const governanceSigner = await hre.ethers.getSigner(governance);
        const tx = await registryInstance.connect(governanceSigner).setStrategyOperator(newStrategyOperator);
        await tx.wait(1);
        const actualNewStrategyOperator = await registryInstance.getStrategyOperator();
        console.log("The new strategy operator is ", actualNewStrategyOperator);
      } else {
        console.log("current strategy operator is upto date");
      }
    } catch (error: any) {
      console.error(`${TASKS.ACTION_TASKS.TRANSFER_STRATEGY_OPERATOR.NAME}: `, error);
    }
  });
