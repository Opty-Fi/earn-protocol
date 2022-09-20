import { ethers } from "hardhat";
import { ESSENTIAL_CONTRACTS } from "../../../../helpers/constants/essential-contracts-name";
import { RegistryProxy, opUSDCearn as opUSDCearnObj } from "../../_deployments/mainnet.json";

export async function deployAndUpgradeUSDC(): Promise<void> {
  const strategyManagerFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.STRATEGY_MANAGER);
  const strategyManager = await strategyManagerFactory.deploy();
  const claimAndHarvestFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.CLAIM_AND_HARVEST);
  const claimAndHarvest = await claimAndHarvestFactory.deploy();

  const opUSDCearnFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.VAULT, {
    libraries: {
      "contracts/protocol/lib/StrategyManager.sol:StrategyManager": strategyManager.address,
      "contracts/protocol/lib/ClaimAndHarvest.sol:ClaimAndHarvest": claimAndHarvest.address,
    },
  });
  const opUSDCearn = await opUSDCearnFactory.deploy(RegistryProxy);
  const { getAddress } = ethers.utils;
  const opUSDCearnAddress = opUSDCearn.address;

  const opUSDCearnProxyInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, opUSDCearnObj.VaultProxy);
  const proxyAdminAddress = await opUSDCearnProxyInstance.admin();
  const proxyAdminSigner = await ethers.getSigner(proxyAdminAddress);

  const implementationAddress = await opUSDCearnProxyInstance.implementation();
  if (getAddress(implementationAddress) != getAddress(opUSDCearnAddress)) {
    const tx1 = await opUSDCearnProxyInstance.connect(proxyAdminSigner).upgradeTo(opUSDCearnAddress);
    await tx1.wait(1);
  }
}
