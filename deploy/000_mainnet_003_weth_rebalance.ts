import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { oldAbis } from "../helpers/data/oldAbis";

const FORK = process.env.FORK;

const func: DeployFunction = async ({ ethers, getChainId }: HardhatRuntimeEnvironment) => {
  const chainId = await getChainId();
  const networkName = hre.network.name;

  if (chainId == "1" || FORK == "mainnet" || networkName == "mainnet") {
    console.log("\n");
    console.log("WETH vault..");
    console.log("\n");
    const opWETHgrowProxyAddress = "0xff2fbd9fbc6d03baa77cf97a3d5671bea183b9a8";
    const opWETHgrowInstance = await ethers.getContractAt(oldAbis.oldVault, opWETHgrowProxyAddress);

    const wethCurrentStrategyHash = await opWETHgrowInstance.investStrategyHash();
    console.log("WETH current strategy ", wethCurrentStrategyHash);
    console.log("\n");
    if (wethCurrentStrategyHash != ethers.constants.HashZero) {
      console.log("rebalancing WETH...");
      console.log("\n");
      const tx = await opWETHgrowInstance.rebalance();
      await tx.wait();
      console.log("wethCurrentStrategyHash ", await opWETHgrowInstance.investStrategyHash());
    } else {
      console.log("WETH vault current strategy is HashZero..");
      console.log("\n");
    }
  } else {
    console.log("Network is not mainnet, hence skipping WETH rebalancing");
    console.log("\n");
  }
};
export default func;
func.tags = ["WETHRebalance"];
