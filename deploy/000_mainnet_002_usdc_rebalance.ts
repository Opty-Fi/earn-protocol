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
    const opUSDCgrowProxyAddress = "0x6d8bfdb4c4975bb086fc9027e48d5775f609ff88";
    const oldopUSDCgrowImplementation = "0xfad37e3197e6331647030954512964cd2e55acaf";
    const opUSDCgrowProxyInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, opUSDCgrowProxyAddress);
    const actualopUSDCgrowImplementation = await opUSDCgrowProxyInstance.implementation();
    if (getAddress(oldopUSDCgrowImplementation) == getAddress(actualopUSDCgrowImplementation)) {
      console.log("\n");
      console.log("USDC vault...");
      console.log("\n");
      const opUSDCgrowInstance = await ethers.getContractAt(oldAbis.oldVault, opUSDCgrowProxyAddress);

      const usdcCurrentStrategyHash = await opUSDCgrowInstance.investStrategyHash();
      console.log("USDC current strategy ", usdcCurrentStrategyHash);
      console.log("\n");
      if (usdcCurrentStrategyHash != ethers.constants.HashZero) {
        console.log("rebalancing USDC...");
        console.log("\n");
        const tx = await opUSDCgrowInstance.rebalance();
        await tx.wait(1);
        console.log("usdcCurrentStrategyHash ", await opUSDCgrowInstance.investStrategyHash());
      } else {
        console.log("USDC vault current strategy is HashZero..");
        console.log("\n");
      }
    } else {
      console.log("Migration is already done");
      console.log("\n");
    }
  } else {
    console.log("Network is not mainnet, hence skipping USDC rebalance");
    console.log("\n");
  }
};
export default func;
func.tags = ["USDCRebalance"];
