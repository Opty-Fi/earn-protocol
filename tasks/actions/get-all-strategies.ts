import { task, types } from "hardhat/config";
import { getSoliditySHA3Hash } from "../../helpers/utils";
import { getContractInstance, isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { GET_STRATEGIES } from "../task-names";

task(GET_STRATEGIES, "Get all available strategies for specific token")
  .addParam("token", "the address of token", "", types.string)
  .addParam("strategyregistry", "the address of vaultStepInvestStrategyDefinitionRegistry", "", types.string)
  .setAction(async ({ strategyregistry, token }, hre) => {
    if (strategyregistry === "") {
      throw new Error("strategyregistry cannot be empty");
    }

    if (!isAddress(strategyregistry)) {
      throw new Error("strategyregistry address is invalid");
    }

    if (token === "") {
      throw new Error("strategyregistry cannot be empty");
    }

    if (!isAddress(token)) {
      throw new Error("strategyregistry address is invalid");
    }

    const strategyRegistryContract = await getContractInstance(
      hre,
      ESSENTIAL_CONTRACTS.VAULT_STEP_INVEST_STRATEGY_DEFINITION_REGISTRY,
      strategyregistry,
    );
    const tokensHash = getSoliditySHA3Hash(["address[]"], [[token]]);
    const strategies = await strategyRegistryContract.getTokenToStrategies(tokensHash);
    for (let i = 0; i < strategies.length; i++) {
      const strategyDetail = await strategyRegistryContract.getStrategy(strategies[i]);
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
  });
