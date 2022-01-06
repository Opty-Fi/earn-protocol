import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";

import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { approveLiquidityPoolAndMapAdapters } from "../../helpers/contracts-actions";
import { TypedDefiPools } from "../../helpers/data/defiPools";
import { removeDuplicateFromStringArray } from "../../helpers/utils";
import TASKS from "../task-names";

task(
  TASKS.ACTION_TASKS.MAP_LIQUIDITYPOOLS_TO_ADAPTER.NAME,
  TASKS.ACTION_TASKS.MAP_LIQUIDITYPOOLS_TO_ADAPTER.DESCRIPTION,
)
  .addParam("adapter", "the address of defi adapter", "", types.string)
  .addParam("adaptername", "the name of defi adapter", "", types.string)
  .addParam("registry", "the address of registry", "", types.string)
  .setAction(async ({ adapter, registry, adaptername }, hre) => {
    const [owner] = await hre.ethers.getSigners();

    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    if (adapter === "") {
      throw new Error("adapter cannot be empty");
    }

    if (!isAddress(adapter)) {
      throw new Error("adapter address is invalid");
    }

    if (adaptername === "") {
      throw new Error("adaptername cannot be empty");
    }

    if (!TypedDefiPools[adaptername]) {
      throw new Error("wrong adapter name");
    }

    try {
      const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);
      const liquidityPools = removeDuplicateFromStringArray(
        Object.keys(TypedDefiPools[adaptername]).map(name => TypedDefiPools[adaptername][name].pool),
      );
      const liquidityPoolsToAdapter = liquidityPools.map(lp => [lp, adapter as string]);
      await approveLiquidityPoolAndMapAdapters(owner, registryContract, liquidityPools, liquidityPoolsToAdapter);
      console.log(`Finished mapping liquidityPools to adapter : ${adaptername}`);
      console.log("------------------");
    } catch (error) {
      console.error(`${TASKS.ACTION_TASKS.MAP_LIQUIDITYPOOLS_TO_ADAPTER.NAME}: `, error);
      throw error;
    }
  });
