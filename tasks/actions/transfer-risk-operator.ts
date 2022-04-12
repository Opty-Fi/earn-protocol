import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import TASKS from "../task-names";
import { getAddress } from "ethers/lib/utils";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { Registry } from "../../typechain";

task(TASKS.ACTION_TASKS.TRANSFER_RISK_OPERATOR.NAME, TASKS.ACTION_TASKS.TRANSFER_RISK_OPERATOR.DESCRIPTION)
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("newRiskOperator", "address of the new risk operator", "", types.string)
  .setAction(async ({ registry, newRiskOperator }, hre) => {
    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    if (!isAddress(newRiskOperator)) {
      throw new Error("new risk operator address is invalid");
    }

    try {
      const registryInstance = <Registry>await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);
      const currentRiskOperator = await registryInstance.getRiskOperator();
      console.log("current risk operator ", currentRiskOperator);
      if (getAddress(newRiskOperator) != getAddress(currentRiskOperator)) {
        const governance = await registryInstance.governance();
        const governanceSigner = await hre.ethers.getSigner(governance);
        const tx = await registryInstance.connect(governanceSigner).setRiskOperator(newRiskOperator);
        await tx.wait(1);
        const actualNewRiskOperator = await registryInstance.getRiskOperator();
        console.log("The new risk operator is ", actualNewRiskOperator);
      } else {
        console.log("current risk operator is upto date");
      }
    } catch (error: any) {
      console.error(`${TASKS.ACTION_TASKS.TRANSFER_RISK_OPERATOR.NAME}: `, error);
    }
  });
