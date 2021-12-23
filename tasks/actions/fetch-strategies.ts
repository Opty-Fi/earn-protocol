import { task } from "hardhat/config";
import { ETH } from "../../helpers/constants/utils";
import { TypedTokens } from "../../helpers/data";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import TASKS from "../task-names";
import { createDir, createFile } from "../../helpers/utils";
import axios, { Method } from "axios";
import { DEFI_POOLS_DATA, STRATEGY, STRATEGY_DATA } from "../../helpers/type";
task(TASKS.ACTION_TASKS.FETCH_STRATEGIES.NAME, TASKS.ACTION_TASKS.FETCH_STRATEGIES.DESCRIPTION).setAction(
  async (_, hre) => {
    const BASE_DATA_OPTIONS = {
      _ApplicationId: process.env.MORALIS_APP_ID,
      _ClientVersion: "js0.0.120",
      _InstallationId: "a4e82bcc-1ef9-4379-a92f-59f2ecd557db",
    };
    createDir(`/.opty-sdk/ethereum`);

    const config = {
      method: "get" as Method,
      url: `${process.env.MORALIS_SERVER_URL}/functions/getStrategyDataTestEntries`,
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        chain: "0x1",
        ...BASE_DATA_OPTIONS,
      }),
    };
    console.log("Fetching strategies from Moralis...");
    const response = await axios(config);
    const data = response.data.result;
    console.log(data.length);

    let defiPools: DEFI_POOLS_DATA = {};
    const strategies: STRATEGY[] = [];
    console.log(`Creating defiPools and strategies files`);
    for (let i = 0; i < data.length; i++) {
      const token =
        Object.keys(data[i].underlyingTokens)[0] === ETH
          ? TypedTokens["WETH"]
          : Object.keys(data[i].underlyingTokens)[0];
      const erc20Symbol = (Object.values(data[i].underlyingTokens)[0] as any).symbol;
      const steps = data[i].steps;
      let strategyName = erc20Symbol;
      const strategyData: STRATEGY_DATA[] = [];
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const lpToken = step.lpToken === ETH ? TypedTokens["WETH"] : step.lpToken;
        const lpContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, lpToken);
        let lpTokenSymbol = lpToken;
        try {
          lpTokenSymbol = lpToken !== hre.ethers.constants.AddressZero ? await lpContract.symbol() : "0x0";
        } catch (error) {
          //Ignore in a case that symbol() fails
        }

        const adapter = `${step.protocol.name}Adapter`;
        if (Object.keys(defiPools).length === 0) {
          defiPools = {
            [adapter]: {
              [erc20Symbol]: {
                pool: step.poolContractAddress,
                lpToken: step.lpToken,
                tokens: step.underlyingTokens,
              },
            },
          };
        } else {
          if (!defiPools[adapter] || !defiPools[adapter][erc20Symbol]) {
            defiPools[adapter] = {
              ...defiPools[adapter],
              [erc20Symbol]: {
                pool: step.poolContractAddress,
                lpToken: step.lpToken,
                tokens: step.underlyingTokens,
              },
            };
          }
        }
        strategyName = `${strategyName}-DEPOSIT-${step.protocol.name}-${lpTokenSymbol}`;
        strategyData.push({
          contract: step.poolContractAddress,
          outputToken: step.lpToken,
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
    createFile(`.opty-sdk/ethereum/strategies.json`, JSON.stringify(strategies));
    createFile(`.opty-sdk/ethereum/defiPools.json`, JSON.stringify(defiPools));
    console.log(`DefiPools and strategies files are ready in .opty-sdk/ethereum/`);
  },
);
