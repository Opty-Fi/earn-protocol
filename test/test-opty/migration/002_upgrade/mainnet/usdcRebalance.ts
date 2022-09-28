import { getAddress } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { ESSENTIAL_CONTRACTS } from "../../../../../helpers/constants/essential-contracts-name";
import { oldAbis } from "../../../../../helpers/data/oldAbis";
import { opUSDCgrow as opUSDCsave } from "../../../_deployments/mainnet.json";

export async function usdcRebalance(): Promise<void> {
  const opUSDCearnProxyInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, opUSDCsave.VaultProxy);
  const actualopUSDCearnImplementation = await opUSDCearnProxyInstance.implementation();
  if (getAddress(opUSDCsave.Vault) == getAddress(actualopUSDCearnImplementation)) {
    const opUSDCearnInstance = await ethers.getContractAt(oldAbis.oldVaultV2, opUSDCsave.VaultProxy);

    const usdcCurrentStrategyHash = await opUSDCearnInstance.investStrategyHash();

    if (usdcCurrentStrategyHash != ethers.constants.HashZero) {
      const tx = await opUSDCearnInstance.rebalance();
      await tx.wait(1);
    }
  }
}
