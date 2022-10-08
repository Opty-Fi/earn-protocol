import { Signer } from "@ethersproject/abstract-signer";
import { task } from "hardhat/config";

import TASKS from "./task-names";

task(TASKS.ACTION_TASKS.LIST_ACCOUNTS.NAME, TASKS.ACTION_TASKS.LIST_ACCOUNTS.DESCRIPTION, async (_taskArgs, hre) => {
  const accounts: Signer[] = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.getAddress());
  }
});
