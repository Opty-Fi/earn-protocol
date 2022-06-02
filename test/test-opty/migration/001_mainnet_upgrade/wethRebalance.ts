import { getAddress } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { ESSENTIAL_CONTRACTS } from "../../../../helpers/constants/essential-contracts-name";
import { oldAbis } from "../../../../helpers/data/oldAbis";
import { opWETHgrow } from "../../_deployments/mainnet.json";

export async function wethRebalance(): Promise<void> {
  const opWETHgrowProxyInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, opWETHgrow.VaultProxy);
  const actualopWETHgrowImplementation = await opWETHgrowProxyInstance.implementation();
  if (getAddress(opWETHgrow.Vault) == getAddress(actualopWETHgrowImplementation)) {
    const opWETHgrowInstance = await ethers.getContractAt(oldAbis.oldVault, opWETHgrow.VaultProxy);

    const wethCurrentStrategyHash = await opWETHgrowInstance.investStrategyHash();
    if (wethCurrentStrategyHash != ethers.constants.HashZero) {
      const tx = await opWETHgrowInstance.rebalance();
      await tx.wait(1);
    }
  }
}
