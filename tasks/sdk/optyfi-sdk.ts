import { task, types } from "hardhat/config";
import { PROTOCOLS } from "../../helpers/constants/adapters";
import { NETWORKS } from "../../helpers/constants/network";
import { VAULT_TOKENS } from "../../helpers/constants/tokens";
import TASKS from "../task-names";

task(TASKS.SDK_TASKS.OPTYFI_SDK.NAME, TASKS.SDK_TASKS.OPTYFI_SDK.DESCRIPTION)
  .addParam("chainid", "the id of chain", "", types.string)
  .setAction(async ({ chainid }, hre) => {
    const network = NETWORKS[chainid.toString()];
    if (!network) {
      throw new Error("chain id doesn't exist");
    }
    for (let i = 0; i < PROTOCOLS.length; i++) {
      await hre.run(TASKS.SDK_TASKS.FETCH_DEFI_POOLS.NAME, {
        chainid: chainid,
        protocol: PROTOCOLS[i],
      });
    }
    const usedTokens = Object.keys(VAULT_TOKENS).map(token => VAULT_TOKENS[token].address);
    for (let i = 0; i < usedTokens.length; i++) {
      const token = usedTokens[i];
      await hre.run(TASKS.SDK_TASKS.FETCH_STRATEGIES.NAME, {
        chainid: chainid,
        token: token,
      });
    }
  });
