import { getAddress } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { oldAbis } from "../../../../helpers/data/oldAbis";
import { opUSDCgrow } from "../../_deployments/polygon.json";

export async function usdcRebalance(): Promise<void> {
  if (getAddress(opUSDCgrow.Vault) == getAddress(opUSDCgrow.Vault)) {
    const opUSDCgrowInstance = await ethers.getContractAt(oldAbis.oldVault, opUSDCgrow.VaultProxy);
    const usdcCurrentStrategyHash = await opUSDCgrowInstance.investStrategyHash();

    if (usdcCurrentStrategyHash != ethers.constants.HashZero) {
      const tx = await opUSDCgrowInstance.rebalance();
      await tx.wait(1);
    }
  }
}
