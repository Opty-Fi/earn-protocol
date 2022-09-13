import { getAddress } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { ESSENTIAL_CONTRACTS } from "../../../../helpers/constants/essential-contracts-name";
import { oldAbis } from "../../../../helpers/data/oldAbis";
import { opUSDCearn } from "../../_deployments/";

export async function usdcRebalance(): Promise<void> {
  const opUSDCearnProxyInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, opUSDCearn.VaultProxy);
  const actualopUSDCearnImplementation = await opUSDCearnProxyInstance.implementation();
  if (getAddress(opUSDCearn.Vault) == getAddress(actualopUSDCearnImplementation)) {
    const opUSDCearnInstance = await ethers.getContractAt(oldAbis.oldVault, opUSDCearn.VaultProxy);

    const usdcCurrentStrategyHash = await opUSDCearnInstance.investStrategyHash();

    if (usdcCurrentStrategyHash != ethers.constants.HashZero) {
      const tx = await opUSDCearnInstance.rebalance();
      await tx.wait(1);
    }
  }
}
