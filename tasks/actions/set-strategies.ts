import { task, types } from "hardhat/config";
import { setStrategy } from "../../helpers/contracts-actions";
import { getContractInstance, isAddress, generateTokenHash } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS, TOKENS } from "../../helpers/constants";
import { TypedStrategies } from "../../helpers/data";
import { STRATEGY } from "../../helpers/type";
import fs from "fs";
import { SET_STRATEGIES } from "../task-names";
/**
 * strategy.json structure
 * [
 *   {
      "strategyName": string,
      "token": string,
      "strategy": [ 
        {
          "contract": address,
          "outputTokenSymbol": string,
          "outputToken": address,
          "isBorrow": boolean
        }
      ]
      }
    ]
  Ex: 
    [  
      {
        "strategyName": "DAI-deposit-COMPOUND-cDAI",
        "token": "DAI",
        "strategy": [ 
          {
            "contract": "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
            "outputTokenSymbol": "cDAI",
            "outputToken": "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
            "isBorrow": false
          }
        ]
      }
    ]
 */
task(SET_STRATEGIES, "Set strategies")
  .addParam("strategyregistry", "the address of vaultStepInvestStrategyDefinitionRegistry", "", types.string)
  .addParam("fromfile", "path to strategies json file", "", types.string)
  .setAction(async ({ strategyregistry, fromfile }, hre) => {
    if (strategyregistry === "") {
      throw new Error("strategyregistry cannot be empty");
    }

    if (!isAddress(strategyregistry)) {
      throw new Error("strategyregistry address is invalid");
    }

    const strategyRegistryContract = await getContractInstance(
      hre,
      ESSENTIAL_CONTRACTS.VAULT_STEP_INVEST_STRATEGY_DEFINITION_REGISTRY,
      strategyregistry,
    );
    let strategies: STRATEGY[] = TypedStrategies;

    if (fromfile) {
      const content = fs.readFileSync(fromfile);
      strategies = JSON.parse(content.toString());
    }

    if (!strategies.length) {
      throw new Error("strategies file is in wrong format");
    }
    console.log("Started setting strategies");
    for (let i = 0; i < strategies.length; i++) {
      try {
        const tokensHash = generateTokenHash([TOKENS[strategies[i].token]]);
        const hash = await setStrategy(strategies[i].strategy, tokensHash, strategyRegistryContract);
        console.log("-----------------");
        console.log(`Invest step strategy Name : ${strategies[i].strategyName}`);
        console.log(`Invest step strategy Hash : ${hash}`);
        console.log("-----------------");
      } catch (error) {
        console.error(`Got error with ${strategies[i].strategyName} : `, error.message);
      }
    }
    console.log("Finished setting strategies");
  });
