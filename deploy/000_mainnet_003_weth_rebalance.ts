import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { oldAbis } from "../helpers/data/oldAbis";

const FORK = process.env.FORK;

const func: DeployFunction = async ({ ethers, getChainId, network }: HardhatRuntimeEnvironment) => {
  const chainId = await getChainId();
  const networkName = network.name;
  const { getAddress } = ethers.utils;

  if (chainId == "1" || FORK == "mainnet" || networkName == "mainnet") {
    const opWETHgrowProxyAddress = "0xff2fbd9fbc6d03baa77cf97a3d5671bea183b9a8";
    const oldopWETHgrowImplementation = "0x72ce52a66713257b9805ffa0a0b14162d4b95b69";
    const opWETHgrowProxyInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, opWETHgrowProxyAddress);
    const actualopWETHgrowImplementation = await opWETHgrowProxyInstance.implementation();
    if (getAddress(oldopWETHgrowImplementation) == getAddress(actualopWETHgrowImplementation)) {
      console.log("\n");
      console.log("WETH vault..");
      console.log("\n");
      const opWETHgrowInstance = await ethers.getContractAt(oldAbis.oldVault, opWETHgrowProxyAddress);

      const wethCurrentStrategyHash = await opWETHgrowInstance.investStrategyHash();
      console.log("WETH current strategy ", wethCurrentStrategyHash);
      console.log("\n");
      if (wethCurrentStrategyHash != ethers.constants.HashZero) {
        console.log("rebalancing WETH...");
        console.log("\n");
        const tx = await opWETHgrowInstance.rebalance();
        await tx.wait(1);
        console.log("wethCurrentStrategyHash ", await opWETHgrowInstance.investStrategyHash());
      } else {
        console.log("WETH vault current strategy is HashZero..");
        console.log("\n");
      }
    } else {
      console.log("Migration is already done");
      console.log("\n");
    }
  } else {
    console.log("Network is not mainnet, hence skipping WETH rebalancing");
    console.log("\n");
  }
};
export default func;
func.tags = ["WETHRebalance"];
