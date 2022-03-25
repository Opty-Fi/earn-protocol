import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { oldAbis } from "../helpers/data/oldAbis";

const FORK = process.env.FORK;

const func: DeployFunction = async ({ ethers, getChainId, network }: HardhatRuntimeEnvironment) => {
  const chainId = await getChainId();
  const networkName = network.name;
  const { getAddress } = ethers.utils;

  if (chainId == "42" || FORK == "kovan" || networkName == "kovan") {
    const registryProxyAddress = "0xf710F75418353B36F2624784c290B80e7a5C892A";
    const registryProxyInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_PROXY, registryProxyAddress);
    const oldRegistryImplementationAddress = "0x50d6EdeA9890Ff5bdef46FEB34F1c9AEdfC388E3";
    const actualRegistryImplementationAddress = await registryProxyInstance.registryImplementation();
    if (getAddress(oldRegistryImplementationAddress) == getAddress(actualRegistryImplementationAddress)) {
      console.log("\n");
      console.log("Set zero strategy");
      console.log("\n");

      const registryInstance = await ethers.getContractAt(oldAbis.oldRegistry, registryProxyAddress);

      const strategyOperatorAddress = await registryInstance.getStrategyOperator();

      const signerStrategyOperator = await ethers.getSigner(strategyOperatorAddress);

      const strategyProviderAddress = "0x70519737cc146cd2378b62e93d8105aab9a1964d";

      const strategyProviderInstance = await ethers.getContractAt(oldAbis.oldStrategyProvider, strategyProviderAddress);

      const oldUSDCTokensHash = "0xe69df5c6b36eaf560f8370a38346a65efdc4a55bd665a6be013b74441e597c87";

      const opAVUSDCintProxyAddress = "0x118194e96b2d4b08957ba9a05508fb6d14a37a0d";
      const opAVUSDCintInstance = await ethers.getContractAt(oldAbis.oldVault, opAVUSDCintProxyAddress);

      const opAVUSDCintRiskProfileCode = await opAVUSDCintInstance.riskProfileCode();

      console.log("opAVUSDCintRiskProfileCode ", opAVUSDCintRiskProfileCode);
      console.log("\n");

      const defaultStrategyState = await strategyProviderInstance.getDefaultStrategyState();
      console.log("defaultStrategyState ", defaultStrategyState);
      console.log("\n");
      const usdcBestStrategyHash = await strategyProviderInstance.rpToTokenToBestStrategy(
        opAVUSDCintRiskProfileCode,
        oldUSDCTokensHash,
      );
      const usdcDefaultStrategyHash = await strategyProviderInstance.rpToTokenToDefaultStrategy(
        opAVUSDCintRiskProfileCode,
        oldUSDCTokensHash,
      );

      console.log("usdcBestStrategyHash ", usdcBestStrategyHash);
      console.log("\n");
      console.log("usdcDefaultStrategyHash ", usdcDefaultStrategyHash);
      console.log("\n");

      console.log("StrategyProvider.setBestStrategy");
      console.log("\n");
      if (usdcBestStrategyHash != ethers.constants.HashZero) {
        console.log("StrategyOperator setting HashZero as best strategy for USDC...");
        console.log("\n");
        await strategyProviderInstance
          .connect(signerStrategyOperator)
          .setBestStrategy(opAVUSDCintRiskProfileCode, oldUSDCTokensHash, ethers.constants.HashZero);
        console.log(
          "usdcBestStrategyHash ",
          await strategyProviderInstance.rpToTokenToBestStrategy(opAVUSDCintRiskProfileCode, oldUSDCTokensHash),
        );
        console.log("\n");
      } else {
        console.log("best strategy for USDC is already HashZero...");
        console.log("\n");
      }

      console.log("StrategyProvider.setBestDefaultStrategy");
      console.log("\n");
      if (usdcDefaultStrategyHash != ethers.constants.HashZero) {
        console.log("StrategyOperator setting HashZero as best default strategy for USDC...");
        console.log("\n");
        await strategyProviderInstance
          .connect(signerStrategyOperator)
          .setBestDefaultStrategy(opAVUSDCintRiskProfileCode, oldUSDCTokensHash, ethers.constants.HashZero);
        console.log(
          "usdcDefaultStrategyHash ",
          await strategyProviderInstance.rpToTokenToDefaultStrategy(opAVUSDCintRiskProfileCode, oldUSDCTokensHash),
        );
        console.log("\n");
      } else {
        console.log("default strategy for USDC is already HashZero...");
        console.log("\n");
      }

      console.log("Checking strategy hash on next rebalance from RiskManager..");
      console.log("\n");
      const riskManageProxyAddress = "0xe61ec00d34a93330775e8a8af0b16b03799b377d";
      const riskManagerInstance = await ethers.getContractAt(oldAbis.oldRiskManager, riskManageProxyAddress);
      console.log(
        "opAVUSDCint next strategy ",
        await riskManagerInstance.getBestStrategy(opAVUSDCintRiskProfileCode, [
          "0xe22da380ee6b445bb8273c81944adeb6e8450422",
        ]),
      );
      console.log("\n");
    } else {
      console.log("Migration is already done");
      console.log("\n");
    }
  } else {
    console.log("Network is not kovan, hence skipping setting zero strategy");
    console.log("\n");
  }
};
export default func;
func.tags = ["KovanSetZeroStrategy"];
