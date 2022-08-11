import { ethers } from "hardhat";
import { ESSENTIAL_CONTRACTS } from "../../../../helpers/constants/essential-contracts-name";
import { RegistryProxy, opWETHgrow as opWETHgrowObj } from "../../_deployments/mainnet.json";

export async function deployAndUpgradeWETH(): Promise<void> {
  const strategyManagerFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.STRATEGY_MANAGER);
  const strategyManager = await strategyManagerFactory.deploy();
  const claimAndHarvestFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.CLAIM_AND_HARVEST);
  const claimAndHarvest = await claimAndHarvestFactory.deploy();

  const opWETHgrowFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.VAULT, {
    libraries: {
      "contracts/protocol/lib/StrategyManager.sol:StrategyManager": strategyManager.address,
      "contracts/protocol/lib/ClaimAndHarvest.sol:ClaimAndHarvest": claimAndHarvest.address,
    },
  });
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
