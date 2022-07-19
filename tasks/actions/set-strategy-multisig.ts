import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import { task, types } from "hardhat/config";
import Safe from "@gnosis.pm/safe-core-sdk";
import { MetaTransactionData, EthAdapter } from "@gnosis.pm/safe-core-sdk-types";
import TASKS from "../task-names";
import { Registry, StrategyProvider } from "../../typechain";
import { StrategiesByTokenByChain } from "../../helpers/data/adapter-with-strategies";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../helpers/constants/tokens";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";

task(TASKS.ACTION_TASKS.SET_BEST_STRATEGY_MULTI_SIG.NAME, TASKS.ACTION_TASKS.SET_BEST_STRATEGY_MULTI_SIG.DESCRIPTION)
  .addParam("tokenSymbol", "the token name as adapter-with-strategies", "", types.string)
  .addParam("strategyName", "the strategy name as adapter-with-strategies", "", types.string)
  .setAction(async ({ tokenSymbol, strategyName }, { ethers, deployments, getChainId }) => {
    try {
      const safeOwner = ethers.provider.getSigner(0);
      const chainId = await getChainId();
      const strategyProviderAddress = (await deployments.get("StrategyProvider")).address;
      const registryProxyAddress = (await deployments.get("RegistryProxy")).address;

      const registryInstance = <Registry>await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
      const safeAddress = await registryInstance.getStrategyOperator();

      console.log("safeAddress ", safeAddress);

      const ethAdapter = <EthAdapter>new EthersAdapter({
        ethers,
        signer: safeOwner,
      });
      const safeSdk: Safe = await Safe.create({ ethAdapter, safeAddress });
      const strategyProviderInstance = <StrategyProvider>(
        await ethers.getContractAt(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER, strategyProviderAddress)
      );

      const strategyDetail = StrategiesByTokenByChain[chainId][tokenSymbol][strategyName];
      const strategySteps = strategyDetail.strategy.map(item => ({
        pool: item.contract,
        outputToken: item.outputToken,
        isBorrow: item.isBorrow,
      }));
      const transactions: MetaTransactionData[] = [
        {
          to: strategyProviderAddress,
          value: "0",
          data: strategyProviderInstance.interface.encodeFunctionData("setBestStrategy", [
            strategyDetail.riskProfileCode,
            MULTI_CHAIN_VAULT_TOKENS[chainId][tokenSymbol].hash,
            strategySteps,
          ]),
        },
      ];
      const safeTransaction = await safeSdk.createTransaction(transactions);

      console.log("safeTransaction ", safeTransaction.data);
      const tx = await safeSdk.executeTransaction(safeTransaction);
      const txR = await tx.transactionResponse?.wait(1);
      console.log(txR);
    } catch (error) {
      console.error(`${TASKS.ACTION_TASKS.SET_BEST_STRATEGY_MULTI_SIG.NAME}: `, error);
      throw error;
    }
  });
