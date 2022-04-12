import { task, types } from "hardhat/config";
import { isAddress, generateStrategyHashV2 } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import TASKS from "../task-names";
import { ERC20, Registry, StrategyProvider } from "../../typechain";
import { StrategiesByTokenByChain } from "../../helpers/data/adapter-with-strategies";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../helpers/constants/tokens";

task(TASKS.ACTION_TASKS.SET_BEST_STRATEGY.NAME, TASKS.ACTION_TASKS.SET_BEST_STRATEGY.DESCRIPTION)
  .addParam("token", "the address of token", "", types.string)
  .addParam("riskProfileCode", "the code of risk profile", 0, types.int)
  .addParam("strategyName", "name of the strategy", "", types.string)
  .addParam("strategyProvider", "address of the strategy provider", "", types.string)
  .addParam("isDefault", "set best default strategy", false, types.boolean)
  .setAction(async ({ token, riskProfileCode, strategyName, strategyProvider, isDefault }, hre) => {
    const chainId = await hre.getChainId();
    if (strategyProvider === "") {
      throw new Error("strategyProvider cannot be empty");
    }

    if (!isAddress(strategyProvider)) {
      throw new Error("strategyProvider address is invalid");
    }

    if (token === "") {
      throw new Error("token cannot be empty");
    }

    if (!isAddress(token)) {
      throw new Error("token address is invalid");
    }

    try {
      const strategyProviderInstance = <StrategyProvider>(
        await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER, strategyProvider)
      );
      const registryAddress = await strategyProviderInstance.registryContract();
      const registryInstance = <Registry>await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryAddress);
      const strategyOperatorAddress = await registryInstance.strategyOperator();
      const signer = await hre.ethers.getSigner(strategyOperatorAddress);
      const tokenInstance = <ERC20>await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, token);
      const tokenSymbol = await (await tokenInstance.symbol()).toUpperCase();
      const tokensHash = MULTI_CHAIN_VAULT_TOKENS[chainId][tokenSymbol].hash;
      const strategyHash =
        strategyName !== undefined && strategyName != ""
          ? generateStrategyHashV2(StrategiesByTokenByChain[chainId][tokenSymbol][strategyName].strategy, tokensHash)
          : hre.ethers.constants.HashZero;
      console.log(`Invest step strategy hash : ${strategyHash}`);
      if (isDefault) {
        const bestDefaultStrategy = await strategyProviderInstance.getRpToTokenToDefaultStrategy(
          riskProfileCode,
          tokensHash,
        );
        const bestDefaultStrategyHash =
          bestDefaultStrategy.length > 0
            ? generateStrategyHashV2(
                bestDefaultStrategy.map(x => ({
                  contract: x.pool,
                  outputToken: x.outputToken,
                  isBorrow: x.isBorrow,
                })),
                tokensHash,
              )
            : hre.ethers.constants.HashZero;
        console.log("bestDefaultStrategyHash ", bestDefaultStrategyHash);
        if (bestDefaultStrategyHash != strategyHash) {
          const tx1 = await strategyProviderInstance.connect(signer).setBestDefaultStrategy(
            riskProfileCode,
            tokensHash,
            strategyName !== undefined && strategyName != ""
              ? StrategiesByTokenByChain[chainId][tokenSymbol][strategyName].strategy.map(x => ({
                  pool: x.contract,
                  outputToken: x.outputToken,
                  isBorrow: x.isBorrow,
                }))
              : [],
          );
          await tx1.wait(1);
          console.log(`Set best default strategy successfully`);
        } else {
          console.log(`Best default strategy is upto date`);
        }
        const currentBestDefaultStrategy = await strategyProviderInstance.getRpToTokenToDefaultStrategy(
          riskProfileCode,
          tokensHash,
        );
        const currentBestDefaultStrategyHash =
          currentBestDefaultStrategy.length > 0
            ? generateStrategyHashV2(
                currentBestDefaultStrategy.map(x => ({
                  contract: x.pool,
                  outputToken: x.outputToken,
                  isBorrow: x.isBorrow,
                })),
                tokensHash,
              )
            : hre.ethers.constants.HashZero;
        console.log("currentBestDefaultStrategy ", currentBestDefaultStrategy);
        console.log("currentBestDefaultStrategyHash ", currentBestDefaultStrategyHash);
      } else {
        const bestStrategy = await strategyProviderInstance.getRpToTokenToBestStrategy(riskProfileCode, tokensHash);
        console.log("bestStrategy ", bestStrategy);
        const bestStrategyHash =
          bestStrategy.length > 0
            ? generateStrategyHashV2(
                bestStrategy.map(x => ({
                  contract: x.pool,
                  outputToken: x.outputToken,
                  isBorrow: x.isBorrow,
                })),
                tokensHash,
              )
            : hre.ethers.constants.HashZero;
        console.log("bestStrategyHash ", bestStrategyHash);
        if (bestStrategyHash != strategyHash) {
          const tx2 = await strategyProviderInstance.connect(signer).setBestStrategy(
            riskProfileCode,
            tokensHash,
            strategyName !== undefined && strategyName != ""
              ? StrategiesByTokenByChain[chainId][tokenSymbol][strategyName].strategy.map(x => ({
                  pool: x.contract,
                  outputToken: x.outputToken,
                  isBorrow: x.isBorrow,
                }))
              : [],
          );
          await tx2.wait(1);
          console.log(`Set best strategy successfully`);
        } else {
          console.log(`Best strategy is upto date`);
        }
        const currentBestStrategy = await strategyProviderInstance.getRpToTokenToBestStrategy(
          riskProfileCode,
          tokensHash,
        );
        const currentBestStrategyHash =
          currentBestStrategy.length > 0
            ? generateStrategyHashV2(
                currentBestStrategy.map(x => ({
                  contract: x.pool,
                  outputToken: x.outputToken,
                  isBorrow: x.isBorrow,
                })),
                tokensHash,
              )
            : hre.ethers.constants.HashZero;
        console.log("currentBestStrategy ", currentBestStrategy);
        console.log("currentBestStrategyHash ", currentBestStrategyHash);
      }
      console.log("Finished setting best strategy");
    } catch (error: any) {
      console.error(`${TASKS.ACTION_TASKS.SET_BEST_STRATEGY.NAME}: `, error);
    }
  });
