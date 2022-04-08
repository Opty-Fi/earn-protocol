import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import TASKS from "../task-names";
import { getAddress } from "ethers/lib/utils";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { Registry } from "../../typechain";

task(TASKS.ACTION_TASKS.TRANSFER_FINANCE_OPERATOR.NAME, TASKS.ACTION_TASKS.TRANSFER_FINANCE_OPERATOR.DESCRIPTION)
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("newFinanceOperator", "address of the new finance operator", "", types.string)
  .setAction(async ({ registry, newFinanceOperator }, hre) => {
    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    if (!isAddress(newFinanceOperator)) {
      throw new Error("new finance operator address is invalid");
    }

    try {
      const registryInstance = <Registry>await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);
      const currentFinanceOperator = await registryInstance.getFinanceOperator();
      console.log("current finance operator ", currentFinanceOperator);
      if (getAddress(newFinanceOperator) != getAddress(currentFinanceOperator)) {
        const governance = await registryInstance.governance();
        const governanceSigner = await hre.ethers.getSigner(governance);
        const tx = await registryInstance.connect(governanceSigner).setFinanceOperator(newFinanceOperator);
        await tx.wait(1);
        const actualNewFinanceOperator = await registryInstance.getFinanceOperator();
        console.log("The new finance operator is ", actualNewFinanceOperator);
      } else {
        console.log("current finance operator is upto date");
      }
    } catch (error: any) {
      console.error(`${TASKS.ACTION_TASKS.TRANSFER_FINANCE_OPERATOR.NAME}: `, error);
    }
  });
