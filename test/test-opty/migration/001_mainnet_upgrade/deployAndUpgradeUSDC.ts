import { ethers } from "hardhat";
import { ESSENTIAL_CONTRACTS } from "../../../../helpers/constants/essential-contracts-name";
import { RegistryProxy, opUSDCgrow as opUSDCgrowObj } from "../../_deployments/mainnet.json";

export async function deployAndUpgradeUSDC(): Promise<void> {
  const strategyManagerFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.STRATEGY_MANAGER);
  const strategyManager = await strategyManagerFactory.deploy();
  const claimAndHarvestFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.CLAIM_AND_HARVEST);
  const claimAndHarvest = await claimAndHarvestFactory.deploy();

  const opUSDCgrowFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.VAULT, {
    libraries: {
      "contracts/protocol/lib/StrategyManager.sol:StrategyManager": strategyManager.address,
      "contracts/protocol/lib/ClaimAndHarvest.sol:ClaimAndHarvest": claimAndHarvest.address,
    },
  });
  const opUSDCgrow = await opUSDCgrowFactory.deploy(RegistryProxy);
  const { getAddress } = ethers.utils;
  const opUSDCgrowAddress = opUSDCgrow.address;

  const opUSDCgrowProxyInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, opUSDCgrowObj.VaultProxy);
  const proxyAdminAddress = await opUSDCgrowProxyInstance.admin();
  const proxyAdminSigner = await ethers.getSigner(proxyAdminAddress);

  const implementationAddress = await opUSDCgrowProxyInstance.implementation();
  if (getAddress(implementationAddress) != getAddress(opUSDCgrowAddress)) {
    const tx1 = await opUSDCgrowProxyInstance.connect(proxyAdminSigner).upgradeTo(opUSDCgrowAddress);
    await tx1.wait(1);
  }
}
