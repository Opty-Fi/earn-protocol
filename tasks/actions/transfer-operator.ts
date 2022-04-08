import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import TASKS from "../task-names";
import { getAddress } from "ethers/lib/utils";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { Registry } from "../../typechain";

task(TASKS.ACTION_TASKS.TRANSFER_OPERATOR.NAME, TASKS.ACTION_TASKS.TRANSFER_OPERATOR.DESCRIPTION)
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("newOperator", "address of the new operator", "", types.string)
  .setAction(async ({ registry, newOperator }, hre) => {
    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    if (!isAddress(newOperator)) {
      throw new Error("new operator address is invalid");
    }

    try {
      const registryInstance = <Registry>await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);
      const currentOperator = await registryInstance.getOperator();
      console.log("current operator ", currentOperator);
      if (getAddress(newOperator) != getAddress(currentOperator)) {
        const governance = await registryInstance.governance();
        const governanceSigner = await hre.ethers.getSigner(governance);
        const tx = await registryInstance.connect(governanceSigner).setOperator(newOperator);
        await tx.wait(1);
        const actualNewOperator = await registryInstance.getOperator();
        console.log("The new operator is ", actualNewOperator);
      } else {
        console.log("current operator is upto date");
      }
    } catch (error: any) {
      console.error(`${TASKS.ACTION_TASKS.TRANSFER_OPERATOR.NAME}: `, error);
    }
  });
