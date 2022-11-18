import { getAddress } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { oldAbis } from "../../../../helpers/data/oldAbis";
import { InitializableImmutableAdminUpgradeabilityProxy__factory } from "../../../../typechain";
import { opWETHgrow } from "../../_deployments/mainnet.json";

export async function wethRebalance(): Promise<void> {
  const opWETHgrowProxyInstance = await ethers.getContractAt(
    InitializableImmutableAdminUpgradeabilityProxy__factory.abi,
    opWETHgrow.VaultProxy,
  );
  const actualopWETHgrowImplementation = await opWETHgrowProxyInstance.implementation();
  if (getAddress(opWETHgrow.Vault) == getAddress(actualopWETHgrowImplementation)) {
    const opWETHgrowInstance = await ethers.getContractAt(oldAbis.oldVaultV2, opWETHgrow.VaultProxy);

    const wethCurrentStrategyHash = await opWETHgrowInstance.investStrategyHash();
    if (wethCurrentStrategyHash != ethers.constants.HashZero) {
      const tx = await opWETHgrowInstance.rebalance();
      await tx.wait(1);
    }
  }
}
