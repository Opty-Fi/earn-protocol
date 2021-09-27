import { task, types } from "hardhat/config";
import { isAddress, generateTokenHash } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS, RISK_PROFILES } from "../../helpers/constants";
import { SET_BEST_STRATEGY } from "../task-names";

task(SET_BEST_STRATEGY, "Set best strategy")
  .addParam("token", "the address of token", "", types.string)
  .addParam("riskprofile", "risk profile", "", types.string)
  .addParam("strategyhash", "the keccak256 hash of strategy", "", types.string)
  .addParam("strategyprovider", "the address of strategyProvider", "", types.string)
  .addParam("isdefault", "whether set best default strategy or not", false, types.boolean)
  .setAction(async ({ token, riskprofile, strategyhash, strategyprovider, isdefault }, hre) => {
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

    if (strategyhash === "") {
      throw new Error("strategyhash cannot be empty");
    }

    const strategyProvider = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER, strategyprovider);

    const tokensHash = generateTokenHash([token]);

    console.log(`Invest step strategy Hash : ${strategyhash}`);

    console.log(`Invest step strategy Hash : ${strategyhash}`);

    try {
      if (isdefault) {
        await strategyProvider.setBestDefaultStrategy(riskprofile.toUpperCase(), tokensHash, strategyhash);
        console.log(`Set best default strategy successfully`);
      } else {
        await strategyProvider.setBestStrategy(riskprofile.toUpperCase(), tokensHash, strategyhash);
        console.log(`Set best strategy successfully`);
      }
    } catch (error: any) {
      console.log(`Got error : `, error.message);
    }
    console.log("Finished setting best strategy");
  });
