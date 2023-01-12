import { task, types } from "hardhat/config";
import { isAddress, generateStrategyHashV2 } from "../../helpers/helpers";
import TASKS from "../task-names";
import { ERC20, ERC20__factory } from "../../typechain";
import { StrategiesByTokenByChain } from "../../helpers/data/adapter-with-strategies";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../helpers/constants/tokens";

task(TASKS.ACTION_TASKS.PRINT_STRATEGY_HASH.NAME, TASKS.ACTION_TASKS.PRINT_STRATEGY_HASH.DESCRIPTION)
  .addParam("token", "the address of token", "", types.string)
  .addParam("strategyName", "name of the strategy", "", types.string)
  .setAction(async ({ token, strategyName }, hre) => {
    const chainId = await hre.getChainId();

    if (token === "") {
      throw new Error("token cannot be empty");
    }

    if (!isAddress(token)) {
      throw new Error("token address is invalid");
    }

    const tokenInstance = <ERC20>await hre.ethers.getContractAt(ERC20__factory.abi, token);
    let tokenSymbol = (await tokenInstance.symbol()).toUpperCase();
    tokenSymbol = tokenSymbol === "3CRV" ? "USD3" : tokenSymbol;
    const tokensHash = MULTI_CHAIN_VAULT_TOKENS[chainId][tokenSymbol].hash;
    for (const riskProfile of Object.keys(StrategiesByTokenByChain[chainId])) {
      if (
        StrategiesByTokenByChain[chainId][riskProfile][tokenSymbol] &&
        StrategiesByTokenByChain[chainId][riskProfile][tokenSymbol][strategyName] &&
        StrategiesByTokenByChain[chainId][riskProfile][tokenSymbol][strategyName].strategy !== undefined
      ) {
        console.log(
          "Strategy hash : ",
          generateStrategyHashV2(
            StrategiesByTokenByChain[chainId][riskProfile][tokenSymbol][strategyName].strategy,
            tokensHash,
          ),
        );
        break;
      }
    }
  });
