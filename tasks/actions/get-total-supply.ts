import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import TASKS from "../task-names";
import { Vault } from "../../typechain";

task(TASKS.ACTION_TASKS.GET_TOTAL_SUPPLY.NAME, TASKS.ACTION_TASKS.GET_TOTAL_SUPPLY.DESCRIPTION)
  .addParam("vault", "the address of vault", "", types.string)
  .addOptionalParam("blockNumber", "block number", undefined, types.int)
  .setAction(async ({ vault, blockNumber }, hre) => {
    if (vault === "") {
      throw new Error("vault address cannot be empty");
    }

    if (!isAddress(vault)) {
      throw new Error("vault address is invalid");
    }

    try {
      let _blockNumber = blockNumber;
      if (_blockNumber == undefined) {
        _blockNumber = await hre.ethers.provider.getBlockNumber();
      }
      const vaultInstance = <Vault>await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.Vault, vault);
      const totalSupply = await vaultInstance.totalSupply({ blockTag: _blockNumber });
      console.log(`TotalSupply @${_blockNumber} is ${totalSupply.toString()}`);
    } catch (error: any) {
      console.error(`${TASKS.ACTION_TASKS.GET_TOTAL_SUPPLY.NAME}: `, error);
      throw error;
    }
  });
