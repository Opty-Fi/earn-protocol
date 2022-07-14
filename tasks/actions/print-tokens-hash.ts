import { task, types } from "hardhat/config";
import { getAddress } from "ethers/lib/utils";
import { isAddress, generateTokenHashV2 } from "../../helpers/helpers";
import TASKS from "../task-names";

import { NETWORKS_CHAIN_ID_TO_HEX } from "../../helper-hardhat-config";

task(TASKS.ACTION_TASKS.PRINT_TOKENS_HASH.NAME, TASKS.ACTION_TASKS.PRINT_TOKENS_HASH.DESCRIPTION)
  .addParam("token", "the address of token", "", types.string)
  .setAction(async ({ token }, hre) => {
    if (token === "") {
      throw new Error("token cannot be empty");
    }

    if (!isAddress(token)) {
      throw new Error("token address is invalid");
    }

    console.log(
      "TokensHash : ",
      generateTokenHashV2([getAddress(token)], NETWORKS_CHAIN_ID_TO_HEX[await hre.getChainId()]),
    );
  });
