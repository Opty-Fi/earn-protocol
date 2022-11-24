import { getAddress } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { oldAbis } from "../../../../helpers/data/oldAbis";
import { InitializableImmutableAdminUpgradeabilityProxy__factory } from "../../../../typechain";
import { opUSDCgrow } from "../../_deployments/mainnet.json";

export async function usdcRebalance(): Promise<void> {
  const opUSDCgrowProxyInstance = await ethers.getContractAt(
    InitializableImmutableAdminUpgradeabilityProxy__factory.abi,
    opUSDCgrow.VaultProxy,
  );
  const actualopUSDCgrowImplementation = await opUSDCgrowProxyInstance.implementation();
  if (getAddress(opUSDCgrow.Vault) == getAddress(actualopUSDCgrowImplementation)) {
    const opUSDCgrowInstance = await ethers.getContractAt(oldAbis.oldVaultV2, opUSDCgrow.VaultProxy);

    const usdcCurrentStrategyHash = await opUSDCgrowInstance.investStrategyHash();

    if (usdcCurrentStrategyHash != ethers.constants.HashZero) {
      const tx = await opUSDCgrowInstance.rebalance();
      await tx.wait(1);
    }
  }
}
