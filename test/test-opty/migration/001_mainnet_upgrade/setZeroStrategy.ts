import { ethers } from "hardhat";
import { oldAbis } from "../../../../helpers/data/oldAbis";
import { RegistryProxyV1, RegistryProxyV1__factory } from "../../../../helpers/types/registryV1";
import {
  RegistryProxy as RegistryProxyAddress,
  Registry as OldRegistryImplementationAddress,
  StrategyProvider as StrategyProviderAddress,
} from "../../_deployments/mainnet.json";

export async function setZeroStrategy(): Promise<void> {
  const { getAddress } = ethers.utils;
  const registryProxyInstance = <RegistryProxyV1>(
    await ethers.getContractAt(RegistryProxyV1__factory.abi, RegistryProxyAddress)
  );
  const actualRegistryImplementationAddress = await registryProxyInstance.registryImplementation();
  if (getAddress(OldRegistryImplementationAddress) == getAddress(actualRegistryImplementationAddress)) {
    const registryInstance = await ethers.getContractAt(oldAbis.oldRegistry, RegistryProxyAddress);
    const strategyOperatorAddress = await registryInstance.getStrategyOperator();
    const signerStrategyOperator = await ethers.getSigner(strategyOperatorAddress);
    const strategyProviderInstance = await ethers.getContractAt(oldAbis.oldStrategyProvider, StrategyProviderAddress);
    const oldUSDCTokensHash = "0x987a96a91381a62e90a58f1c68177b52aa669f3bd7798e321819de5f870d4ddd";
    const oldWETHTokensHash = "0x23a659933d87059bc00a17f29f4d98c03eb8986a90c1bec799741278c741576d";
    const opUSDCgrowProxyAddress = "0x6d8BfdB4c4975bB086fC9027e48D5775f609fF88";
    const opUSDCgrowInstance = await ethers.getContractAt(oldAbis.oldVaultV2, opUSDCgrowProxyAddress);
    const opWETHgrowProxyAddress = "0xFf2fbd9Fbc6d03BAA77cf97A3D5671bEA183b9a8";
    const opWETHgrowInstance = await ethers.getContractAt(oldAbis.oldVaultV2, opWETHgrowProxyAddress);
    const opUSDCearnRiskProfileCode = await opUSDCgrowInstance.riskProfileCode();
    const opWETHearnRiskProfileCode = await opWETHgrowInstance.riskProfileCode();
    const usdcBestStrategyHash = await strategyProviderInstance.rpToTokenToBestStrategy(
      opUSDCearnRiskProfileCode,
      oldUSDCTokensHash,
    );
    const usdcDefaultStrategyHash = await strategyProviderInstance.rpToTokenToDefaultStrategy(
      opUSDCearnRiskProfileCode,
      oldUSDCTokensHash,
    );
    const wethBestStrategyHash = await strategyProviderInstance.rpToTokenToBestStrategy(
      opWETHearnRiskProfileCode,
      oldWETHTokensHash,
    );
    const wethDefaultStrategyHash = await strategyProviderInstance.rpToTokenToDefaultStrategy(
      opWETHearnRiskProfileCode,
      oldWETHTokensHash,
    );

    if (usdcBestStrategyHash != ethers.constants.HashZero) {
      const tx1 = await strategyProviderInstance
        .connect(signerStrategyOperator)
        .setBestStrategy(opUSDCearnRiskProfileCode, oldUSDCTokensHash, ethers.constants.HashZero);
      await tx1.wait(1);
    }
    if (wethBestStrategyHash != ethers.constants.HashZero) {
      const tx2 = await strategyProviderInstance
        .connect(signerStrategyOperator)
        .setBestStrategy(opWETHearnRiskProfileCode, oldWETHTokensHash, ethers.constants.HashZero);
      await tx2.wait(1);
    }

    if (usdcDefaultStrategyHash != ethers.constants.HashZero) {
      const tx3 = await strategyProviderInstance
        .connect(signerStrategyOperator)
        .setBestDefaultStrategy(opUSDCearnRiskProfileCode, oldUSDCTokensHash, ethers.constants.HashZero);
      await tx3.wait(1);
    }
    if (wethDefaultStrategyHash != ethers.constants.HashZero) {
      const tx4 = await strategyProviderInstance
        .connect(signerStrategyOperator)
        .setBestDefaultStrategy(opWETHearnRiskProfileCode, oldWETHTokensHash, ethers.constants.HashZero);
      await tx4.wait(1);
    }
  }
}
