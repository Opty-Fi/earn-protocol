import chai, { expect, assert } from "chai";
import { solidity } from "ethereum-waffle";
import hre from "hardhat";
import { Signer, Contract } from "ethers";
import { smock } from "@defi-wonderland/smock";
import { MOCK_CONTRACTS } from "../../helpers/type";
import { TypedStrategies, TypedTokens } from "../../helpers/data";
import {
  generateStrategyHash,
  generateStrategyStep,
  generateTokenHash,
  executeFunc,
  deploySmockContract,
  deployContract,
} from "../../helpers/helpers";
import { TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants/utils";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { TESTING_CONTRACTS } from "../../helpers/constants/test-contracts-name";
import { deployRegistry, deployRiskManager } from "../../helpers/contracts-deployments";
import { approveAndSetTokenHashToToken, addRiskProfile } from "../../helpers/contracts-actions";
import scenario from "./scenarios/risk-manager.json";
import { RISK_PROFILES } from "../../helpers/constants/contracts-data";

chai.use(solidity);

type ARGUMENTS = {
  canBorrow?: boolean;
  poolRatingRange?: number[];
  score?: number[];
  defaultStrategyState?: number;
};

describe(scenario.title, () => {
  let contracts: MOCK_CONTRACTS = {};
  let registry: Contract;
  let riskManager: Contract;
  const riskProfileCode = "1";
  let owner: Signer;
  before(async () => {
    [owner] = await hre.ethers.getSigners();
    registry = await deployRegistry(hre, owner, TESTING_DEPLOYMENT_ONCE);
    const investStrategyRegistry = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.INVEST_STRATEGY_REGISTRY, [
      registry.address,
    ]);

    const strategyProvider = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER, [
      registry.address,
    ]);

    const aprOracle = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.APR_ORACLE, [registry.address]);

    riskManager = await deployRiskManager(hre, owner, TESTING_DEPLOYMENT_ONCE, registry.address);

    contracts = { investStrategyRegistry, strategyProvider };
    await executeFunc(registry, owner, "setStrategyProvider(address)", [strategyProvider.address]);
    await executeFunc(registry, owner, "setAPROracle(address)", [aprOracle.address]);
    await executeFunc(registry, owner, "setInvestStrategyRegistry(address)", [investStrategyRegistry.address]);
    await addRiskProfile(
      registry,
      owner,
      RISK_PROFILES[1].code,
      RISK_PROFILES[1].name,
      RISK_PROFILES[1].symbol,
      RISK_PROFILES[1].canBorrow,
      RISK_PROFILES[1].poolRating,
    );

    const usedTokens = TypedStrategies.map(item => item.token).filter(
      (value, index, self) => self.indexOf(value) === index,
    );
    for (let i = 0; i < usedTokens.length; i++) {
      try {
        await approveAndSetTokenHashToToken(owner, registry, TypedTokens[usedTokens[i].toUpperCase()]);
      } catch (error) {
        continue;
      }
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
      const setDefaultStrategy = (await contracts["investStrategyRegistry"].getStrategy(defaultStrategyHash))
        ._strategySteps[0];
      if (!setDefaultStrategy) {
        const defaultStrategySteps = generateStrategyStep(defaultStrategy.strategy);
        await contracts["investStrategyRegistry"]["setStrategy(bytes32,(address,address,bool)[])"](
          tokenHash,
          defaultStrategySteps,
        );
      }
      const setStrategy = (await contracts["investStrategyRegistry"].getStrategy(strategyHash))._strategySteps[0];
      if (!setStrategy) {
        const strategySteps = generateStrategyStep(strategy.strategy);
        await contracts["investStrategyRegistry"]["setStrategy(bytes32,(address,address,bool)[])"](
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
              case "updateRPPoolRatings(uint256,(uint8,uint8))": {
                const { poolRatingRange }: ARGUMENTS = action.args;
                if (riskProfileCode && poolRatingRange) {
                  await registry[action.action](riskProfileCode, poolRatingRange);
                }
                assert.isDefined(poolRatingRange, `args is wrong in ${action.action} testcase`);
                break;
              }
              case "approveLiquidityPool(address[])": {
                const lpTokens = strategy.strategy.map(strategy => strategy.contract);
                if (action.expect === "success") {
                  await registry[action.action](lpTokens);
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
                    await registry[action.action](pools);
                  } else {
                    await expect(await contracts[action.contract][action.action](pools)).to.be.revertedWith(
                      action.message,
                    );
                  }
                }
                assert.isDefined(score, `args is wrong in ${action.action} testcase`);
                break;
              }
              case "setBestStrategy(uint256,bytes32,bytes32)": {
                contracts[action.contract].rpToTokenToBestStrategy.returns(strategyHash);
                break;
              }
              case "setBestDefaultStrategy(uint256,bytes32,bytes32)": {
                const { score }: ARGUMENTS = action.args;
                const scoredPools: [string, number][] = [];
                if (score) {
                  for (let i = 0; i < defaultStrategy.strategy.length; i++) {
                    const strategy = defaultStrategy.strategy[i];
                    if (!usedLps.includes(strategy.contract)) {
                      await registry["approveLiquidityPool(address)"](strategy.contract);
                      usedLps.push(strategy.contract);
                    }
                    scoredPools.push([strategy.contract, score[i]]);
                  }
                  await registry["rateLiquidityPool((address,uint8)[])"](scoredPools);
                }
                contracts[action.contract].rpToTokenToDefaultStrategy.returns(defaultStrategyHash);
                isCheckDefault = true;
                assert.isDefined(score, `args is wrong in ${action.action} testcase`);
                break;
              }
              case "setDefaultStrategyState(uint8)": {
                const { defaultStrategyState }: ARGUMENTS = action.args;
                await contracts[action.contract].getDefaultStrategyState.returns(defaultStrategyState);
                assert.isDefined(defaultStrategyState, `args is wrong in ${action.action} testcase`);
                break;
              }
            }
          }
          for (let i = 0; i < story.getActions.length; i++) {
            const action = story.getActions[i];
            switch (action.action) {
              case "getBestStrategy(uint256,address[])": {
                expect(await riskManager[action.action](riskProfileCode, [TypedTokens[strategy.token]])).to.be.equal(
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
                  await registry[action.action](usedLps);
                }
                break;
              }
            }
          }
        });
      }
    });
  }
  for (let i = 0; i < scenario.standaloneStories.length; i++) {
    const story = scenario.standaloneStories[i];
    it(story.description, async () => {
      for (let i = 0; i < story.setActions.length; i++) {
        const action = story.setActions[i];
        switch (action.action) {
          case "become(address)": {
            const newRiskManager = await deployContract(
              hre,
              TESTING_CONTRACTS.TEST_RISK_MANAGER_NEW_IMPLEMENTATION,
              TESTING_DEPLOYMENT_ONCE,
              owner,
              [registry.address],
            );

            const riskManagerProxy = await hre.ethers.getContractAt(
              ESSENTIAL_CONTRACTS.RISK_MANAGER_PROXY,
              riskManager.address,
            );

            await executeFunc(riskManagerProxy, owner, "setPendingImplementation(address)", [newRiskManager.address]);
            await executeFunc(newRiskManager, owner, "become(address)", [riskManagerProxy.address]);

            riskManager = await hre.ethers.getContractAt(
              TESTING_CONTRACTS.TEST_RISK_MANAGER_NEW_IMPLEMENTATION,
              riskManagerProxy.address,
            );
            break;
          }
        }
      }
      for (let i = 0; i < story.getActions.length; i++) {
        const action = story.getActions[i];
        switch (action.action) {
          case "isNewContract()": {
            expect(await riskManager[action.action]()).to.be.equal(action.expectedValue);
            break;
          }
        }
      }
      for (let i = 0; i < story.cleanActions.length; i++) {
        const action = story.cleanActions[i];
        switch (action.action) {
          case "deployRiskManager()": {
            riskManager = await deployRiskManager(hre, owner, TESTING_DEPLOYMENT_ONCE, registry.address);
            break;
          }
        }
      }
    });
  }
});
