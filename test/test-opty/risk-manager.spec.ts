import { expect, assert } from "chai";
import hre from "hardhat";
import { CONTRACTS, STRATEGY_DATA } from "../../helpers/type";
import { generateStrategyHash, deployContract, executeFunc } from "../../helpers/helpers";
import { getSoliditySHA3Hash } from "../../helpers/utils";
import { TESTING_DEPLOYMENT_ONCE, ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { deployRegistry } from "../../helpers/contracts-deployments";
import scenario from "./scenarios/risk-manager.json";

type ARGUMENTS = {
  riskProfile?: string;
  noOfSteps?: number;
  poolRatingRange?: number[];
  strategy?: STRATEGY_DATA[];
  token?: string;
  tokens?: string[];
  score?: number;
};

describe(scenario.title, () => {
  let contracts: CONTRACTS = {};
  beforeEach(async () => {
    try {
      const [owner] = await hre.ethers.getSigners();
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

      let riskManager = await deployContract(hre, ESSENTIAL_CONTRACTS.RISK_MANAGER, TESTING_DEPLOYMENT_ONCE, owner, [
        registry.address,
      ]);

      const riskManagerProxy = await deployContract(
        hre,
        ESSENTIAL_CONTRACTS.RISK_MANAGER_PROXY,
        TESTING_DEPLOYMENT_ONCE,
        owner,
        [registry.address],
      );

      await executeFunc(riskManagerProxy, owner, "setPendingImplementation(address)", [riskManager.address]);
      await executeFunc(riskManager, owner, "become(address)", [riskManagerProxy.address]);

      riskManager = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER, riskManagerProxy.address, owner);

      contracts = { registry, vaultStepInvestStrategyDefinitionRegistry, strategyProvider, riskManager };
    } catch (error) {
      console.log(error);
    }
  });

  for (let i = 0; i < scenario.stories.length; i++) {
    const story = scenario.stories[i];
    it(`${story.description}`, async () => {
      for (let i = 0; i < story.setActions.length; i++) {
        const action = story.setActions[i];
        switch (action.action) {
          case "addRiskProfile(string,uint8,(uint8,uint8))": {
            const { riskProfile, noOfSteps, poolRatingRange }: ARGUMENTS = action.args;
            if (riskProfile && noOfSteps && poolRatingRange) {
              if (action.expect === "success") {
                await contracts[action.contract][action.action](riskProfile, noOfSteps, poolRatingRange);
              } else {
                await expect(
                  contracts[action.contract][action.action](riskProfile, noOfSteps, poolRatingRange),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(riskProfile, `args is wrong in ${action.action} testcase`);
            assert.isDefined(noOfSteps, `args is wrong in ${action.action} testcase`);
            assert.isDefined(poolRatingRange, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "approveToken(address)":
          case "approveLiquidityPool(address)": {
            const { token }: ARGUMENTS = action.args;
            if (token) {
              if (action.expect === "success") {
                await contracts[action.contract][action.action](token);
              } else {
                await expect(contracts[action.contract][action.action](token)).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(token, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "rateLiquidityPool(address,uint8)": {
            const { token, score }: ARGUMENTS = action.args;
            if (token && score) {
              if (action.expect === "success") {
                await contracts[action.contract][action.action](token, score);
              } else {
                await expect(contracts[action.contract][action.action](token, score)).to.be.revertedWith(
                  action.message,
                );
              }
            }
            assert.isDefined(token, `args is wrong in ${action.action} testcase`);
            assert.isDefined(score, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setTokensHashToTokens(address[])": {
            const { tokens }: ARGUMENTS = action.args;
            if (tokens) {
              if (action.expect === "success") {
                await contracts[action.contract][action.action](tokens);
              } else {
                await expect(contracts[action.contract][action.action](tokens)).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(tokens, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setStrategy(bytes32,(address,address,bool)[])": {
            const { strategy, token }: ARGUMENTS = action.args;

            if (strategy && token) {
              const strategySteps: [string, string, boolean][] = [];
              for (let index = 0; index < strategy.length; index++) {
                const tempArr: [string, string, boolean] = [
                  strategy[index].contract,
                  strategy[index].outputToken,
                  strategy[index].isBorrow,
                ];
                strategySteps.push(tempArr);
              }

              const tokenHash = getSoliditySHA3Hash(["address[]"], [[token]]);

              if (action.expect === "success") {
                await contracts[action.contract][action.action](tokenHash, strategySteps);
              } else {
                await expect(contracts[action.contract][action.action](tokenHash, strategySteps)).to.be.revertedWith(
                  action.message,
                );
              }
            }

            assert.isDefined(strategy, `args is wrong in ${action.action} testcase`);
            assert.isDefined(token, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setBestStrategy(string,bytes32,bytes32)":
          case "setBestDefaultStrategy(string,bytes32,bytes32)": {
            const { strategy, token, riskProfile }: ARGUMENTS = action.args;

            if (strategy && token && riskProfile) {
              const strategyHash = generateStrategyHash(strategy, token);
              const tokenHash = getSoliditySHA3Hash(["address[]"], [[token]]);

              if (action.expect === "success") {
                await contracts[action.contract][action.action](riskProfile, tokenHash, strategyHash);
              } else {
                await expect(
                  contracts[action.contract][action.action](riskProfile, tokenHash, strategyHash),
                ).to.be.revertedWith(action.message);
              }
            }

            assert.isDefined(strategy, `args is wrong in ${action.action} testcase`);
            assert.isDefined(token, `args is wrong in ${action.action} testcase`);
            assert.isDefined(riskProfile, `args is wrong in ${action.action} testcase`);
            break;
          }
        }
      }
      for (let i = 0; i < story.getActions.length; i++) {
        const action = story.getActions[i];
        switch (action.action) {
          case "getBestStrategy(string,address[])": {
            const { riskProfile, tokens }: ARGUMENTS = action.args;
            if (riskProfile && tokens) {
              const value = await contracts[action.contract][action.action](riskProfile, tokens);
              expect(value).to.be.equal(action.expectedValue);
            }
            assert.isDefined(riskProfile, `args is wrong in ${action.action} testcase`);
            assert.isDefined(tokens, `args is wrong in ${action.action} testcase`);
          }
        }
      }
    });
  }
});
