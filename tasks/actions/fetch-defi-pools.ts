import { task, types } from "hardhat/config";
import { PROTOCOLS } from "../../helpers/constants/adapters";
import { NETWORKS } from "../../helpers/constants/network";
import { DEFI_POOL_DATA } from "../../helpers/type";
import { createDir, createFile } from "../../helpers/utils";
import { getMoralisConfig } from "../../helpers/helpers";
import TASKS from "../task-names";
import axios, { Method } from "axios";

task(TASKS.ACTION_TASKS.FETCH_DEFI_POOLS.NAME, TASKS.ACTION_TASKS.FETCH_DEFI_POOLS.DESCRIPTION)
  .addParam("protocol", "the name of protocol", "", types.string)
  .addParam("chainid", "the id of chain", "0x1", types.string)
  .setAction(async ({ protocol, chainid }) => {
    const network = NETWORKS[chainid.toString()];
    if (!network) {
      throw new Error("chain id doesn't exist");
    }
    const protocolName = PROTOCOLS.find(item => item.toLowerCase() === protocol.toLowerCase());
    if (!protocolName) {
      throw new Error("protocol doesn't exist");
    }
    if (!NETWORKS[chainid.toString()]) {
      throw new Error("chain id doesn't exist");
    }
    const dirPath = `.opty-sdk/${network.network}`;
    createDir(`/${dirPath}`);

    console.log("Fetching all defi pools from Moralis...");

    const response = await axios(
      getMoralisConfig("get" as Method, "getDefiPools", {
        chain: chainid,
        protocolName,
      }),
    );
    const data = response.data.result;
    let defiPools: DEFI_POOL_DATA = {};
    console.log(`Creating the defiPools file`);
    for (let i = 0; i < data.protocolPools.length; i++) {
      const pool = data.protocolPools[i];
      if (Object.keys(defiPools).length === 0) {
        defiPools = {
          [pool.poolName]: {
            pool: pool.poolAddress,
            lpToken: pool.lpTokenAddress,
            tokens: pool.underlyingTokens,
            rewardTokens: pool.rewardTokens,
          },
        };
      } else {
        defiPools[pool.poolName] = {
          pool: pool.poolAddress,
          lpToken: pool.lpTokenAddress,
          tokens: pool.underlyingTokens,
          rewardTokens: pool.rewardTokens,
        };
      }
    }
    createFile(`${dirPath}/${protocolName}.json`, JSON.stringify(defiPools));
    console.log(`Data is ready in ${dirPath}/${protocolName}.json`);
  });
