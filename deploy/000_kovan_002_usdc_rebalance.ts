import { getAddress } from "ethers/lib/utils";
import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { oldAbis } from "../helpers/data/oldAbis";

const FORK = process.env.FORK;

const func: DeployFunction = async ({ ethers, getChainId }: HardhatRuntimeEnvironment) => {
  const chainId = await getChainId();
  const networkName = hre.network.name;

  if (chainId == "42" || FORK == "kovan" || networkName == "kovan") {
    const opAVUSDCintProxyAddress = "0x118194e96b2d4b08957ba9a05508fb6d14a37a0d";
    const oldopAVUSDCintImplementation = "0xea873417E24012A662801bEBbdc2DAC34A31bc94";
    const opAVUSDCintProxyInstance = await ethers.getContractAt(
      ESSENTIAL_CONTRACTS.VAULT_PROXY,
      opAVUSDCintProxyAddress,
    );
    const actualopAVUSDCintImplementation = await opAVUSDCintProxyInstance.implementation();
    if (getAddress(oldopAVUSDCintImplementation) == getAddress(actualopAVUSDCintImplementation)) {
      console.log("\n");
      console.log("USDC vault...");
      console.log("\n");
      const opAVUSDCintInstance = await ethers.getContractAt(oldAbis.oldVault, opAVUSDCintProxyAddress);

      const usdcCurrentStrategyHash = await opAVUSDCintInstance.investStrategyHash();
      console.log("USDC current strategy ", usdcCurrentStrategyHash);
      console.log("\n");
      if (usdcCurrentStrategyHash != ethers.constants.HashZero) {
        console.log("rebalancing USDC...");
        console.log("\n");
        const tx = await opAVUSDCintInstance.rebalance();
        await tx.wait();
        console.log("usdcCurrentStrategyHash ", await opAVUSDCintInstance.investStrategyHash());
      } else {
        console.log("USDC vault current strategy is HashZero..");
        console.log("\n");
      }
    } else {
      console.log("Migration is already done");
      console.log("\n");
    }
  } else {
    console.log("Network is not kovan, hence skipping USDC rebalance");
    console.log("\n");
  }
};
export default func;
func.tags = ["kovanUSDCRebalance"];
