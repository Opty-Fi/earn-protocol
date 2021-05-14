import { expect, assert } from "chai";
import hre from "hardhat";
import { Contract, Signer } from "ethers";
import { deployRegistry } from "../../helpers/contracts-deployments";
import { ESSENTIAL_CONTRACTS as ESSENTIAL_CONTRACTS_DATA, TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants";
import scenario from "./scenarios/vault-step-invest-strategy-definition-registry.json";
import { deployContract } from "../../helpers/helpers";
import { getSoliditySHA3Hash } from "../../helpers/utils";

describe(scenario.title, () => {
  let registryContract: Contract;
  let vaultStepInvestStrategyDefinitionRegistryContract: Contract;
  let owner: Signer;
  let caller: string;
  before(async () => {
    try {
      [owner] = await hre.ethers.getSigners();
      registryContract = await deployRegistry(hre, owner, TESTING_DEPLOYMENT_ONCE);
      vaultStepInvestStrategyDefinitionRegistryContract = await deployContract(
        hre,
        ESSENTIAL_CONTRACTS_DATA.VAULT_STEP_INVEST_STRATEGY_DEFINITION_REGISTRY,
        TESTING_DEPLOYMENT_ONCE,
        owner,
        [registryContract.address],
      );
      caller = await owner.getAddress();
      assert.isDefined(registryContract, "Registry contract not deployed");
      assert.isDefined(
        vaultStepInvestStrategyDefinitionRegistryContract,
        "vaultStepInvestStrategyDefinitionRegistry contract not deployed",
      );
    } catch (error) {
      console.log(error);
    }
  });

  for (let i = 0; i < scenario.stories.length; i++) {
    const story = scenario.stories[i];
    it(story.description, async () => {
      for (let i = 0; i < story.setActions.length; i++) {
        const action = story.setActions[i];
        switch (action.action) {
          case "setStrategy(bytes32,(address,address,bool)[])": {
            if (action.expect === "success") {
              const strategyStepHash: string[] = [];
              action.args.strategySteps.forEach((attribute, index) => {
                strategyStepHash[index] = getSoliditySHA3Hash(
                  ["address", "address", "bool"],
                  [attribute[0], attribute[1], attribute[2]],
                );
              });
              const expectedStrategyHash = getSoliditySHA3Hash(
                ["bytes32", "bytes32[]"],
                [action.args.tokensHash, strategyStepHash],
              );
              await expect(
                vaultStepInvestStrategyDefinitionRegistryContract[action.action](
                  action.args.tokensHash,
                  action.args.strategySteps,
                ),
              )
                .to.emit(vaultStepInvestStrategyDefinitionRegistryContract, "LogSetVaultInvestStrategy")
                .withArgs(action.args.tokensHash, expectedStrategyHash, caller);
            } else {
              await expect(
                vaultStepInvestStrategyDefinitionRegistryContract[action.action](
                  action.args.tokensHash,
                  action.args.strategySteps,
                ),
              ).to.be.revertedWith(action.message);
            }
            break;
          }
          default:
            break;
        }
      }

      for (let i = 0; i < story.getActions.length; i++) {
        const action = story.getActions[i];
        switch (action.action) {
          case "getStrategy(bytes32)": {
            const { _index, _strategySteps } = await vaultStepInvestStrategyDefinitionRegistryContract[action.action](
              action.args.strategyHash,
            );
            expect(_index).to.be.equal(action.expectedValue.index);
            expect(_strategySteps[0][0]).to.be.equal(action.expectedValue.strategySteps[0][0]);
            expect(_strategySteps[0][1]).to.be.equal(action.expectedValue.strategySteps[0][1]);
            expect(_strategySteps[0][2]).to.be.equal(action.expectedValue.strategySteps[0][2]);
            break;
          }
          default:
            break;
        }
      }
    });
  }
});
