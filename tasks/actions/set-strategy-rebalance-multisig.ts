import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import { task, types } from "hardhat/config";
import Safe from "@gnosis.pm/safe-core-sdk";
import { MetaTransactionData, EthAdapter } from "@gnosis.pm/safe-core-sdk-types";
import TASKS from "../task-names";
import {
  Registry,
  Registry__factory,
  StrategyProvider,
  StrategyProvider__factory,
  Vault,
  Vault__factory,
} from "../../typechain";
import { StrategiesByTokenByChain } from "../../helpers/data/adapter-with-strategies";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../helpers/constants/tokens";

task(
  TASKS.ACTION_TASKS.SET_BEST_STRATEGY_REBALANCE_MULTISIG.NAME,
  TASKS.ACTION_TASKS.SET_BEST_STRATEGY_REBALANCE_MULTISIG.DESCRIPTION,
)
  .addParam("tokenSymbol", "the token name as adapter-with-strategies", "", types.string)
  .addParam("strategyName", "the strategy name as adapter-with-strategies", "", types.string)
  .addParam("vaultSymbol", "vault symbol", "", types.string)
  .setAction(async ({ tokenSymbol, strategyName, vaultSymbol }, { ethers, deployments, getChainId }) => {
    const safeOwner = ethers.provider.getSigner(0);
    const strategyProviderAddress = (await deployments.get("StrategyProvider")).address;
    const vaultAddress = (
      await deployments.get(
        (vaultSymbol === "opUSDCearn" || vaultSymbol === "opWETHearn") && (await getChainId()) == "1"
          ? `${vaultSymbol}Proxy`
          : vaultSymbol,
      )
    ).address;
    const registryProxyAddress = (await deployments.get("RegistryProxy")).address;

    const registryInstance = <Registry>await ethers.getContractAt(Registry__factory.abi, registryProxyAddress);
    const safeAddress = await registryInstance.getStrategyOperator();

    console.log("safeAddress ", safeAddress);

    const ethAdapter = <EthAdapter>new EthersAdapter({
      ethers,
      signer: safeOwner,
    });
    const safeSdk: Safe = await Safe.create({ ethAdapter, safeAddress });
    const strategyProviderInstance = <StrategyProvider>(
      await ethers.getContractAt(StrategyProvider__factory.abi, strategyProviderAddress)
    );
    const vaultInstance = <Vault>await ethers.getContractAt(Vault__factory.abi, vaultAddress);

    const chainId = await getChainId();
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
      {
        to: vaultAddress,
        value: "0",
        data: vaultInstance.interface.encodeFunctionData("rebalance"),
      },
    ];
    const safeTransaction = await safeSdk.createTransaction(transactions);

    console.log("safeTransaction ", safeTransaction.data);
    const tx = await safeSdk.executeTransaction(safeTransaction);
    const txR = await tx.transactionResponse?.wait(1);
    console.log(txR);
  });
