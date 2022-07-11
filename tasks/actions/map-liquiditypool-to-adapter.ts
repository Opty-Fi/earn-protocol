import { task, types } from "hardhat/config";
import TASKS from "../task-names";
import { Registry, Registry__factory } from "../../typechain";
import { getAddress } from "ethers/lib/utils";

task(TASKS.ACTION_TASKS.MAP_LIQUIDITYPOOL_TO_ADAPTER.NAME, TASKS.ACTION_TASKS.MAP_LIQUIDITYPOOL_TO_ADAPTER.DESCRIPTION)
  .addParam("adapterName", "the name of defi adapter", "", types.string)
  .addParam("liquidityPool", "the address of liquidity pool", "", types.string)
  .setAction(async ({ adapterName, liquidityPool }, hre) => {
    const registryAddress = await (await hre.deployments.get("RegistryProxy")).address;
    const registryInstance = <Registry>await hre.ethers.getContractAt(Registry__factory.abi, registryAddress);
    const adapterAddress = await (await hre.deployments.get(adapterName)).address;

    try {
      const adapterAddr = await registryInstance.liquidityPoolToAdapter(liquidityPool);
      if (getAddress(adapterAddr) != getAddress(adapterAddress)) {
        const isApproved = await (await registryInstance.getLiquidityPool(liquidityPool)).isLiquidityPool;
        if (!isApproved) {
          console.log("Approving and mapping liquidity pool to adapter");
          const tx = await registryInstance["approveLiquidityPoolAndMapToAdapter(address,address)"](
            liquidityPool,
            adapterAddress,
          );
          await tx.wait(1);
        } else {
          console.log("Only mapping liquidity pool to adapter");
          const tx = await registryInstance["setLiquidityPoolToAdapter(address,address)"](
            liquidityPool,
            adapterAddress,
          );
          await tx.wait(1);
        }
      } else {
        console.log("Already approved liquidity pool and map to adapter");
      }
    } catch (error: any) {
      console.error(`${TASKS.ACTION_TASKS.MAP_LIQUIDITYPOOL_TO_ADAPTER.NAME}: `, error);
      throw error;
    }
  });
