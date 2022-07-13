import { task, types } from "hardhat/config";
import { generateStrategyHashV2 } from "../../helpers/helpers";
import TASKS from "../task-names";
import { Registry, Registry__factory, StrategyProvider, StrategyProvider__factory } from "../../typechain";
import { StrategiesByTokenByChain } from "../../helpers/data/adapter-with-strategies";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../helpers/constants/tokens";

task(TASKS.ACTION_TASKS.SET_BEST_STRATEGY.NAME, TASKS.ACTION_TASKS.SET_BEST_STRATEGY.DESCRIPTION)
  .addParam("tokensymbol", "the token name as adapter-with-strategies", "", types.string)
  .addParam("strategyname", "the strategy name as adapter-with-strategies", "", types.string)
  .addParam("isdefault", "set best default strategy", false, types.boolean)
  .setAction(async ({ tokensymbol, strategyname, isdefault }, { ethers, deployments, getChainId }) => {
    const chainId = await getChainId();
    try {
      const registryProxyAddress = (await deployments.get("RegistryProxy")).address;
      const registryInstance = <Registry>await ethers.getContractAt(Registry__factory.abi, registryProxyAddress);
      const strategyProviderAddress = await ethers.getContractAt(
        StrategyProvider__factory.abi,
        await registryInstance.getStrategyProvider(),
      );
      const strategyProviderInstance = <StrategyProvider>(
        await ethers.getContractAt(StrategyProvider__factory.abi, strategyProviderAddress.address)
      );
      const strategyOperatorAddress = await registryInstance.strategyOperator();
      const signer = await ethers.getSigner(strategyOperatorAddress);
      const tokensHash = MULTI_CHAIN_VAULT_TOKENS[chainId][tokensymbol].hash;
      const strategyHash =
        strategyname !== undefined && strategyname != ""
          ? generateStrategyHashV2(StrategiesByTokenByChain[chainId][tokensymbol][strategyname].strategy, tokensHash)
          : ethers.constants.HashZero;
      console.log(`Invest step strategy hash : ${strategyHash}`);
      if (isdefault) {
        const bestDefaultStrategy = await strategyProviderInstance.getRpToTokenToDefaultStrategy(
          StrategiesByTokenByChain[chainId][tokensymbol][strategyname].riskProfileCode as number,
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
            : ethers.constants.HashZero;
        console.log("bestDefaultStrategyHash ", bestDefaultStrategyHash);
        if (bestDefaultStrategyHash != strategyHash) {
          const tx1 = await strategyProviderInstance.connect(signer).setBestDefaultStrategy(
            StrategiesByTokenByChain[chainId][tokensymbol][strategyname].riskProfileCode as number,
            tokensHash,
            strategyname !== undefined && strategyname != ""
              ? StrategiesByTokenByChain[chainId][tokensymbol][strategyname].strategy.map(x => ({
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
          StrategiesByTokenByChain[chainId][tokensymbol][strategyname].riskProfileCode,
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
            : ethers.constants.HashZero;
        console.log("currentBestDefaultStrategy ", currentBestDefaultStrategy);
        console.log("currentBestDefaultStrategyHash ", currentBestDefaultStrategyHash);
      } else {
        const bestStrategy = await strategyProviderInstance.getRpToTokenToBestStrategy(
          StrategiesByTokenByChain[chainId][tokensymbol][strategyname].riskProfileCode,
          tokensHash,
        );
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
            : ethers.constants.HashZero;
        console.log("bestStrategyHash ", bestStrategyHash);
        if (bestStrategyHash != strategyHash) {
          const tx2 = await strategyProviderInstance.connect(signer).setBestStrategy(
            StrategiesByTokenByChain[chainId][tokensymbol][strategyname].riskProfileCode,
            tokensHash,
            strategyname !== undefined && strategyname != ""
              ? StrategiesByTokenByChain[chainId][tokensymbol][strategyname].strategy.map(x => ({
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
          StrategiesByTokenByChain[chainId][tokensymbol][strategyname].riskProfileCode,
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
            : ethers.constants.HashZero;
        console.log("currentBestStrategy ", currentBestStrategy);
        console.log("currentBestStrategyHash ", currentBestStrategyHash);
      }
      console.log("Finished setting best strategy");
    } catch (error: any) {
      console.error(`${TASKS.ACTION_TASKS.SET_BEST_STRATEGY.NAME}: `, error);
    }
  });
