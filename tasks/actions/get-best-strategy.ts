import { task, types } from "hardhat/config";
import { isAddress, generateTokenHashV2 } from "../../helpers/helpers";
import { RISK_PROFILES } from "../../helpers/constants/contracts-data";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import TASKS from "../task-names";
import { NETWORKS_CHAIN_ID_TO_HEX } from "../../helper-hardhat-config";
import { StrategyProvider } from "../../typechain";

task(TASKS.ACTION_TASKS.GET_BEST_STRATEGY.NAME, TASKS.ACTION_TASKS.GET_BEST_STRATEGY.DESCRIPTION)
  .addParam("token", "the address of token", "", types.string)
  .addParam("riskprofilecode", "the code of risk profile", 0, types.int)
  .addParam("isdefault", "get default strategy or not", false, types.boolean)
  .setAction(async ({ token, riskprofilecode, isdefault }, hre) => {
    const chainId = await hre.getChainId();

    if (token === "") {
      throw new Error("token cannot be empty");
    }

    if (!isAddress(token)) {
      throw new Error("token address is invalid");
    }

    if (RISK_PROFILES.filter(item => item.code === riskprofilecode).length === 0) {
      throw new Error("risk profile is not available");
    }

    try {
      const strategyProviderAddress = (await hre.deployments.get("StrategyProvider")).address;
      const strategyProvider = <StrategyProvider>(
        await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER, strategyProviderAddress)
      );
      const tokensHash = generateTokenHashV2([token], NETWORKS_CHAIN_ID_TO_HEX[chainId]);

      let strategyHash = [];
      if (isdefault) {
        strategyHash = await strategyProvider.getRpToTokenToDefaultStrategy(riskprofilecode, tokensHash);
      } else {
        strategyHash = await strategyProvider.getRpToTokenToBestStrategy(riskprofilecode, tokensHash);
      }
      console.log("StrategyHash :", strategyHash);
    } catch (error: any) {
      console.error(`${TASKS.ACTION_TASKS.GET_BEST_STRATEGY.NAME}: `, error);
      throw error;
    }
  });
