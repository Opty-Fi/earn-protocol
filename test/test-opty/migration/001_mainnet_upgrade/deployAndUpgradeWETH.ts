import { ethers } from "hardhat";
import { ESSENTIAL_CONTRACTS } from "../../../../helpers/constants/essential-contracts-name";
import { RegistryProxy, opWETHsave as opWETHsaveObj } from "../../_deployments/mainnet.json";

export async function deployAndUpgradeWETH(): Promise<void> {
  const opWETHsaveFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.VAULT);
  const opWETHsave = await opWETHsaveFactory.deploy(RegistryProxy, "Wrapped Ether", "WETH", "Save", "save");
  const { getAddress } = ethers.utils;
  const opWETHsaveAddress = opWETHsave.address;

  const opWETHsaveProxyInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, opWETHsaveObj.VaultProxy);
  const proxyAdminAddress = await opWETHsaveProxyInstance.admin();
  const proxyAdminSigner = await ethers.getSigner(proxyAdminAddress);

  const implementationAddress = await opWETHsaveProxyInstance.implementation();

  if (getAddress(implementationAddress) != getAddress(opWETHsaveAddress)) {
    const tx1 = await opWETHsaveProxyInstance.connect(proxyAdminSigner).upgradeTo(opWETHsaveAddress);
    await tx1.wait(1);
  }
}
