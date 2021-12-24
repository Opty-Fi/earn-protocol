import { task, types } from "hardhat/config";
import { ETH } from "../../helpers/constants/utils";
import { TypedTokens } from "../../helpers/data";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { NETWORKS } from "../../helpers/constants/network";
import TASKS from "../task-names";
import { createDir, createFile } from "../../helpers/utils";
import { getMoralisConfig } from "../../helpers/helpers";
import axios, { Method } from "axios";
import { STRATEGY, STRATEGY_DATA } from "../../helpers/type";
import { isAddress } from "../../helpers/helpers";

task(TASKS.ACTION_TASKS.FETCH_STRATEGIES.NAME, TASKS.ACTION_TASKS.FETCH_STRATEGIES.DESCRIPTION)
  .addParam("token", "the address of token", "", types.string)
  .addParam("chainid", "the id of chain", "0x1", types.string)
  .setAction(async ({ token, chainid }, hre) => {
    if (!isAddress(token)) {
      throw new Error("token address is invalid");
    }
    const tokenContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, token);
    const tokenSymbol = await tokenContract.symbol();
    const network = NETWORKS[chainid.toString()];
    if (!network) {
      throw new Error("chain id doesn't exist");
    }

    const dirPath = `.opty-sdk/${network.network}`;
    createDir(`/${dirPath}`);

    console.log("Fetching strategies from Moralis...");
    const response = await axios(
      getMoralisConfig("get" as Method, "getStrategiesForUnderlyingTokens", {
        chain: chainid,
        underlyingTokens: [token],
      }),
    );
    const data = response.data.result;
    const strategies: STRATEGY[] = [];
    console.log(`Creating strategies files`);

    for (let i = 0; i < data.length; i++) {
      const steps = data[i].strategySteps;
      let strategyName = tokenSymbol;
      const strategyData: STRATEGY_DATA[] = [];
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const lpToken = step.lpToken === ETH ? TypedTokens["WETH"] : step.outputToken;
        const lpContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, lpToken);
        let lpTokenSymbol = lpToken;
        try {
          lpTokenSymbol = lpToken !== hre.ethers.constants.AddressZero ? await lpContract.symbol() : "0x0";
        } catch (error) {
          //Ignore in a case that symbol() fails
        }
        strategyName = `${strategyName}-DEPOSIT-${step.protocol}-${lpTokenSymbol}`;
        strategyData.push({
          contract: step.pool,
          outputToken: step.outputToken,
          isBorrow: step.isBorrow,
          outputTokenSymbol: lpTokenSymbol,
        });
        strategies.push({
          strategyName: strategyName,
          token: token,
          strategy: strategyData,
        });
      }
    }
    createFile(`${dirPath}/${tokenSymbol}.json`, JSON.stringify(strategies));
    console.log(`Data is ready in ${dirPath}/${tokenSymbol}.json`);
  });
