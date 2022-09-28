import { ethers } from "hardhat";
import { oldAbis } from "../../../../../helpers/data/oldAbis";
import { opUSDCgrow as opUSDCearn } from "../../../_deployments/polygon.json";

export async function usdcRebalance(): Promise<void> {
  const opUSDCearnInstance = await ethers.getContractAt(oldAbis.oldVaultV2, opUSDCearn.VaultProxy);
  const usdcCurrentStrategyHash = await opUSDCearnInstance.investStrategyHash();

  if (usdcCurrentStrategyHash != ethers.constants.HashZero) {
    const tx = await opUSDCearnInstance.rebalance();
    await tx.wait(1);
  }
}
