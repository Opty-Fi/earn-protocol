import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import TASKS from "../task-names";
import { Vault } from "../../typechain";
import { BigNumber } from "ethers";

task(TASKS.ACTION_TASKS.REWARD_HARVEST.NAME, TASKS.ACTION_TASKS.REWARD_HARVEST.DESCRIPTION)
  .addParam("vault", "the address of vault", "", types.string)
  .addParam("rewardToken", "the address of the reward token to harvest", "", types.string)
  .addParam("dex", "swap router", "", types.string)
  .addParam("isUniV3", "whether router is uniswapV3 or not", false, types.boolean)
  .addParam(
    "minimumUnderlyingTokenAmount",
    "minimum underlying after swap that must be received for the transaction to not revert",
    "",
    types.string,
  )
  .addParam("deadline", "swap deadline", "", types.string)
  .addParam("path", "token path for uniswapV2 and its forks", "", types.string)
  .addParam("pathUniV3", "path for uniswapV3", "", types.string)
  .setAction(
    async ({ vault, rewardToken, dex, isUniV3, minimumUnderlyingTokenAmount, deadline, path, pathUniV3 }, hre) => {
      if (vault === "") {
        throw new Error("vault address cannot be empty");
      }

      if (rewardToken === "") {
        throw new Error("rewardToken address cannot be empty");
      }

      if (dex === "") {
        throw new Error("dex address cannot be empty");
      }

      if (rewardToken === "") {
        throw new Error("rewardToken address cannot be empty");
      }

      if (path === "") {
        throw new Error("path address cannot be empty");
      }

      if (!isAddress(vault)) {
        throw new Error("vault address is invalid");
      }

      if (!isAddress(rewardToken)) {
        throw new Error("rewardToken address is invalid");
      }

      if (!isAddress(dex)) {
        throw new Error("dex address is invalid");
      }

      if (!BigNumber.from(deadline).gte("0")) {
        throw new Error("invalid deadline");
      }

      if (!BigNumber.from(minimumUnderlyingTokenAmount).gte("0")) {
        throw new Error("invalid minimumUnderlyingTokenAmount");
      }

      try {
        const vaultInstance = <Vault>await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, vault);
        console.log("Harvesting...");
        console.log("Initial UT balance:", await vaultInstance.balanceUT());
        const harvestTx = await vaultInstance.harvest(
          rewardToken,
          dex,
          isUniV3,
          minimumUnderlyingTokenAmount,
          deadline,
          path.split(","),
          pathUniV3,
        );
        await harvestTx.wait(1);
        console.log("Harvested at tx:", harvestTx.blockHash);
        console.log("Final UT balance:", await vaultInstance.balanceUT());
      } catch (error) {
        console.error(`${TASKS.ACTION_TASKS.REWARD_HARVEST.NAME}: `, error);
        throw error;
      }
    },
  );
