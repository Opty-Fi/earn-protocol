import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import TASKS from "../task-names";
import { getAddress } from "ethers/lib/utils";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { RegistryProxy } from "../../typechain";

task(TASKS.ACTION_TASKS.SET_PENDING_GOVERNANCE.NAME, TASKS.ACTION_TASKS.SET_PENDING_GOVERNANCE.DESCRIPTION)
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("newPendingGovernance", "address of the new operator", "", types.string)
  .setAction(async ({ registry, newPendingGovernance }, hre) => {
    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    if (!isAddress(newPendingGovernance)) {
      throw new Error("new pending governance address is invalid");
    }

    try {
      const registryProxyInstance = <RegistryProxy>(
        await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_PROXY, registry)
      );
      const currentPendingGovernance = await registryProxyInstance.pendingGovernance();
      console.log("current pending governance ", currentPendingGovernance);
      if (getAddress(newPendingGovernance) != getAddress(currentPendingGovernance)) {
        const operatorSigner = await hre.ethers.getSigner(await registryProxyInstance.operator());
        const tx = await registryProxyInstance.connect(operatorSigner).setPendingGovernance(newPendingGovernance);
        await tx.wait(1);
        const actualNewPendingGovernance = await registryProxyInstance.pendingGovernance();
        console.log("The new pending governance is ", actualNewPendingGovernance);
      } else {
        console.log("current new pending governance is upto date");
      }
    } catch (error: any) {
      console.error(`${TASKS.ACTION_TASKS.SET_PENDING_GOVERNANCE.NAME}: `, error);
    }
  });
