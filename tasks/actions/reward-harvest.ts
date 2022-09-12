import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import TASKS from "../task-names";
import { Vault } from "../../typechain";

task(TASKS.ACTION_TASKS.REWARD_HARVEST.NAME, TASKS.ACTION_TASKS.REWARD_HARVEST.DESCRIPTION)
  .addParam("vault", "the address of vault", "", types.string)
  .addParam("harvestType", "harvest SOME or ALL reward tokens", "SOME" || "ALL", types.string)
  .addParam("liquidityPool", "the address of the liquidity pool to harvest", "", types.string)
  .addOptionalParam("rewardTokenAmount", "amount of reward token to harvest", "0", types.string)
  .setAction(async ({ vault, harvestType, liquidityPool, rewardTokenAmount }, hre) => {
    const HARVEST_TYPE = ["SOME", "ALL"];

    if (!HARVEST_TYPE.includes(harvestType.toUpperCase())) {
      throw new Error("Harvest type is invalid");
    }

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

    try {
      const vaultInstance = <Vault>await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, vault);
      console.log("Harvesting...");
      console.log("Initial UT balance:", await vaultInstance.balanceUT());
      switch (harvestType.toUpperCase()) {
        case "ALL": {
          const harvestTx = await vaultInstance.harvestAll(liquidityPool);
          await harvestTx.wait(1);
          console.log("Harvested at tx:", harvestTx.blockHash);
          console.log("Final UT balance:", await vaultInstance.balanceUT());
          break;
        }
        case "SOME": {
          const harvestTx = await vaultInstance.harvestSome(liquidityPool, rewardTokenAmount);
          await harvestTx.wait(1);
          console.log("Harvested at tx:", harvestTx.blockHash);
          console.log("Final UT balance:", await vaultInstance.balanceUT());
          break;
        }
      }
    } catch (error) {
      console.error(`${TASKS.ACTION_TASKS.REWARD_HARVEST.NAME}: `, error);
      throw error;
    }
  });
