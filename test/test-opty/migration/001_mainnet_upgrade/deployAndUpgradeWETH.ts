import { ethers } from "hardhat";
import { VaultV3__factory } from "../../../../helpers/types/vaultv3";
import { InitializableImmutableAdminUpgradeabilityProxy__factory } from "../../../../typechain";
import { RegistryProxy, opWETHgrow as opWETHgrowObj } from "../../_deployments/mainnet.json";

export async function deployAndUpgradeWETH(): Promise<void> {
  const opWETHgrowFactory = await ethers.getContractFactory(VaultV3__factory.abi, VaultV3__factory.bytecode);
  const opWETHgrow = await opWETHgrowFactory.deploy(RegistryProxy, "Wrapped Ether", "WETH", "Growth", "grow");
  const { getAddress } = ethers.utils;
  const opWETHgrowAddress = opWETHgrow.address;

  const opWETHgrowProxyInstance = await ethers.getContractAt(
    InitializableImmutableAdminUpgradeabilityProxy__factory.abi,
    opWETHgrowObj.VaultProxy,
  );
  const proxyAdminAddress = await opWETHgrowProxyInstance.admin();
  const proxyAdminSigner = await ethers.getSigner(proxyAdminAddress);

  const implementationAddress = await opWETHgrowProxyInstance.implementation();

  if (getAddress(implementationAddress) != getAddress(opWETHgrowAddress)) {
    const tx1 = await opWETHgrowProxyInstance.connect(proxyAdminSigner).upgradeTo(opWETHgrowAddress);
    await tx1.wait(1);
  }
}
