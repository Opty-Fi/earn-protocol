import { task, types } from "hardhat/config";
import { isAddress, generateTokenHash } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { GET_STRATEGIES } from "../task-names";

task(GET_STRATEGIES, "Get all available strategies for specific token")
  .addParam("token", "the address of token", "", types.string)
  .addParam("investstrategyregistry", "the address of investStrategyRegistry", "", types.string)
  .setAction(async ({ investstrategyregistry, token }, hre) => {
    if (investstrategyregistry === "") {
      throw new Error("investstrategyregistry cannot be empty");
    }

    if (!isAddress(investstrategyregistry)) {
      throw new Error("investstrategyregistry address is invalid");
    }

    if (token === "") {
      throw new Error("investstrategyregistry cannot be empty");
    }

    if (!isAddress(token)) {
      throw new Error("investstrategyregistry address is invalid");
    }

    try {
      const investStrategyRegistryContract = await hre.ethers.getContractAt(
        ESSENTIAL_CONTRACTS.INVEST_STRATEGY_REGISTRY,
        investstrategyregistry,
      );
      const tokensHash = generateTokenHash([token]);
      const strategies = await investStrategyRegistryContract.getTokenToStrategies(tokensHash);
      for (let i = 0; i < strategies.length; i++) {
        const strategyDetail = await investStrategyRegistryContract.getStrategy(strategies[i]);
        console.log(`StrategyHash: ${strategies[i]}`);
        for (let i = 0; i < strategyDetail[1].length; i++) {
          console.log(`Step: ${i + 1}`);
          console.log(`Pool: ${strategyDetail[1][i].pool}`);
          console.log(`OutputToken: ${strategyDetail[1][i].outputToken}`);
          console.log(`IsBorrow: ${strategyDetail[1][i].isBorrow}`);
        }
        console.log("-------");
      }
      console.log("Finished getting all strategies");
    } catch (error) {
      console.error(`${GET_STRATEGIES}: `, error);
      throw error;
    }
  });
