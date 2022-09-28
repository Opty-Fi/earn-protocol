import { ethers } from "hardhat";
import { ESSENTIAL_CONTRACTS } from "../../../../helpers/constants/essential-contracts-name";
import { RegistryProxy, opWETHgrow as opWETHgrowObj } from "../../_deployments/mainnet.json";

export async function deployAndUpgradeWETH(): Promise<void> {
  const opWETHgrowFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.VAULT);
  const opWETHgrow = await opWETHgrowFactory.deploy(RegistryProxy, "Wrapped Ether", "WETH", "Growth", "grow");
  const { getAddress } = ethers.utils;
  const opWETHgrowAddress = opWETHgrow.address;

  const opWETHgrowProxyInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, opWETHgrowObj.VaultProxy);
  const proxyAdminAddress = await opWETHgrowProxyInstance.admin();
  const proxyAdminSigner = await ethers.getSigner(proxyAdminAddress);

  const implementationAddress = await opWETHgrowProxyInstance.implementation();

  if (getAddress(implementationAddress) != getAddress(opWETHgrowAddress)) {
    const tx1 = await opWETHgrowProxyInstance.connect(proxyAdminSigner).upgradeTo(opWETHgrowAddress);
    await tx1.wait(1);
  }
}
