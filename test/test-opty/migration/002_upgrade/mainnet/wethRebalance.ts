import { getAddress } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { ESSENTIAL_CONTRACTS } from "../../../../../helpers/constants/essential-contracts-name";
import { oldAbis } from "../../../../../helpers/data/oldAbis";
import { opWETHgrow as opWETHsave } from "../../../_deployments/mainnet.json";

export async function wethRebalance(): Promise<void> {
  const opWETHearnProxyInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, opWETHsave.VaultProxy);
  const actualopWETHearnImplementation = await opWETHearnProxyInstance.implementation();
  if (getAddress(opWETHsave.Vault) == getAddress(actualopWETHearnImplementation)) {
    const opWETHearnInstance = await ethers.getContractAt(oldAbis.oldVaultV2, opWETHsave.VaultProxy);

    const wethCurrentStrategyHash = await opWETHearnInstance.investStrategyHash();
    if (wethCurrentStrategyHash != ethers.constants.HashZero) {
      const tx = await opWETHearnInstance.rebalance();
      await tx.wait(1);
    }
  }
}
