import { getAddress } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { ESSENTIAL_CONTRACTS } from "../../../../../helpers/constants/essential-contracts-name";
import { Registry } from "../../../../../typechain";
import { RegistryProxy as registryProxyAddress } from "../../../_deployments/mainnet.json";

export async function deployStrategyProvider(): Promise<string> {
  const strategyProviderFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER);
  const strategyProviderV2 = await strategyProviderFactory.deploy(registryProxyAddress);

  const registryV2Instance = <Registry>await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
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
