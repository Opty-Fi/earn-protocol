import { task, types } from "hardhat/config";
import { isAddress, generateStrategyHashV2 } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import TASKS from "../task-names";
import { ERC20 } from "../../typechain";
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

    const tokenInstance = <ERC20>await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, token);
    const tokenSymbol = await (await tokenInstance.symbol()).toUpperCase();
    const tokensHash = MULTI_CHAIN_VAULT_TOKENS[chainId][tokenSymbol].hash;
    console.log(
      "Strategy hash : ",
      generateStrategyHashV2(StrategiesByTokenByChain[chainId][tokenSymbol][strategyName].strategy, tokensHash),
    );
  });
