import { getAddress } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { RegistryV1, RegistryV1__factory } from "../../../../helpers/types/registryV1";
import { StrategyProviderV1__factory } from "../../../../helpers/types/strategyProviderv1";
import { RegistryProxy as registryProxyAddress } from "../../_deployments/mainnet.json";

export async function deployStrategyProvider(): Promise<string> {
  const strategyProviderFactory = await ethers.getContractFactory(
    StrategyProviderV1__factory.abi,
    StrategyProviderV1__factory.bytecode,
  );
  const strategyProviderV2 = await strategyProviderFactory.deploy(registryProxyAddress);

  const registryV2Instance = <RegistryV1>await ethers.getContractAt(RegistryV1__factory.abi, registryProxyAddress);
  const operatorAddress = await registryV2Instance.operator();
  const operatorSigner = await ethers.getSigner(operatorAddress);

  const oldStrategyProvider = await registryV2Instance.getStrategyProvider();

  if (getAddress(oldStrategyProvider) !== getAddress(strategyProviderV2.address)) {
    const setStrategyProviderTx = await registryV2Instance
      .connect(operatorSigner)
      .setStrategyProvider(strategyProviderV2.address);
    await setStrategyProviderTx.wait(1);
  }
  return await registryV2Instance.getStrategyProvider();
}
