import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import TASKS from "../task-names";
import { getAddress } from "ethers/lib/utils";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { RegistryProxy } from "../../typechain";

task(TASKS.ACTION_TASKS.ACCEPT_GOVERNANCE.NAME, TASKS.ACTION_TASKS.ACCEPT_GOVERNANCE.DESCRIPTION)
  .addParam("registry", "the address of registry", "", types.string)
  .setAction(async ({ registry }, hre) => {
    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    try {
      const registryProxyInstance = <RegistryProxy>(
        await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_PROXY, registry)
      );
      const currentPendingGovernance = await registryProxyInstance.pendingGovernance();
      console.log("current pending governance ", currentPendingGovernance);
      const currentGovernance = await registryProxyInstance.governance();
      console.log("current governance ", currentGovernance);
      if (getAddress(currentPendingGovernance) != hre.ethers.constants.AddressZero) {
        const currentPendingGovernanceSigner = await hre.ethers.getSigner(currentPendingGovernance);
        const tx = await registryProxyInstance.connect(currentPendingGovernanceSigner).acceptGovernance();
        await tx.wait(1);
        const actualNewGovernance = await registryProxyInstance.governance();
        console.log("The new governance is ", actualNewGovernance);
      } else {
        console.log("please set pending governance first");
      }
    } catch (error: any) {
      console.error(`${TASKS.ACTION_TASKS.ACCEPT_GOVERNANCE.NAME}: `, error);
    }
  });
