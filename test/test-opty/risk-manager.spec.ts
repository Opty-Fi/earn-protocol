import { expect, assert } from "chai";
import hre from "hardhat";
import { Signer } from "ethers";
import { CONTRACTS } from "../../helpers/type";
import { TypedStrategies, TypedTokens } from "../../helpers/data";
import {
  generateStrategyHash,
  generateStrategyStep,
  generateTokenHash,
  deployContract,
  executeFunc,
} from "../../helpers/helpers";
import { TESTING_DEPLOYMENT_ONCE, ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { deployRegistry, deployRiskManager } from "../../helpers/contracts-deployments";
import { approveToken } from "../../helpers/contracts-actions";
import scenario from "./scenarios/risk-manager.json";

type ARGUMENTS = {
  canBorrow?: boolean;
  poolRatingRange?: number[];
  score?: number[];
  defaultStrategyState?: number;
};

describe(scenario.title, () => {
  let contracts: CONTRACTS = {};
  const riskProfile = "RP1";
  let owner: Signer;
  before(async () => {
    try {
      [owner] = await hre.ethers.getSigners();
      const registry = await deployRegistry(hre, owner, TESTING_DEPLOYMENT_ONCE);
      const vaultStepInvestStrategyDefinitionRegistry = await deployContract(
        hre,
        ESSENTIAL_CONTRACTS.VAULT_STEP_INVEST_STRATEGY_DEFINITION_REGISTRY,
        TESTING_DEPLOYMENT_ONCE,
        owner,
        [registry.address],
      );

      await executeFunc(registry, owner, "setVaultStepInvestStrategyDefinitionRegistry(address)", [
        vaultStepInvestStrategyDefinitionRegistry.address,
      ]);

      const strategyProvider = await deployContract(
        hre,
        ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER,
        TESTING_DEPLOYMENT_ONCE,
        owner,
        [registry.address],
      );

      await executeFunc(registry, owner, "setStrategyProvider(address)", [strategyProvider.address]);

      const aprOracle = await deployContract(hre, ESSENTIAL_CONTRACTS.APR_ORACLE, TESTING_DEPLOYMENT_ONCE, owner, [
        registry.address,
      ]);

      await executeFunc(registry, owner, "setAPROracle(address)", [aprOracle.address]);

      const riskManager = await deployRiskManager(hre, owner, TESTING_DEPLOYMENT_ONCE, registry.address);

      contracts = { registry, vaultStepInvestStrategyDefinitionRegistry, strategyProvider, riskManager };

      await registry["addRiskProfile(string,bool,(uint8,uint8))"](riskProfile, false, [0, 10]);

      const usedTokens = TypedStrategies.map(item => item.token).filter(
        (value, index, self) => self.indexOf(value) === index,
      );
      for (let i = 0; i < usedTokens.length; i++) {
        try {
          await approveToken(owner, contracts["registry"], [TypedTokens[usedTokens[i].toUpperCase()]]);
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
      console.log(error);
    }
  });

  for (let i = 0; i < TypedStrategies.length; i++) {
    const strategy = TypedStrategies[i];
    const tokenHash = generateTokenHash([TypedTokens[strategy.token.toUpperCase()]]);
    const strategyHash = generateStrategyHash(strategy.strategy, TypedTokens[strategy.token.toUpperCase()]);
    const defaultStrategy = TypedStrategies.filter(
      item => item.token === strategy.token && item.strategyName !== strategy.strategyName,
    )[0];
    if (!defaultStrategy) {
      continue;
    }
    const defaultStrategyHash = generateStrategyHash(
      defaultStrategy.strategy,
      TypedTokens[defaultStrategy.token.toUpperCase()],
    );
    let isCheckDefault = false;
    before(async () => {
      const setDefaultStrategy = (
        await contracts["vaultStepInvestStrategyDefinitionRegistry"].getStrategy(defaultStrategyHash)
      )._strategySteps[0];
      if (!setDefaultStrategy) {
        const defaultStrategySteps = generateStrategyStep(defaultStrategy.strategy);
        await contracts["vaultStepInvestStrategyDefinitionRegistry"]["setStrategy(bytes32,(address,address,bool)[])"](
          tokenHash,
          defaultStrategySteps,
        );
      }
      const setStrategy = (await contracts["vaultStepInvestStrategyDefinitionRegistry"].getStrategy(strategyHash))
        ._strategySteps[0];
      if (!setStrategy) {
        const strategySteps = generateStrategyStep(strategy.strategy);
        await contracts["vaultStepInvestStrategyDefinitionRegistry"]["setStrategy(bytes32,(address,address,bool)[])"](
          tokenHash,
          strategySteps,
        );
      }
    });
    describe(strategy.strategyName, () => {
      for (let i = 0; i < scenario.stories.length; i++) {
        const story = scenario.stories[i];
        const usedLps: string[] = [];
        it(`${story.description}`, async () => {
          for (let i = 0; i < story.setActions.length; i++) {
            const action = story.setActions[i];
            switch (action.action) {
              case "updateRPPoolRatings(string,(uint8,uint8))": {
                const { poolRatingRange }: ARGUMENTS = action.args;
                if (riskProfile && poolRatingRange) {
                  if (action.expect === "success") {
                    await contracts[action.contract][action.action](riskProfile, poolRatingRange);
                  } else {
                    await expect(
                      contracts[action.contract][action.action](riskProfile, poolRatingRange),
                    ).to.be.revertedWith(action.message);
                  }
                }
                assert.isDefined(poolRatingRange, `args is wrong in ${action.action} testcase`);
                break;
              }
              case "approveLiquidityPool(address[])": {
                const lpTokens = strategy.strategy.map(strategy => strategy.contract);

                if (action.expect === "success") {
                  await contracts[action.contract][action.action](lpTokens);
                } else {
                  await expect(contracts[action.contract][action.action](lpTokens)).to.be.revertedWith(action.message);
                }

                usedLps.push(...lpTokens);
                break;
              }
              case "rateLiquidityPool((address,uint8)[])": {
                const { score }: ARGUMENTS = action.args;
                if (score) {
                  const lpTokens = strategy.strategy.map(strategy => strategy.contract);
                  const pools = lpTokens.map((lp, i) => [lp, score[i]]);
                  if (action.expect === "success") {
                    await contracts[action.contract][action.action](pools);
                  } else {
                    await expect(contracts[action.contract][action.action](pools)).to.be.revertedWith(action.message);
                  }
                }
                assert.isDefined(score, `args is wrong in ${action.action} testcase`);
                break;
              }
              case "setBestStrategy(string,bytes32,bytes32)": {
                if (action.expect === "success") {
                  await contracts[action.contract][action.action](riskProfile, tokenHash, strategyHash);
                } else {
                  await expect(
                    contracts[action.contract][action.action](riskProfile, tokenHash, strategyHash),
                  ).to.be.revertedWith(action.message);
                }
                break;
              }
              case "setBestDefaultStrategy(string,bytes32,bytes32)": {
                const { score }: ARGUMENTS = action.args;
                const scoredPools: [string, number][] = [];
                if (score) {
                  for (let i = 0; i < defaultStrategy.strategy.length; i++) {
                    const strategy = defaultStrategy.strategy[i];
                    try {
                      await contracts["registry"]["approveLiquidityPool(address)"](strategy.contract);
                      usedLps.push(strategy.contract);
                    } catch (error) {
                      // Ignore an approved liquidity pool
                      expect(error.message).to.equal(
                        "VM Exception while processing transaction: revert !liquidityPools",
                      );
                    }
                    scoredPools.push([strategy.contract, score[i]]);
                  }
                  await contracts["registry"]["rateLiquidityPool((address,uint8)[])"](scoredPools);
                }
                if (action.expect === "success") {
                  await contracts[action.contract][action.action](riskProfile, tokenHash, defaultStrategyHash);
                } else {
                  await expect(
                    contracts[action.contract][action.action](riskProfile, tokenHash, defaultStrategyHash),
                  ).to.be.revertedWith(action.message);
                }
                isCheckDefault = true;
                assert.isDefined(score, `args is wrong in ${action.action} testcase`);
                break;
              }
              case "setDefaultStrategyState(uint8)": {
                const { defaultStrategyState }: ARGUMENTS = action.args;

                if (action.expect === "success") {
                  await contracts[action.contract][action.action](defaultStrategyState);
                } else {
                  await expect(contracts[action.contract][action.action](defaultStrategyState)).to.be.revertedWith(
                    action.message,
                  );
                }

                assert.isDefined(defaultStrategyState, `args is wrong in ${action.action} testcase`);
                break;
              }
            }
          }
          for (let i = 0; i < story.getActions.length; i++) {
            const action = story.getActions[i];
            switch (action.action) {
              case "getBestStrategy(string,address[])": {
                const value = await contracts[action.contract][action.action](riskProfile, [
                  TypedTokens[strategy.token],
                ]);
                expect(value).to.be.equal(
                  action.expectedValue !== ""
                    ? action.expectedValue
                    : isCheckDefault
                    ? defaultStrategyHash
                    : strategyHash,
                );
                break;
              }
            }
          }

          for (let i = 0; i < story.cleanActions.length; i++) {
            const action = story.cleanActions[i];
            switch (action.action) {
              case "revokeLiquidityPool(address[])": {
                if (usedLps.length > 0) {
                  await contracts[action.contract][action.action](usedLps);
                }
                break;
              }
            }
          }
        });
      }
    });
  }
});
