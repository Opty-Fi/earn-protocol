import { task, types } from "hardhat/config";
import { isAddress, executeFunc, getContract } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { Contract } from "ethers";
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

    const registryContract = (await getContract(hre, ESSENTIAL_CONTRACTS.REGISTRY, registry)) as Contract;

    const { isLiquidityPool } = await registryContract.getLiquidityPool(liquiditypool);

    if (!isLiquidityPool) {
      await executeFunc(registryContract as Contract, owner, "approveLiquidityPool(address)", [liquiditypool]);

      try {
        console.log(`Liquidity pool ${liquiditypool} approved`);
      } catch (error) {
        console.error("approve liquidity pool errored with ", error.message);
      }
    }
    try {
      await executeFunc(registryContract, owner, "setLiquidityPoolToAdapter(address,address)", [
        liquiditypool,
        adapter,
      ]);
      console.log(`Mapped ${liquiditypool} to ${adapter}`);
    } catch (error) {
      console.error("map liquidity pool to adapter errored with ", error.message);
    }
  });
