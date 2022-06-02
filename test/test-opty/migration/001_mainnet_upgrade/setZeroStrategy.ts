import { ethers } from "hardhat";
import { ESSENTIAL_CONTRACTS } from "../../../../helpers/constants/essential-contracts-name";
import { oldAbis } from "../../../../helpers/data/oldAbis";
import {
  RegistryProxy as RegistryProxyAddress,
  Registry as OldRegistryImplementationAddress,
  StrategyProvider as StrategyProviderAddress,
} from "../../_deployments/mainnet.json";

export async function setZeroStrategy(): Promise<void> {
  const { getAddress } = ethers.utils;
  const registryProxyInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_PROXY, RegistryProxyAddress);
  const actualRegistryImplementationAddress = await registryProxyInstance.registryImplementation();
  if (getAddress(OldRegistryImplementationAddress) == getAddress(actualRegistryImplementationAddress)) {
    const registryInstance = await ethers.getContractAt(oldAbis.oldRegistry, RegistryProxyAddress);
    const strategyOperatorAddress = await registryInstance.getStrategyOperator();
    const signerStrategyOperator = await ethers.getSigner(strategyOperatorAddress);
    const strategyProviderInstance = await ethers.getContractAt(oldAbis.oldStrategyProvider, StrategyProviderAddress);
    const oldUSDCTokensHash = "0x987a96a91381a62e90a58f1c68177b52aa669f3bd7798e321819de5f870d4ddd";
    const oldWETHTokensHash = "0x23a659933d87059bc00a17f29f4d98c03eb8986a90c1bec799741278c741576d";
    const opUSDCgrowProxyAddress = "0x6d8bfdb4c4975bb086fc9027e48d5775f609ff88";
    const opUSDCgrowInstance = await ethers.getContractAt(oldAbis.oldVault, opUSDCgrowProxyAddress);
    const opWETHgrowProxyAddress = "0xff2fbd9fbc6d03baa77cf97a3d5671bea183b9a8";
    const opWETHgrowInstance = await ethers.getContractAt(oldAbis.oldVault, opWETHgrowProxyAddress);
    const opUSDCgrowRiskProfileCode = await opUSDCgrowInstance.riskProfileCode();
    const opWETHgrowRiskProfileCode = await opWETHgrowInstance.riskProfileCode();
    const usdcBestStrategyHash = await strategyProviderInstance.rpToTokenToBestStrategy(
      opUSDCgrowRiskProfileCode,
      oldUSDCTokensHash,
    );
    const usdcDefaultStrategyHash = await strategyProviderInstance.rpToTokenToDefaultStrategy(
      opUSDCgrowRiskProfileCode,
      oldUSDCTokensHash,
    );
    const wethBestStrategyHash = await strategyProviderInstance.rpToTokenToBestStrategy(
      opWETHgrowRiskProfileCode,
      oldWETHTokensHash,
    );
    const wethDefaultStrategyHash = await strategyProviderInstance.rpToTokenToDefaultStrategy(
      opWETHgrowRiskProfileCode,
      oldWETHTokensHash,
    );

    if (usdcBestStrategyHash != ethers.constants.HashZero) {
      const tx1 = await strategyProviderInstance
        .connect(signerStrategyOperator)
        .setBestStrategy(opUSDCgrowRiskProfileCode, oldUSDCTokensHash, ethers.constants.HashZero);
      await tx1.wait(1);
    }
    if (wethBestStrategyHash != ethers.constants.HashZero) {
      const tx2 = await strategyProviderInstance
        .connect(signerStrategyOperator)
        .setBestStrategy(opWETHgrowRiskProfileCode, oldWETHTokensHash, ethers.constants.HashZero);
      await tx2.wait(1);
    }

    if (usdcDefaultStrategyHash != ethers.constants.HashZero) {
      const tx3 = await strategyProviderInstance
        .connect(signerStrategyOperator)
        .setBestDefaultStrategy(opUSDCgrowRiskProfileCode, oldUSDCTokensHash, ethers.constants.HashZero);
      await tx3.wait(1);
    }
    if (wethDefaultStrategyHash != ethers.constants.HashZero) {
      const tx4 = await strategyProviderInstance
        .connect(signerStrategyOperator)
        .setBestDefaultStrategy(opWETHgrowRiskProfileCode, oldWETHTokensHash, ethers.constants.HashZero);
      await tx4.wait(1);
    }
  }
}
