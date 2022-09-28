import { ethers } from "hardhat";
import { ESSENTIAL_CONTRACTS } from "../../../../../helpers/constants/essential-contracts-name";
import { RegistryProxy, opWETHgrow as opWETHsave } from "../../../_deployments/mainnet.json";

export async function deployAndUpgradeWETH(): Promise<void> {
  const strategyManagerFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.STRATEGY_MANAGER);
  const strategyManager = await strategyManagerFactory.deploy();
  const claimAndHarvestFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.CLAIM_AND_HARVEST);
  const claimAndHarvest = await claimAndHarvestFactory.deploy();

  const opWETHearnFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.VAULT, {
    libraries: {
      "contracts/protocol/lib/StrategyManager.sol:StrategyManager": strategyManager.address,
      "contracts/protocol/lib/ClaimAndHarvest.sol:ClaimAndHarvest": claimAndHarvest.address,
    },
  });
  const opWETHearn = await opWETHearnFactory.deploy(RegistryProxy);
  const { getAddress } = ethers.utils;
  const opWETHearnAddress = opWETHearn.address;

  const opWETHearnProxyInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, opWETHsave.VaultProxy);
  const proxyAdminAddress = await opWETHearnProxyInstance.admin();
  const proxyAdminSigner = await ethers.getSigner(proxyAdminAddress);

  const implementationAddress = await opWETHearnProxyInstance.implementation();

  if (getAddress(implementationAddress) != getAddress(opWETHearnAddress)) {
    const tx1 = await opWETHearnProxyInstance.connect(proxyAdminSigner).upgradeTo(opWETHearnAddress);
    await tx1.wait(1);
  }
}
