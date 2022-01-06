import { task, types } from "hardhat/config";
import { PROTOCOLS } from "../../helpers/constants/adapters";
import { NETWORKS } from "../../helpers/constants/network";
import { TypedTokens } from "../../helpers/data";
import TASKS from "../task-names";

task(TASKS.INIT_DATA.NAME, TASKS.INIT_DATA.DESCRIPTION)
  .addParam("chainid", "the id of chain", "", types.string)
  .setAction(async ({ chainid }, hre) => {
    const network = NETWORKS[chainid.toString()];
    if (!network) {
      throw new Error("chain id doesn't exist");
    }
    for (let i = 0; i < PROTOCOLS.length; i++) {
      await hre.run(TASKS.ACTION_TASKS.FETCH_DEFI_POOLS.NAME, {
        chainid: chainid,
        protocol: PROTOCOLS[i],
      });
    }
    const usedTokens = [TypedTokens["DAI"], TypedTokens["USDC"], TypedTokens["SLP_WETH_USDC"]];
    for (let i = 0; i < usedTokens.length; i++) {
      const token = usedTokens[i];
      await hre.run(TASKS.ACTION_TASKS.FETCH_STRATEGIES.NAME, {
        chainid: chainid,
        token: token,
      });
    }
  });
