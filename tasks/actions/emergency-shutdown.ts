import { task, types } from "hardhat/config";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { isAddress } from "../../helpers/helpers";
import { Registry, Vault } from "../../typechain";
import TASKS from "../task-names";

task(TASKS.ACTION_TASKS.SET_EMERGENCY_SHUTDOWN.NAME, TASKS.ACTION_TASKS.SET_EMERGENCY_SHUTDOWN.DESCRIPTION)
  .addParam("vault", "the address of vault", "", types.string)
  .addParam(
    "active",
    "If true, the Vault goes into Emergency Shutdown. If false, the Vault goes back into Normal Operation",
    "",
    types.boolean,
  )
  .setAction(async ({ vault, active }, { ethers }) => {
    if (vault === "") {
      throw new Error("vault address cannot be empty");
    }

    if (!isAddress(vault)) {
      throw new Error("vault address is invalid");
    }

    try {
      const vaultInstance = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, vault);
      const registryContract = <Registry>(
        await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, await vaultInstance.registryContract())
      );
      const governanceSigner = await ethers.getSigner(await registryContract.getGovernance());
      const tx = await vaultInstance.connect(governanceSigner).setEmergencyShutdown(active);
      await tx.wait(1);
      console.log("Finished EmergencyShutdown Vault");
      console.log("EmergencyShutdown status:", active);
    } catch (error) {
      console.error(`${TASKS.ACTION_TASKS.SET_EMERGENCY_SHUTDOWN.NAME}: `, error);
      throw error;
    }
  });
