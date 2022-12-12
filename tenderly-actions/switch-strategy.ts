import { ActionFn, Context, Event } from "@tenderly/actions";
import axios from "axios";
import { BigNumber, ethers } from "ethers";
import _ from "lodash";
import VaultAbi from "./Vault.json";
import StrategyProviderAbi from "./StrategyProvider.json";
import GnosisSafeAbi from "./gnosis-safe.json";
import GnosisSafeMultiSendAbi from "./gnosis-safe-multi-send.json";

const opWETHInvst = "0x104D929F91227B8E4dA89CDee26e76d9c27bB347";
const opUSDCInvst = "0x114C81b0c846823F45B26e37A39F8E7DB866F324";
const OE_BASE_URL = "https://internal-dashboard.opty.fi/api";
const strategyProvider = "0x37c31298a5dee7e4cdb58b763f46a1c769287fdc";
const strategyOperatorMultisig = "0x9DD0E8A985315785473f7EB81bc4e28838e13D96";
const GNOSIS_SAFE_MULTI_SEND_ADDRESS = "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D";

export const rebalanceFn: ActionFn = async (context: Context, event: Event) => {
  const provider = new ethers.providers.JsonRpcProvider({ url: await context.secrets.get("MAINNET_NODE_URL") });
  const strategyOperatorWallet = new ethers.Wallet(await context.secrets.get("STRATEGY_OPERATOR_PK"), provider);

  const opWETHInvstInstance = new ethers.Contract(opWETHInvst, VaultAbi, strategyOperatorWallet);
  const opUSDCInvstInstance = new ethers.Contract(opUSDCInvst, VaultAbi, strategyOperatorWallet);
  const strategyProviderInstance = new ethers.Contract(strategyProvider, StrategyProviderAbi, strategyOperatorWallet);

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

  let transactions = [];

  if (opUSDCInvstStrategy !== opUSDCInvstInfo.data.best_strategy.strategy_hash) {
    transactions.push({
      to: strategyProviderInstance.address,
      value: "0",
      data: strategyProviderInstance.interface.encodeFunctionData("setBestStrategy", [
        "2",
        await opUSDCInvstInstance.underlyingTokensHash(),
        opUSDCInvstInfo.data.best_strategy.steps.map((x: any) => ({
          pool: x.pool_address,
          outputToken: x.output_token_address === null ? ethers.constants.AddressZero : x.output_token_address,
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
          outputToken: x.output_token_address === null ? ethers.constants.AddressZero : x.output_token_address,
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
      const pendingTx = await context.storage.getJson("pendingTx");
      const resolvedTx = await context.storage.getJson("resolvedTx");
      if (_.isEmpty(pendingTx) || pendingTx.hash === resolvedTx.hash) {
        let feeData = await provider.getFeeData();
        const encodeMultiSendData =
          "0x" +
          transactions
            .map(tx => {
              const data = ethers.utils.arrayify(tx.data);
              const encoded = ethers.utils.solidityPack(
                ["uint8", "address", "uint256", "uint256", "bytes"],
                [0, tx.to, tx.value, data.length, data],
              );
              return encoded.slice(2);
            })
            .join("");

        const strategyOperatorInstanceSingleton = new ethers.Contract(strategyOperatorMultisig, GnosisSafeAbi);
        const strategyOperatorInstanceMultisend = new ethers.Contract(
          GNOSIS_SAFE_MULTI_SEND_ADDRESS,
          GnosisSafeMultiSendAbi,
        );

        const data = strategyOperatorInstanceSingleton.interface.encodeFunctionData("execTransaction", [
          GNOSIS_SAFE_MULTI_SEND_ADDRESS,
          "0",
          strategyOperatorInstanceMultisend.interface.encodeFunctionData("multiSend", [encodeMultiSendData]),
          1,
          0,
          0,
          0,
          ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          "0x000000000000000000000000" +
            strategyOperatorWallet.address.slice(2) +
            "0000000000000000000000000000000000000000000000000000000000000000" +
            "01",
        ]);
        const estimateGas = await strategyOperatorWallet.estimateGas({
          to: strategyOperatorInstanceSingleton.address,
          value: "0",
          data,
        });
        const tx = await strategyOperatorWallet.sendTransaction({
          to: strategyOperatorInstanceSingleton.address,
          value: "0",
          data,
          gasLimit: estimateGas.mul("11000").div("10000"),
          maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]).toString(), // Recommended maxPriorityFeePerGas
          maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]).toString(),
        });
        const { hash } = tx;
        await context.storage.putJson("pendingTx", { hash });
        const postData = JSON.stringify({
          text: "Rebalance transaction pending",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `Rebalance transaction pending https://etherscan.io/tx/${hash}`,
              },
            },
          ],
        });
        await axios.post(await context.secrets.get("SLACK_WEBHOOK_URL"), postData, {
          headers: {
            "Content-Type": "application/json",
          },
        });
      }
    } catch (error: any) {
      await axios.post(
        await context.secrets.get("SLACK_WEBHOOK_URL"),
        JSON.stringify({
          text: `${await context.secrets.get("DHRUVIN_SLACK_MEMBER_ID")} ${await context.secrets.get(
            "FAISAL_SLACK_MEMBER_ID",
          )} The rebalance script errored ${error}`,
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
