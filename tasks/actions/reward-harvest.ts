import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import TASKS from "../task-names";
import { Vault } from "../../typechain";
import { BigNumber } from "ethers";

task(TASKS.ACTION_TASKS.REWARD_HARVEST.NAME, TASKS.ACTION_TASKS.REWARD_HARVEST.DESCRIPTION)
  .addParam("vault", "the address of vault", "", types.string)
  .addParam("liquidityPool", "the address of the liquidity pool to harvest", "", types.string)
  .addParam("rewardTokenAmount", "amount of reward token to harvest", "0", types.string)
  .setAction(async ({ vault, liquidityPool, rewardTokenAmount }, hre) => {
    if (vault === "") {
      throw new Error("vault address cannot be empty");
    }

    if (liquidityPool === "") {
      throw new Error("liquidityPool address cannot be empty");
    }

    if (!isAddress(vault)) {
      throw new Error("vault address is invalid");
    }

    if (!isAddress(liquidityPool)) {
      throw new Error("liquidityPool address is invalid");
    }

    if (!BigNumber.from(rewardTokenAmount).gt("0")) {
      throw new Error("reward token amount is invalid");
    }

    try {
      const vaultInstance = <Vault>await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, vault);
      console.log("Harvesting...");
      console.log("Initial UT balance:", await vaultInstance.balanceUT());
      const harvestTx = await vaultInstance.harvest(liquidityPool, rewardTokenAmount);
      await harvestTx.wait(1);
      console.log("Harvested at tx:", harvestTx.blockHash);
      console.log("Final UT balance:", await vaultInstance.balanceUT());
    } catch (error) {
      console.error(`${TASKS.ACTION_TASKS.REWARD_HARVEST.NAME}: `, error);
      throw error;
    }
  });
