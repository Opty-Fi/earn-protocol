import { ethers } from "hardhat";
import { oldAbis } from "../../../../helpers/data/oldAbis";
import { opUSDCearn } from "../../_deployments/polygon.json";

export async function usdcRebalance(): Promise<void> {
  const opUSDCearnInstance = await ethers.getContractAt(oldAbis.oldVault, opUSDCearn.VaultProxy);
  const usdcCurrentStrategyHash = await opUSDCearnInstance.investStrategyHash();

  if (usdcCurrentStrategyHash != ethers.constants.HashZero) {
    const tx = await opUSDCearnInstance.rebalance();
    await tx.wait(1);
  }
}
