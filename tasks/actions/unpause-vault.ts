import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { unpauseVault } from "../../helpers/contracts-actions";
import TASKS from "../task-names";

task(TASKS.ACTION_TASKS.UNPAUSE_VAULT.NAME, TASKS.ACTION_TASKS.UNPAUSE_VAULT.DESCRIPTION)
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("vault", "the address of vault", "", types.string)
  .setAction(async ({ registry, vault }, hre) => {
    const [owner] = await hre.ethers.getSigners();

    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    if (vault === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(vault)) {
      throw new Error("registry address is invalid");
    }

    try {
      const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);
      await unpauseVault(owner, registryContract, vault, true);
      console.log("Finished unpausing Vault");
    } catch (error) {
      console.error(`${TASKS.ACTION_TASKS.UNPAUSE_VAULT.NAME}: `, error);
      throw error;
    }
  });
