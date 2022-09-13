import { getAddress } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { ESSENTIAL_CONTRACTS } from "../../../../helpers/constants/essential-contracts-name";
import { oldAbis } from "../../../../helpers/data/oldAbis";
import { opWETHsave } from "../../_deployments/mainnet.json";

export async function wethRebalance(): Promise<void> {
  const opWETHsaveProxyInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, opWETHsave.VaultProxy);
  const actualopWETHsaveImplementation = await opWETHsaveProxyInstance.implementation();
  if (getAddress(opWETHsave.Vault) == getAddress(actualopWETHsaveImplementation)) {
    const opWETHsaveInstance = await ethers.getContractAt(oldAbis.oldVault, opWETHsave.VaultProxy);

    const wethCurrentStrategyHash = await opWETHsaveInstance.investStrategyHash();
    if (wethCurrentStrategyHash != ethers.constants.HashZero) {
      const tx = await opWETHsaveInstance.rebalance();
      await tx.wait(1);
    }
  }
}
