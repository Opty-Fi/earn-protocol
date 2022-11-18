import { getAddress } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { RegistryV1, RegistryV1__factory } from "../../../../helpers/types/registryV1";
import { RiskManagerProxyV1 } from "../../../../helpers/types/riskManagerv1";
import { RiskManagerProxyV1__factory } from "../../../../helpers/types/riskManagerv1/factories/RiskManagerProxyV1__factory";
import { RiskManagerV1__factory } from "../../../../helpers/types/riskManagerv1/factories/RiskManagerV1__factory";
import {
  RegistryProxy as registryProxyAddress,
  RiskManagerProxy as riskManagerProxyAddress,
} from "../../_deployments/mainnet.json";

export async function deployAndUpgradeRiskManager(): Promise<void> {
  const riskManagerFactory = await ethers.getContractFactory(
    RiskManagerV1__factory.abi,
    RiskManagerV1__factory.bytecode,
  );
  const riskManagerV2 = await riskManagerFactory.deploy(registryProxyAddress);

  const riskManagerV2Instance = await ethers.getContractAt(RiskManagerV1__factory.abi, riskManagerV2.address);

  const riskManagerInstance = <RiskManagerProxyV1>(
    await ethers.getContractAt(RiskManagerProxyV1__factory.abi, riskManagerProxyAddress)
  );

  const registryV2Instance = <RegistryV1>await ethers.getContractAt(RegistryV1__factory.abi, registryProxyAddress);
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
