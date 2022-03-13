import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { oldAbis } from "../helpers/data/oldAbis";

const FORK = process.env.FORK;

const func: DeployFunction = async ({ ethers, getChainId }: HardhatRuntimeEnvironment) => {
  const chainId = await getChainId();
  const networkName = hre.network.name;

  if (chainId == "1" || FORK == "mainnet" || networkName == "mainnet") {
    console.log("\n");
    console.log("Set zero strategy");
    console.log("\n");
    const registryProxyAddress = "0x99fa011e33a8c6196869dec7bc407e896ba67fe3";
    const registryInstance = await ethers.getContractAt(oldAbis.oldRegistry, registryProxyAddress);

    const strategyOperatorAddress = await registryInstance.getStrategyOperator();

    const signerStrategyOperator = await ethers.getSigner(strategyOperatorAddress);

    const strategyProviderAddress = "0x23f028cbbd6cdac0e430f6d943ff695a32f8461a";

    const strategyProviderInstance = await ethers.getContractAt(oldAbis.oldStrategyProvider, strategyProviderAddress);

    const oldUSDCTokensHash = "0x987a96a91381a62e90a58f1c68177b52aa669f3bd7798e321819de5f870d4ddd";
    const oldWETHTokensHash = "0x23a659933d87059bc00a17f29f4d98c03eb8986a90c1bec799741278c741576d";

    const opUSDCgrowProxyAddress = "0x6d8bfdb4c4975bb086fc9027e48d5775f609ff88";
    const opUSDCgrowInstance = await ethers.getContractAt(oldAbis.oldVault, opUSDCgrowProxyAddress);
    const opWETHgrowProxyAddress = "0xff2fbd9fbc6d03baa77cf97a3d5671bea183b9a8";
    const opWETHgrowInstance = await ethers.getContractAt(oldAbis.oldVault, opWETHgrowProxyAddress);

    const opUSDCgrowRiskProfileCode = await opUSDCgrowInstance.riskProfileCode();
    const opWETHgrowRiskProfileCode = await opWETHgrowInstance.riskProfileCode();

    console.log("opUSDCgrowRiskProfileCode ", opUSDCgrowRiskProfileCode);
    console.log("\n");
    console.log("opWETHgrowRiskProfileCode ", opWETHgrowRiskProfileCode);
    console.log("\n");

    const defaultStrategyState = await strategyProviderInstance.getDefaultStrategyState();
    console.log("defaultStrategyState ", defaultStrategyState);
    console.log("\n");
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

    console.log("usdcBestStrategyHash ", usdcBestStrategyHash);
    console.log("\n");
    console.log("usdcDefaultStrategyHash ", usdcDefaultStrategyHash);
    console.log("\n");
    console.log("wethBestStrategyHash ", wethBestStrategyHash);
    console.log("\n");
    console.log("wethDefaultStrategyHash ", wethDefaultStrategyHash);
    console.log("\n");

    console.log("StrategyProvider.setBestStrategy");
    console.log("\n");
    if (usdcBestStrategyHash != ethers.constants.HashZero) {
      console.log("StrategyOperator setting HashZero as best strategy for USDC...");
      console.log("\n");
      await strategyProviderInstance
        .connect(signerStrategyOperator)
        .setBestStrategy(opUSDCgrowRiskProfileCode, oldUSDCTokensHash, ethers.constants.HashZero);
      console.log(
        "usdcBestStrategyHash ",
        await strategyProviderInstance.rpToTokenToBestStrategy(opUSDCgrowRiskProfileCode, oldUSDCTokensHash),
      );
      console.log("\n");
    } else {
      console.log("best strategy for USDC is already HashZero...");
      console.log("\n");
    }
    if (wethBestStrategyHash != ethers.constants.HashZero) {
      console.log("StrategyOperator setting HashZero as best strategy for WETH...");
      console.log("\n");
      await strategyProviderInstance
        .connect(signerStrategyOperator)
        .setBestStrategy(opWETHgrowRiskProfileCode, oldWETHTokensHash, ethers.constants.HashZero);
      console.log(
        "wethBestStrategyHash ",
        await strategyProviderInstance.rpToTokenToBestStrategy(opWETHgrowRiskProfileCode, oldWETHTokensHash),
      );
      console.log("\n");
    } else {
      console.log("best strategy for WETH is already HashZero...");
      console.log("\n");
    }

    console.log("StrategyProvider.setBestDefaultStrategy");
    console.log("\n");
    if (usdcDefaultStrategyHash != ethers.constants.HashZero) {
      console.log("StrategyOperator setting HashZero as best default strategy for USDC...");
      console.log("\n");
      await strategyProviderInstance
        .connect(signerStrategyOperator)
        .setBestDefaultStrategy(opUSDCgrowRiskProfileCode, oldUSDCTokensHash, ethers.constants.HashZero);
      console.log(
        "usdcDefaultStrategyHash ",
        await strategyProviderInstance.rpToTokenToDefaultStrategy(opUSDCgrowRiskProfileCode, oldUSDCTokensHash),
      );
      console.log("\n");
    } else {
      console.log("default strategy for USDC is already HashZero...");
      console.log("\n");
    }
    if (wethDefaultStrategyHash != ethers.constants.HashZero) {
      console.log("StrategyOperator setting HashZero as best default strategy for WETH...");
      console.log("\n");
      await strategyProviderInstance
        .connect(signerStrategyOperator)
        .setBestDefaultStrategy(opWETHgrowRiskProfileCode, oldWETHTokensHash, ethers.constants.HashZero);
      console.log(
        "wethDefaultStrategyHash ",
        await strategyProviderInstance.rpToTokenToDefaultStrategy(opWETHgrowRiskProfileCode, oldWETHTokensHash),
      );
      console.log("\n");
    } else {
      console.log("default strategy for WETH is already HashZero...");
      console.log("\n");
    }
    console.log("Checking strategy hash on next rebalance from RiskManager..");
    console.log("\n");
    const riskManageProxyAddress = "0x4379031f3191d89693bc8b6dac4d3d06466ea952";
    const riskManagerInstance = await ethers.getContractAt(oldAbis.oldRiskManager, riskManageProxyAddress);
    console.log(
      "opWETHgrow next strategy ",
      await riskManagerInstance.getBestStrategy(opWETHgrowRiskProfileCode, [
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      ]),
    );
    console.log("\n");
    console.log(
      "opUSDCgrow next strategy ",
      await riskManagerInstance.getBestStrategy(opUSDCgrowRiskProfileCode, [
        "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      ]),
    );
    console.log("\n");
  } else {
    console.log("Network is not mainnet, hence skipping setting zero strategy");
    console.log("\n");
  }
};
export default func;
func.tags = ["MainnetSetZeroStrategy"];
