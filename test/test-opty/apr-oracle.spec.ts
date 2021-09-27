import { expect, assert } from "chai";
import hre from "hardhat";
import { Signer } from "ethers";
import { CONTRACTS } from "../../helpers/type";
import { TypedTokens, TypedDefiPools } from "../../helpers/data";
import {
  generateStrategyHash,
  deployContract,
  executeFunc,
  generateTokenHash,
  generateStrategyStep,
} from "../../helpers/helpers";
import { getSoliditySHA3Hash } from "../../helpers/utils";
import { TESTING_DEPLOYMENT_ONCE, ESSENTIAL_CONTRACTS, ZERO_BYTES32 } from "../../helpers/constants";
import { deployRegistry, deployRiskManager } from "../../helpers/contracts-deployments";
import { approveAndSetTokenHashToTokens } from "../../helpers/contracts-actions";
import scenario from "./scenarios/apr-oracle.json";

type ARGUMENTS = {
  riskProfile?: string;
  canBorrow?: boolean;
  poolRatingRange?: number[];
  adapterName?: string;
  token?: string;
  tokens?: string[];
  score?: number;
  defaultStrategyState?: number;
  liquidityPools?: {
    adapterName: string;
    token: string;
  }[];
};

describe(scenario.title, async () => {
  let contracts: CONTRACTS = {};
  let users: { [key: string]: Signer };
  before(async () => {
    try {
      const [owner, user1] = await hre.ethers.getSigners();
      users = { owner, user1 };
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

      await registry["addRiskProfile(string,bool,(uint8,uint8))"]("RP1", false, [0, 10]);

      await approveAndSetTokenHashToTokens(
        owner,
        registry,
        scenario.usedTokens.map(tokenName => TypedTokens[tokenName.toUpperCase()]),
        true,
      );

      contracts = { registry, vaultStepInvestStrategyDefinitionRegistry, strategyProvider, riskManager, aprOracle };
    } catch (error) {
      console.log(error);
    }
  });

  for (let i = 0; i < scenario.stories.length; i++) {
    const story = scenario.stories[i];
    it(`${story.description}`, async () => {
      if (i === 1) {
        // scenario no.0 doesn't require to set Strategies
        for (let i = 0; i < scenario.usedStrategies.length; i++) {
          const strategyInfo = scenario.usedStrategies[i];
          const strategy = {
            contract: TypedDefiPools[strategyInfo.adapterName][strategyInfo.token.toLowerCase()].lpToken,
            outputToken: TypedDefiPools[strategyInfo.adapterName][strategyInfo.token.toLowerCase()].lpToken,
            isBorrow: false,
          };
          await contracts["vaultStepInvestStrategyDefinitionRegistry"]["setStrategy(bytes32,(address,address,bool)[])"](
            generateTokenHash([TypedTokens[strategyInfo.token.toUpperCase()]]),
            generateStrategyStep([strategy]),
          );
        }
      }
      for (let i = 0; i < story.setActions.length; i++) {
        const action = story.setActions[i];
        switch (action.action) {
          case "updateRPPoolRatings(string,(uint8,uint8))": {
            const { riskProfile, poolRatingRange }: ARGUMENTS = action.args;
            if (riskProfile && poolRatingRange) {
              if (action.expect === "success") {
                await contracts[action.contract][action.action](riskProfile, poolRatingRange);
              } else {
                await expect(
                  contracts[action.contract][action.action](riskProfile, poolRatingRange),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(riskProfile, `args is wrong in ${action.action} testcase`);
            assert.isDefined(poolRatingRange, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "approveLiquidityPool(address)": {
            const { token, adapterName }: ARGUMENTS = action.args;
            if (token && adapterName) {
              if (TypedDefiPools[adapterName][token.toLowerCase()].lpToken) {
                if (action.expect === "success") {
                  await contracts[action.contract][action.action](
                    TypedDefiPools[adapterName][token.toLowerCase()].lpToken,
                  );
                } else {
                  await expect(
                    contracts[action.contract][action.action](TypedDefiPools[adapterName][token.toLowerCase()].lpToken),
                  ).to.be.revertedWith(action.message);
                }
              }
              assert.isDefined(
                TypedDefiPools[adapterName][token.toLowerCase()].lpToken,
                `args is wrong in ${action.action} testcase`,
              );
            }
            assert.isDefined(token, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "rateLiquidityPool(address,uint8)": {
            const { token, score, adapterName }: ARGUMENTS = action.args;
            if (token && adapterName && score) {
              if (TypedDefiPools[adapterName][token.toLowerCase()].lpToken) {
                if (action.expect === "success") {
                  await contracts[action.contract][action.action](
                    TypedDefiPools[adapterName][token.toLowerCase()].lpToken,
                    score,
                  );
                } else {
                  await expect(
                    contracts[action.contract][action.action](
                      TypedDefiPools[adapterName][token.toLowerCase()].lpToken,
                      score,
                    ),
                  ).to.be.revertedWith(action.message);
                }
              }
            }
            assert.isDefined(token, `args is wrong in ${action.action} testcase`);
            assert.isDefined(score, `args is wrong in ${action.action} testcase`);
            assert.isDefined(adapterName, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setBestStrategy(string,bytes32,bytes32)":
          case "setBestDefaultStrategy(string,bytes32,bytes32)": {
            const { adapterName, token, riskProfile }: ARGUMENTS = action.args;
            if (adapterName && token && riskProfile) {
              if (TypedDefiPools[adapterName][token.toLowerCase()].lpToken && TypedTokens[token.toUpperCase()]) {
                const strategy = {
                  contract: TypedDefiPools[adapterName][token.toLowerCase()].lpToken,
                  outputToken: TypedDefiPools[adapterName][token.toLowerCase()].lpToken,
                  isBorrow: false,
                };
                const strategyHash = generateStrategyHash([strategy], TypedTokens[token.toUpperCase()]);
                const tokenHash = getSoliditySHA3Hash(["address[]"], [[TypedTokens[token.toUpperCase()]]]);

                if (action.expect === "success") {
                  await contracts[action.contract][action.action](riskProfile, tokenHash, strategyHash);
                } else {
                  await expect(
                    contracts[action.contract][action.action](riskProfile, tokenHash, strategyHash),
                  ).to.be.revertedWith(action.message);
                }
              }
              assert.isDefined(
                TypedDefiPools[adapterName][token.toLowerCase()].lpToken,
                `args is wrong in ${action.action} testcase`,
              );
              assert.isDefined(TypedTokens[token.toUpperCase()], `args is wrong in ${action.action} testcase`);
            }
            assert.isDefined(adapterName, `args is wrong in ${action.action} testcase`);
            assert.isDefined(token, `args is wrong in ${action.action} testcase`);
            assert.isDefined(riskProfile, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setDefaultStrategyState(uint8)": {
            const { defaultStrategyState }: ARGUMENTS = action.args;
            if (action.expect === "success") {
              await contracts[action.contract].connect(users[action.executor])[action.action](defaultStrategyState);
            } else {
              await expect(
                contracts[action.contract].connect(users[action.executor])[action.action](defaultStrategyState),
              ).to.be.revertedWith(action.message);
            }
            break;
          }
        }
      }
      for (let i = 0; i < story.getActions.length; i++) {
        const action = story.getActions[i];
        switch (action.action) {
          case "getBestStrategy(string,address[])": {
            const { riskProfile, token }: ARGUMENTS = action.args;
            if (riskProfile && token) {
              const value = await contracts[action.contract][action.action](riskProfile, [
                TypedTokens[token.toUpperCase()],
              ]);
              const tokenHash = generateTokenHash([TypedTokens[token.toUpperCase()]]);
              if (action.expectedValue) {
                if (action.expectedValue.adapterName && action.expectedValue.token) {
                  const strategy = {
                    contract:
                      TypedDefiPools[action.expectedValue.adapterName][action.expectedValue.token.toLowerCase()]
                        .lpToken,
                    outputToken:
                      TypedDefiPools[action.expectedValue.adapterName][action.expectedValue.token.toLowerCase()]
                        .lpToken,
                    isBorrow: false,
                  };
                  const strategyHash = generateStrategyHash(
                    [strategy],
                    TypedTokens[action.expectedValue.token.toUpperCase()],
                  );
                  expect(value).to.be.equal(strategyHash);
                } else {
                  const strategyHash = await contracts.aprOracle.getBestAPR(tokenHash);
                  expect(value).to.be.equal(strategyHash);
                }
              } else {
                expect(value).to.be.equal(ZERO_BYTES32);
              }
            }

            assert.isDefined(riskProfile, `args is wrong in ${action.action} testcase`);
            assert.isDefined(token, `args is wrong in ${action.action} testcase`);
            break;
          }
        }
      }
      for (let i = 0; i < story.cleanActions.length; i++) {
        const action = story.cleanActions[i];
        switch (action.action) {
          case "revokeLiquidityPool(address[])": {
            const { liquidityPools }: ARGUMENTS = action.args;
            if (liquidityPools) {
              await contracts[action.contract][action.action](
                liquidityPools.map(
                  poolInfor => TypedDefiPools[poolInfor.adapterName][poolInfor.token.toLowerCase()].lpToken,
                ),
              );
            }
            assert.isDefined(liquidityPools, `args is wrong in ${action.action} testcase`);
            break;
          }
        }
      }
    });
  }
});
