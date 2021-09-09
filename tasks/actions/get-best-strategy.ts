import { task, types } from "hardhat/config";
import { getSoliditySHA3Hash } from "../../helpers/utils";
import { getContractInstance, isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS, RISK_PROFILES } from "../../helpers/constants";
import { GET_BEST_STRATEGY } from "../task-names";

task(GET_BEST_STRATEGY, "Get best strategy")
  .addParam("token", "the address of token", "", types.string)
  .addParam("riskprofile", "risk profile", "", types.string)
  .addParam("strategyprovider", "the address of strategyProvider", "", types.string)
  .addParam("isdefault", "get default strategy or not", false, types.boolean)
  .setAction(async ({ token, riskprofile, strategyprovider, isdefault }, hre) => {
    if (strategyprovider === "") {
      throw new Error("strategyprovider cannot be empty");
    }

    if (!isAddress(strategyprovider)) {
      throw new Error("strategyprovider address is invalid");
    }

    if (token === "") {
      throw new Error("token cannot be empty");
    }

    if (!isAddress(token)) {
      throw new Error("token address is invalid");
    }

    if (riskprofile === "") {
      throw new Error("riskprofile cannot be empty");
    }

    if (!Object.keys(RISK_PROFILES).includes(riskprofile.toUpperCase())) {
      throw new Error("risk profile is not available");
    }

    const strategyProvider = await getContractInstance(hre, ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER, strategyprovider);

    const tokensHash = getSoliditySHA3Hash(["address[]"], [[token]]);

    try {
      let strategyHash = "";
      if (isdefault) {
        strategyHash = await strategyProvider.rpToTokenToDefaultStrategy(riskprofile.toUpperCase(), tokensHash);
      } else {
        strategyHash = await strategyProvider.rpToTokenToBestStrategy(riskprofile.toUpperCase(), tokensHash);
      }
      console.log(`StrategyHash : ${strategyHash}`);
    } catch (error) {
      console.log(`Got error : `, error.message);
    }
  });
