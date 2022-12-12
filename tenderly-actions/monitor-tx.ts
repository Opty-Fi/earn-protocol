import { ActionFn, Context, Event } from "@tenderly/actions";
import { ethers } from "ethers";
import axios from "axios";
import _ from "lodash";

export const monitorFn: ActionFn = async (context: Context, event: Event) => {
  const provider = new ethers.providers.JsonRpcProvider({ url: await context.secrets.get("MAINNET_NODE_URL") });

  const pendingTx = await context.storage.getJson("pendingTx");
  const resolvedTx = await context.storage.getJson("resolvedTx");
  if (!_.isEmpty(pendingTx)) {
    if (resolvedTx.hash !== pendingTx.hash) {
      const txReceipt = await provider.getTransactionReceipt(pendingTx.hash);
      if (txReceipt) {
        await context.storage.putJson("resolvedTx", { hash: pendingTx.hash });
        let postData;
        if (txReceipt.status === 1) {
          postData = JSON.stringify({
            text: "Rebalance transaction resolved",
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `Successful Rebalance tx : https://etherscan.io/tx/${pendingTx.hash}`,
                },
              },
            ],
          });
        } else {
          postData = JSON.stringify({
            text: "Rebalance transaction resolved",
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `${await context.secrets.get("DHRUVIN_SLACK_MEMBER_ID")} ${await context.secrets.get(
                    "FAISAL_SLACK_MEMBER_ID",
                  )} Failed Rebalance tx : https://etherscan.io/tx/${pendingTx.hash}`,
                },
              },
            ],
          });
        }
        await axios.post(await context.secrets.get("SLACK_WEBHOOK_URL"), postData, {
          headers: {
            "Content-Type": "application/json",
          },
        });
      }
    }
  }
};
