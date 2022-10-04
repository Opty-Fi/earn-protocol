import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import TASKS from "../task-names";
import { Vault } from "../../typechain";

task(TASKS.ACTION_TASKS.REWARD_HARVEST.NAME, TASKS.ACTION_TASKS.REWARD_HARVEST.DESCRIPTION)
  .addParam("vault", "the address of vault", "", types.string)
  .addParam("rewardToken", "the address of the reward token to harvest", "", types.string)
  .setAction(async ({ vault, rewardToken }, hre) => {
    if (vault === "") {
      throw new Error("vault address cannot be empty");
    }

    if (rewardToken === "") {
      throw new Error("liquidityPool address cannot be empty");
    }

    if (!isAddress(vault)) {
      throw new Error("vault address is invalid");
    }

    if (!isAddress(rewardToken)) {
      throw new Error("liquidityPool address is invalid");
    }

    try {
      const vaultInstance = <Vault>await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, vault);
      console.log("Harvesting...");
      console.log("Initial UT balance:", await vaultInstance.balanceUT());
      const harvestTx = await vaultInstance.harvest(rewardToken);
      await harvestTx.wait(1);
      console.log("Harvested at tx:", harvestTx.blockHash);
      console.log("Final UT balance:", await vaultInstance.balanceUT());
    } catch (error) {
      console.error(`${TASKS.ACTION_TASKS.REWARD_HARVEST.NAME}: `, error);
      throw error;
    }
  });
