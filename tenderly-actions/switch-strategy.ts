import { ActionFn, Context, Event } from "@tenderly/actions";
import axios from "axios";
import { BigNumber, ContractReceipt, ethers } from "ethers";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { MetaTransactionData, EthAdapter } from "@gnosis.pm/safe-core-sdk-types";
import VaultAbi from "./Vault.json";
import StrategyProviderAbi from "./StrategyProvider.json";

const opWETHInvst = "0x104D929F91227B8E4dA89CDee26e76d9c27bB347";
const opUSDCInvst = "0x114C81b0c846823F45B26e37A39F8E7DB866F324";
const OE_BASE_URL = "https://internal-dashboard.opty.fi/api";
const strategyProvider = "0x37c31298a5dee7e4cdb58b763f46a1c769287fdc";
const strategyOperatorMultisig = "0x9DD0E8A985315785473f7EB81bc4e28838e13D96";

export const rebalanceFn: ActionFn = async (context: Context, event: Event) => {
  const provider = ethers.getDefaultProvider(await context.secrets.get("MAINNET_NODE_URL"));
  const strategyOperatorWallet = new ethers.Wallet(await context.secrets.get("STRATEGY_OPERATOR_PK"), provider);

  const opWETHInvstInstance = new ethers.Contract(opWETHInvst, VaultAbi, strategyOperatorWallet);
  const opUSDCInvstInstance = new ethers.Contract(opUSDCInvst, VaultAbi, strategyOperatorWallet);
  const strategyProviderInstance = new ethers.Contract(strategyProvider, StrategyProviderAbi, strategyOperatorWallet);
  const ethAdapter = <EthAdapter>new EthersAdapter({
    ethers,
    signerOrProvider: strategyOperatorWallet,
  });
  const safeSdk: Safe = await Safe.create({ ethAdapter, safeAddress: strategyOperatorMultisig });

  const opWETHInvstInfo = await axios.get(`${OE_BASE_URL}/vault_info/${opWETHInvst}`, {
    headers: {
      Authorization: `Basic ${await context.secrets.get("BASIC_AUTH_TOKEN")}`,
    },
  });

  const opUSDCInvstInfo = await axios.get(`${OE_BASE_URL}/vault_info/${opUSDCInvst}`, {
    headers: {
      Authorization: `Basic ${await context.secrets.get("BASIC_AUTH_TOKEN")}`,
    },
  });

  const opUSDCInvstStrategy = await opUSDCInvstInstance.investStrategyHash();
  const opWETHInvstStrategy = await opWETHInvstInstance.investStrategyHash();

  let transactions: MetaTransactionData[] = [];

  if (opUSDCInvstStrategy !== opUSDCInvstInfo.data.best_strategy.strategy_hash) {
    transactions.push({
      to: strategyProviderInstance.address,
      value: "0",
      data: strategyProviderInstance.interface.encodeFunctionData("setBestStrategy", [
        "2",
        await opUSDCInvstInstance.underlyingTokensHash(),
        opUSDCInvstInfo.data.best_strategy.steps.map((x: any) => ({
          pool: x.pool_address,
          outputToken: x.output_token_address,
          isSwap: x.is_borrow,
        })),
      ]),
    });
    transactions.push({
      to: opUSDCInvstInstance.address,
      value: "0",
      data: opUSDCInvstInstance.interface.encodeFunctionData("rebalance"),
    });
  }

  if (opWETHInvstStrategy !== opWETHInvstInfo.data.best_strategy.strategy_hash) {
    transactions.push({
      to: strategyProviderInstance.address,
      value: "0",
      data: strategyProviderInstance.interface.encodeFunctionData("setBestStrategy", [
        "2",
        await opWETHInvstInstance.underlyingTokensHash(),
        opWETHInvstInfo.data.best_strategy.steps.map((x: any) => ({
          pool: x.pool_address,
          outputToken: x.output_token_address,
          isSwap: x.is_borrow,
        })),
      ]),
    });
    transactions.push({
      to: opWETHInvstInstance.address,
      value: "0",
      data: opWETHInvstInstance.interface.encodeFunctionData("rebalance"),
    });
  }

  if (transactions.length > 0) {
    try {
      const safeTransaction = await safeSdk.createTransaction(transactions);
      const estimatedGasLimit = await provider.estimateGas({
        to: strategyOperatorMultisig,
        data: safeTransaction.data.data,
        value: "0",
      });
      let feeData = await provider.getFeeData();
      const tx = await safeSdk.executeTransaction(safeTransaction, {
        gasLimit: estimatedGasLimit.mul("11000").div("10000").toString(), // 10% more gas limit than estimate
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]).toString(), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]).toString(),
      });
      const txR = <ContractReceipt>await tx.transactionResponse?.wait(1);
      let postData;
      if (txR.status === 1) {
        // success
        postData = JSON.stringify({
          text: `Successful rebalance https://etherscan.io/tx/${txR.transactionHash}`,
        });
      } else {
        // failed
        postData = JSON.stringify({
          text: `Failed rebalance https://etherscan.io/tx/${txR.transactionHash}`,
        });
      }
      await axios.post(await context.secrets.get("SLACK_WEBHOOK_URL"), postData, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error: any) {
      await axios.post(
        await context.secrets.get("SLACK_WEBHOOK_URL"),
        JSON.stringify({
          text: `${await context.secrets.get("DHRUVIN_SLACK_MEMBER_ID")} ${await context.secrets.get(
            "FAISAL_SLACK_MEMBER_ID",
          )} The rebalance errored`,
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }
  }
};
