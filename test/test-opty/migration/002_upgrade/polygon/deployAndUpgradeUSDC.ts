import { ethers, network } from "hardhat";
import { ESSENTIAL_CONTRACTS } from "../../../../../helpers/constants/essential-contracts-name";
import { RegistryProxy, opUSDCgrow as opUSDCearn } from "../../../_deployments/polygon.json";
import * as Proxy from "../../../../../deployments/polygon/opUSDCearn_Proxy.json";

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
  const opUSDCearnInstance = await opUSDCearnFactory.deploy(RegistryProxy);
  const { getAddress } = ethers.utils;
  const opUSDCearnAddress = opUSDCearnInstance.address;
  const opUSDCearnProxyInstance = await ethers.getContractAt(Proxy.abi, opUSDCearn.VaultProxy);
  const proxyAdminAddress = await opUSDCearnProxyInstance.owner();
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [proxyAdminAddress],
  });
  const proxyAdminSigner = await ethers.getSigner(proxyAdminAddress);
  const signers = await ethers.getSigners();
  await signers[0].sendTransaction({
    to: proxyAdminAddress,
    value: ethers.utils.parseEther("1"),
  });
  if (getAddress(opUSDCearn.Vault) != getAddress(opUSDCearnAddress)) {
    const tx1 = await opUSDCearnProxyInstance.connect(proxyAdminSigner).upgradeTo(opUSDCearnAddress);
    await tx1.wait(1);
  }
}
