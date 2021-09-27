import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { approveLiquidityPoolAndMapAdapter } from "../../helpers/contracts-actions";
import { MAP_LIQUIDITYPOOL_ADAPTER } from "../task-names";

task(MAP_LIQUIDITYPOOL_ADAPTER, "Approve and map liquidity pool to adapter")
  .addParam("adapter", "the address of defi adapter", "", types.string)
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("liquiditypool", "the address of liquidity", "", types.string)
  .setAction(async ({ adapter, registry, liquiditypool }, hre) => {
    const [owner] = await hre.ethers.getSigners();

    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    if (liquiditypool === "") {
      throw new Error("liquidity pool cannot be empty");
    }

    if (!isAddress(liquiditypool)) {
      throw new Error("liquidity pool address is invalid");
    }

    if (adapter === "") {
      throw new Error("adapter cannot be empty");
    }

    if (!isAddress(adapter)) {
      throw new Error("adapter address is invalid");
    }

    const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);

    console.log(`Start mapping liquidity pool to adapter.....`);
    console.log(`Adapter: ${adapter}`);
    console.log(`Liquidity pool: ${liquiditypool}`);

    try {
      await approveLiquidityPoolAndMapAdapter(owner, registryContract, adapter, liquiditypool);
    } catch (error) {
      console.log(`Got error: ${error}`);
    }

    console.log(`Finished mapping liquidity pool to adapter`);
  });
