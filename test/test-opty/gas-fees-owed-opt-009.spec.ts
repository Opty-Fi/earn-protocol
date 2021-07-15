import { expect, assert } from "chai";
import hre from "hardhat";
import { Contract, Signer, BigNumber } from "ethers";
import { setUp } from "./setup";
import { CONTRACTS, STRATEGY_DATA } from "../../helpers/type";
import { TOKENS, TESTING_DEPLOYMENT_ONCE, REWARD_TOKENS, ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { TypedAdapterStrategies } from "../../helpers/data";
import { getSoliditySHA3Hash, delay } from "../../helpers/utils";
import { deployVault } from "../../helpers/contracts-deployments";
import {
  fundWalletToken,
  getBlockTimestamp,
  getTokenName,
  getTokenSymbol,
  unpauseVault,
} from "../../helpers/contracts-actions";
import scenario from "./scenarios/gas-fees-owed-opt-009.json";
import { generateStrategyHash, getContractInstance } from "../../helpers/helpers";

type ARGUMENTS = {
  contractName?: string;
  adapterName?: string;
  token?: string;
  tokens?: string[];
  liquidityPool?: string;
  strategy?: STRATEGY_DATA[];
  amount?: string;
  riskProfile?: string;
  noOfSteps?: number;
  poolRatingRange?: number[];
  score?: number;
};

type EXPECTED_ARGUMENTS = {
  balance?: string;
  vaultRewardStrategy?: number[];
};

describe(scenario.title, () => {
  // TODO: ADD TEST SCENARIOES, ADVANCED PROFILE, STRATEGIES.
  let essentialContracts: CONTRACTS;
  let adapters: CONTRACTS;
  const contracts: CONTRACTS = {};
  let admin: Signer;
  let operator: Signer;
  before(async () => {
    try {
      [operator, admin] = await hre.ethers.getSigners();
      [essentialContracts, adapters] = await setUp(operator);
      assert.isDefined(essentialContracts, "Essential contracts not deployed");
      assert.isDefined(adapters, "Adapters not deployed");
    } catch (error) {
      console.log(error);
    }
  });

  let Vault: Contract;
  let gasOwed = BigNumber.from("0");
  let gasOwedTotal = BigNumber.from("0");
  const adaptersName = Object.keys(TypedAdapterStrategies);
  const adapterName = adaptersName[0];
  const strategies = TypedAdapterStrategies[adapterName];
  for (let i = 0; i < strategies.length; i++) {
    const TOKEN_STRATEGY = strategies[i];
    let underlyingTokenName: string;
    let underlyingTokenSymbol: string;
    before(async () => {
      underlyingTokenName = await getTokenName(hre, TOKEN_STRATEGY.token);
      underlyingTokenSymbol = await getTokenSymbol(hre, TOKEN_STRATEGY.token);

      const Token_ERC20Instance = await getContractInstance(hre, "ERC20", TOKENS[TOKEN_STRATEGY.token]);

      contracts["erc20"] = Token_ERC20Instance;

      const CHIInstance = await getContractInstance(hre, "IChi", TOKENS["CHI"]);

      contracts["chi"] = CHIInstance;

      contracts["registry"] = essentialContracts.registry;

      contracts["vaultStepInvestStrategyDefinitionRegistry"] =
        essentialContracts.vaultStepInvestStrategyDefinitionRegistry;

      contracts["strategyProvider"] = essentialContracts.strategyProvider;
    });
    beforeEach(async () => {
      Vault = await deployVault(
        hre,
        essentialContracts.registry.address,
        TOKENS[TOKEN_STRATEGY.token],
        operator,
        admin,
        underlyingTokenName,
        underlyingTokenSymbol,
        "RP1",
        TESTING_DEPLOYMENT_ONCE,
      );
      await unpauseVault(operator, essentialContracts.registry, Vault.address, true);
      contracts["vault"] = Vault;
    });
    for (let i = 0; i < scenario.stories.length; i++) {
      const story = scenario.stories[i];
      it(`${story.description}`, async () => {
        for (let i = 0; i < story.setActions.length; i++) {
          const action = story.setActions[i];
          switch (action.action) {
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
            case "setLiquidityPoolToAdapter(address,address)": {
              const { liquidityPool, adapterName }: ARGUMENTS = action.args;
              if (liquidityPool && adapterName) {
                if (action.expect === "success") {
                  await contracts[action.contract][action.action](liquidityPool, adapters[adapterName].address);
                } else {
                  await expect(
                    contracts[action.contract][action.action](liquidityPool, adapters[adapterName].address),
                  ).to.be.revertedWith(action.message);
                }
              }
              assert.isDefined(liquidityPool, `args is wrong in ${action.action} testcase`);
              assert.isDefined(adapterName, `args is wrong in ${action.action} testcase`);
              break;
            }
            case "fundWallet": {
              const { amount }: ARGUMENTS = action.args;
              try {
                if (amount) {
                  const timestamp = (await getBlockTimestamp(hre)) * 2;
                  await fundWalletToken(hre, TOKENS[TOKEN_STRATEGY.token], operator, BigNumber.from(amount), timestamp);
                }
              } catch (error) {
                if (action.expect === "success") {
                  assert.isUndefined(error);
                } else {
                  expect(error.message).to.equal(`VM Exception while processing transaction: revert ${action.message}`);
                }
              }
              assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
              break;
            }
            case "approve(address,uint256)": {
              const { contractName }: ARGUMENTS = action.args;
              let { amount }: ARGUMENTS = action.args;
              try {
                if (contractName && amount) {
                  if (amount === "all") {
                    const userAddr = await operator.getAddress();
                    const value = await contracts[action.contract].balanceOf(userAddr);
                    amount = value.toString();
                  }
                  await contracts[action.contract]
                    .connect(operator)
                    [action.action](contracts[contractName].address, amount);
                }
              } catch (error) {
                if (action.expect === "success") {
                  assert.isUndefined(error);
                } else {
                  expect(error.message).to.equal(`VM Exception while processing transaction: revert ${action.message}`);
                }
              }
              assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
              assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
              break;
            }
            case "userDeposit(uint256)": {
              let { amount }: ARGUMENTS = action.args;
              if (action.action.includes("userWithdrawRebalance")) {
                await delay(200);
              }
              try {
                if (amount) {
                  if (amount === "all") {
                    if (action.action.includes("userWithdrawRebalance")) {
                      const userAddr = await operator.getAddress();
                      const value = await contracts[action.contract].balanceOf(userAddr);
                      amount = value.toString();
                    } else {
                      const userAddr = await operator.getAddress();
                      const value = await contracts["erc20"].allowance(userAddr, contracts[action.contract].address);
                      amount = value.toString();
                    }
                  }
                  await contracts[action.contract].connect(operator)[action.action](amount);
                }
              } catch (error) {
                if (action.expect === "success") {
                  assert.isUndefined(error);
                } else {
                  expect(error.message).to.equal(`VM Exception while processing transaction: revert ${action.message}`);
                }
              }
              assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
              break;
            }
            case "setBestStrategy(string,bytes32,bytes32)": {
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
            case "rebalance()": {
              try {
                await contracts[action.contract].connect(operator)[action.action]();
                gasOwed = await contracts[action.contract]["gasOwedToOperator()"]();
                gasOwedTotal = gasOwedTotal.add(gasOwed);
              } catch (error) {
                if (action.expect === "success") {
                  assert.isUndefined(error);
                } else {
                  expect(error.message).to.equal(`VM Exception while processing transaction: revert ${action.message}`);
                }
              }
              break;
            }
          }
        }
        for (let i = 0; i < story.getActions.length; i++) {
          const action = story.getActions[i];
          switch (action.action) {
            case "gasOwedToOperator()": {
              const value = await contracts[action.contract][action.action]();
              expect(gasOwedTotal.gt(value)).to.be.equal(true);
            }
          }
        }
      });
    }
  }
});
