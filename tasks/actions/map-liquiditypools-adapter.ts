import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";

import { HARVEST_ADAPTER_NAME, ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { approveLiquidityPoolAndMapAdapters } from "../../helpers/contracts-actions";
import { TypedDefiPools } from "../../helpers/data/index";
import { removeDuplicateFromStringArray } from "../../helpers/utils";

task("map-liquiditypools-adapter", "Approve and map liquidity pool to adapter")
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

    if (adaptername === HARVEST_ADAPTER_NAME) {
      adaptername = "HarvestV1Adapter";
    }

    if (!TypedDefiPools[adaptername]) {
      throw new Error("wrong adapter name");
    }

    const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);

    const liquidityPools = removeDuplicateFromStringArray(
      Object.keys(TypedDefiPools[adaptername]).map(name => TypedDefiPools[adaptername][name].pool),
    );
    const liquidityPoolsToAdapter = liquidityPools.map(lp => [lp, adapter as string]);

    try {
      await approveLiquidityPoolAndMapAdapters(owner, registryContract, liquidityPools, liquidityPoolsToAdapter);
    } catch (error) {
      console.log(`Got error : ${error}`);
    }

    console.log(`Finished mapping liquidityPools to adapter : ${adaptername}`);
    console.log("------------------");
  });
