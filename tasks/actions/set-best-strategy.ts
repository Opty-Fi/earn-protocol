import { task, types } from "hardhat/config";
import { isAddress, generateTokenHash } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS, RISK_PROFILES } from "../../helpers/constants";
import { SET_BEST_STRATEGY } from "../task-names";

task(SET_BEST_STRATEGY, "Set best strategy")
  .addParam("token", "the address of token", "", types.string)
  .addParam("riskprofilecode", "the code of risk profile", 0, types.int)
  .addParam("strategyhash", "the keccak256 hash of strategy", "", types.string)
  .addParam("strategyprovider", "the address of strategyProvider", "", types.string)
  .addParam("isdefault", "whether set best default strategy or not", false, types.boolean)
  .setAction(async ({ token, riskprofilecode, strategyhash, strategyprovider, isdefault }, hre) => {
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

    if (RISK_PROFILES.filter(item => item.code === riskprofilecode).length === 0) {
      throw new Error("risk profile is not available");
    }

    if (strategyhash === "") {
      throw new Error("strategyhash cannot be empty");
    }

    try {
      const strategyProvider = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER, strategyprovider);
      const tokensHash = generateTokenHash([token]);
      console.log(`Invest step strategy Hash : ${strategyhash}`);
      if (isdefault) {
        await strategyProvider.setBestDefaultStrategy(riskprofilecode, tokensHash, strategyhash);
        console.log(`Set best default strategy successfully`);
      } else {
        await strategyProvider.setBestStrategy(riskprofilecode, tokensHash, strategyhash);
        console.log(`Set best strategy successfully`);
      }
      console.log("Finished setting best strategy");
    } catch (error: any) {
      console.error(`${SET_BEST_STRATEGY}: `, error);
    }
  });
