import { ethers } from "hardhat";
import { ESSENTIAL_CONTRACTS } from "../../../../helpers/constants/essential-contracts-name";
import { RegistryProxy, opUSDCsave as opUSDCsaveObj } from "../../_deployments/mainnet.json";

export async function deployAndUpgradeUSDC(): Promise<void> {
  const opUSDCsaveFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.VAULT);
  const opUSDCsave = await opUSDCsaveFactory.deploy(RegistryProxy, "USD Coin", "USDC", "Save", "save");
  const { getAddress } = ethers.utils;
  const opUSDCsaveAddress = opUSDCsave.address;

  const opUSDCsaveProxyInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, opUSDCsaveObj.VaultProxy);
  const proxyAdminAddress = await opUSDCsaveProxyInstance.admin();
  const proxyAdminSigner = await ethers.getSigner(proxyAdminAddress);

  const implementationAddress = await opUSDCsaveProxyInstance.implementation();
  if (getAddress(implementationAddress) != getAddress(opUSDCsaveAddress)) {
    const tx1 = await opUSDCsaveProxyInstance.connect(proxyAdminSigner).upgradeTo(opUSDCsaveAddress);
    await tx1.wait(1);
  }
}
