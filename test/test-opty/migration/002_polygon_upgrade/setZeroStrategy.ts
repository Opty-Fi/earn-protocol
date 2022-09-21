import { ethers } from "hardhat";
import { legos as PolygonLegos } from "@optyfi/defi-legos/polygon";
import { eEVMNetwork, NETWORKS_CHAIN_ID_HEX } from "../../../../helper-hardhat-config";
import { ESSENTIAL_CONTRACTS } from "../../../../helpers/constants/essential-contracts-name";
import { generateTokenHashV2 } from "../../../../helpers/helpers";
import {
  RegistryProxy as RegistryProxyAddress,
  Registry as OldRegistryImplementationAddress,
  StrategyProvider as StrategyProviderAddress,
} from "../../_deployments/polygon.json";
import * as Registry from "../../../../deployments/polygon/Registry.json";
import * as StrategyProvider from "../../../../deployments/polygon/StrategyProvider.json";

export async function setZeroStrategy(): Promise<void> {
  const { getAddress } = ethers.utils;
  const registryProxyInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_PROXY, RegistryProxyAddress);
  const actualRegistryImplementationAddress = await registryProxyInstance.registryImplementation();
  if (getAddress(OldRegistryImplementationAddress) == getAddress(actualRegistryImplementationAddress)) {
    const registryInstance = await ethers.getContractAt(Registry.abi, RegistryProxyAddress);
    const strategyOperatorAddress = await registryInstance.getStrategyOperator();
    const signerStrategyOperator = await ethers.getSigner(strategyOperatorAddress);
    const strategyProviderInstance = await ethers.getContractAt(StrategyProvider.abi, StrategyProviderAddress);
    const signers = await ethers.getSigners();
    await signers[0].sendTransaction({
      to: signerStrategyOperator.address,
      value: ethers.utils.parseEther("1"),
    });
    const oldUSDCTokensHash = generateTokenHashV2(
      [PolygonLegos.tokens.USDC],
      NETWORKS_CHAIN_ID_HEX[eEVMNetwork.polygon],
    );
    const opUSDCearnRiskProfileCode = 1;
    const usdcBestStrategyHash = await strategyProviderInstance.getRpToTokenToBestStrategy(
      opUSDCearnRiskProfileCode,
      oldUSDCTokensHash,
    );
    const usdcDefaultStrategyHash = await strategyProviderInstance.getRpToTokenToDefaultStrategy(
      opUSDCearnRiskProfileCode,
      oldUSDCTokensHash,
    );

    if (usdcBestStrategyHash != ethers.constants.HashZero) {
      const tx1 = await strategyProviderInstance
        .connect(signerStrategyOperator)
        .setBestStrategy(opUSDCearnRiskProfileCode, oldUSDCTokensHash, []);
      await tx1.wait(1);
    }

    if (usdcDefaultStrategyHash != ethers.constants.HashZero) {
      const tx3 = await strategyProviderInstance
        .connect(signerStrategyOperator)
        .setBestDefaultStrategy(opUSDCearnRiskProfileCode, oldUSDCTokensHash, []);
      await tx3.wait(1);
    }
  }
}
