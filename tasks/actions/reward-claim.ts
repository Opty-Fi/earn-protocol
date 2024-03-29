import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import TASKS from "../task-names";
import { Vault } from "../../typechain";

task(TASKS.ACTION_TASKS.REWARD_CLAIM.NAME, TASKS.ACTION_TASKS.REWARD_CLAIM.DESCRIPTION)
  .addParam("vault", "the address of vault", "", types.string)
  .addParam("liquidityPool", "the address of the liquidity pool to harvest", "", types.string)
  .setAction(async ({ vault, liquidityPool }, hre) => {
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
      console.log("Claiming rewards...");
      const claimTx = await vaultInstance.claimRewardToken(liquidityPool);
      await claimTx.wait(1);
      console.log("Claimed at tx:", claimTx.blockHash);
    } catch (error) {
      console.error(`${TASKS.ACTION_TASKS.REWARD_CLAIM.NAME}: `, error);
      throw error;
    }
  });
