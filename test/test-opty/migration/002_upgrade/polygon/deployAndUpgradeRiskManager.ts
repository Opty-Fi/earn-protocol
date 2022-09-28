import { getAddress } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { ESSENTIAL_CONTRACTS } from "../../../../../helpers/constants/essential-contracts-name";
import { Registry, RiskManagerProxy } from "../../../../../typechain";
import {
  RegistryProxy as registryProxyAddress,
  RiskManagerProxy as riskManagerProxyAddress,
} from "../../../_deployments/polygon.json";

export async function deployAndUpgradeRiskManager(): Promise<void> {
  const riskManagerFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.RISK_MANAGER);
  const riskManagerV2 = await riskManagerFactory.deploy(registryProxyAddress);

  const riskManagerV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER, riskManagerV2.address);

  const riskManagerInstance = <RiskManagerProxy>(
    await ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER_PROXY, riskManagerProxyAddress)
  );

  const registryV2Instance = <Registry>await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const operatorAddress = await registryV2Instance.operator();
  const operatorSigner = await ethers.getSigner(operatorAddress);
  const governanceAddress = await registryV2Instance.governance();
  const governanceSigner = await ethers.getSigner(governanceAddress);

  const riskManagerImplementation = await riskManagerInstance.riskManagerImplementation();

  if (getAddress(riskManagerV2.address) != getAddress(riskManagerImplementation)) {
    const pendingImplementation = await riskManagerInstance.pendingRiskManagerImplementation();
    if (getAddress(pendingImplementation) != getAddress(riskManagerV2Instance.address)) {
      const setPendingImplementationTx = await riskManagerInstance
        .connect(operatorSigner)
        .setPendingImplementation(riskManagerV2.address);
      await setPendingImplementationTx.wait(1);
    }
    const becomeTx = await riskManagerV2Instance.connect(governanceSigner).become(riskManagerProxyAddress);
    await becomeTx.wait(1);
    const riskManagerRegisteredInRegistry = await registryV2Instance.riskManager();
    if (getAddress(riskManagerRegisteredInRegistry) != getAddress(riskManagerInstance.address)) {
      const setRiskManagerTx = await registryV2Instance.connect(operatorSigner).setRiskManager(riskManagerProxyAddress);
      await setRiskManagerTx.wait();
    }
  }
}
