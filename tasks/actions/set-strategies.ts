import { task, types } from "hardhat/config";
import { setStrategy } from "../../helpers/contracts-actions";
import { isAddress } from "../../helpers/helpers";
import { VAULT_TOKENS } from "../../helpers/constants/tokens";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
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
  .addParam("investstrategyregistry", "the address of investStrategyRegistry", "", types.string)
  .addParam("fromfile", "path to strategies json file", "", types.string)
  .setAction(async ({ investstrategyregistry, fromfile }, hre) => {
    const [owner] = await hre.ethers.getSigners();

    if (investstrategyregistry === "") {
      throw new Error("investstrategyregistry cannot be empty");
    }

    if (!isAddress(investstrategyregistry)) {
      throw new Error("investstrategyregistry address is invalid");
    }
    let strategies: STRATEGY[] = TypedStrategies;
    if (fromfile) {
      const content = fs.readFileSync(fromfile);
      strategies = JSON.parse(content.toString());
    }

    if (!strategies.length) {
      throw new Error("strategies file is in wrong format");
    }

    try {
      const investStrategyRegistryContract = await hre.ethers.getContractAt(
        ESSENTIAL_CONTRACTS.INVEST_STRATEGY_REGISTRY,
        investstrategyregistry,
      );
      console.log("Started setting strategies");
      for (let i = 0; i < strategies.length; i++) {
        try {
          const hash = await setStrategy(
            strategies[i].strategy,
            owner,
            [VAULT_TOKENS[strategies[i].token].address],
            investStrategyRegistryContract,
          );
          console.log("-----------------");
          console.log(`Invest step strategy Name : ${strategies[i].strategyName}`);
          console.log(`Invest step strategy Hash : ${hash}`);
          console.log("-----------------");
        } catch (error: any) {
          throw new Error(`${strategies[i].strategyName} : ${error.message}`);
        }
      }
      console.log("Finished setting strategies");
    } catch (error: any) {
      console.error(`${SET_STRATEGIES}: `, error);
      throw error;
    }
  });
