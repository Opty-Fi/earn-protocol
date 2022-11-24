import { ethers } from "hardhat";
import { VaultV3__factory } from "../../../../helpers/types/vaultv3";
import { InitializableImmutableAdminUpgradeabilityProxy__factory } from "../../../../typechain";
import { RegistryProxy, opUSDCgrow as opUSDCgrowObj } from "../../_deployments/mainnet.json";

export async function deployAndUpgradeUSDC(): Promise<void> {
  const opUSDCgrowFactory = await ethers.getContractFactory(VaultV3__factory.abi, VaultV3__factory.bytecode);
  const opUSDCgrow = await opUSDCgrowFactory.deploy(RegistryProxy, "USD Coin", "USDC", "Growth", "grow");
  const { getAddress } = ethers.utils;
  const opUSDCgrowAddress = opUSDCgrow.address;

  const opUSDCgrowProxyInstance = await ethers.getContractAt(
    InitializableImmutableAdminUpgradeabilityProxy__factory.abi,
    opUSDCgrowObj.VaultProxy,
  );
  const proxyAdminAddress = await opUSDCgrowProxyInstance.admin();
  const proxyAdminSigner = await ethers.getSigner(proxyAdminAddress);

  const implementationAddress = await opUSDCgrowProxyInstance.implementation();
  if (getAddress(implementationAddress) != getAddress(opUSDCgrowAddress)) {
    const tx1 = await opUSDCgrowProxyInstance.connect(proxyAdminSigner).upgradeTo(opUSDCgrowAddress);
    await tx1.wait(1);
  }
}
