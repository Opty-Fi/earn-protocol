import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { GET_STRATEGY } from "../task-names";

task(GET_STRATEGY, "Get a specific strategy")
  .addParam("strategyhash", "the hash of strategy", "", types.string)
  .addParam("token", "the address of token", "", types.string)
  .addParam("investstrategyregistry", "the address of investStrategyRegistry", "", types.string)
  .setAction(async ({ investstrategyregistry, token, strategyhash }, hre) => {
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

    if (strategyhash === "") {
      throw new Error("strategyhash cannot be empty");
    }

    const investStrategyRegistryContract = await await hre.ethers.getContractAt(
      ESSENTIAL_CONTRACTS.INVEST_STRATEGY_REGISTRY,
      investstrategyregistry,
    );

    try {
      const strategyDetail = await investStrategyRegistryContract.getStrategy(strategyhash);
      console.log(`StrategyHash: ${strategyhash}`);
      for (let i = 0; i < strategyDetail[1].length; i++) {
        console.log(`Step: ${i + 1}`);
        console.log(`Pool: ${strategyDetail[1][i].pool}`);
        console.log(`OutputToken: ${strategyDetail[1][i].outputToken}`);
        console.log(`IsBorrow: ${strategyDetail[1][i].isBorrow}`);
      }
      console.log("Finished getting strategy");
    } catch (error) {
      console.error(`${GET_STRATEGY}: `, error);
      throw error;
    }
  });
