import { expect, assert } from "chai";
import hre from "hardhat";
import { Contract, Signer, BigNumber } from "ethers";
import { setUp } from "./setup";
import { CONTRACTS } from "../../helpers/type";
import { TOKENS, TESTING_DEPLOYMENT_ONCE, REWARD_TOKENS } from "../../helpers/constants";
import { TypedAdapterStrategies } from "../../helpers/data";
import { delay } from "../../helpers/utils";
import { executeFunc } from "../../helpers/helpers";
import { deployVault } from "../../helpers/contracts-deployments";
import {
  setBestStrategy,
  approveLiquidityPoolAndMapAdapter,
  fundWalletToken,
  getBlockTimestamp,
  getTokenName,
  getTokenSymbol,
  unpauseVault,
} from "../../helpers/contracts-actions";
import scenario from "./scenarios/vault.json";

type ARGUMENTS = {
  contractName?: string;
  amount?: { [key: string]: string | undefined };
  hold?: number;
  convert?: number;
  vaultRewardStrategy?: number[];
  vaultRewardTokenInvalidHash?: string;
};

type EXPECTED_ARGUMENTS = {
  balance?: string;
  vaultRewardStrategy?: number[];
};

describe(scenario.title, () => {
  let essentialContracts: CONTRACTS;
  let adapters: CONTRACTS;
  const contracts: CONTRACTS = {};
  let users: Signer[];
  before(async () => {
    try {
      users = await hre.ethers.getSigners();
      [essentialContracts, adapters] = await setUp(users[0]);
      assert.isDefined(essentialContracts, "Essential contracts not deployed");
      assert.isDefined(adapters, "Adapters not deployed");
    } catch (error) {
      console.log(error);
    }
  });

  for (let i = 0; i < scenario.vaults.length; i++) {
    describe(`${scenario.vaults[i].profile}`, async () => {
      let Vault: Contract;
      const vault = scenario.vaults[i];
      const profile = vault.profile;
      const adaptersName = Object.keys(TypedAdapterStrategies);

      for (let i = 0; i < adaptersName.length; i++) {
        const adapterName = adaptersName[i];
        const strategies = TypedAdapterStrategies[adaptersName[i]];
        describe(`${adapterName}`, async () => {
          for (let i = 0; i < strategies.length; i++) {
            const TOKEN_STRATEGY = strategies[i];
            const rewardTokenAdapterNames = Object.keys(REWARD_TOKENS).map(rewardTokenAdapterName =>
              rewardTokenAdapterName.toLowerCase(),
            );
            let underlyingTokenName: string;
            let underlyingTokenSymbol: string;
            before(async () => {
              underlyingTokenName = await getTokenName(hre, TOKEN_STRATEGY.token);
              underlyingTokenSymbol = await getTokenSymbol(hre, TOKEN_STRATEGY.token);
              const adapter = adapters[adapterName];

              for (let i = 0; i < TOKEN_STRATEGY.strategy.length; i++) {
                await approveLiquidityPoolAndMapAdapter(
                  users[0],
                  essentialContracts.registry,
                  adapter.address,
                  TOKEN_STRATEGY.strategy[i].contract,
                );
              }

              await setBestStrategy(
                TOKEN_STRATEGY.strategy,
                TOKENS[TOKEN_STRATEGY.token],
                essentialContracts.vaultStepInvestStrategyDefinitionRegistry,
                essentialContracts.strategyProvider,
                profile,
                false,
              );

              if (rewardTokenAdapterNames.includes(adapterName.toLowerCase())) {
                await executeFunc(essentialContracts.registry, users[0], "approveToken(address)", [Vault.address]);
                await executeFunc(essentialContracts.registry, users[0], "setTokensHashToTokens(address[])", [
                  [Vault.address, REWARD_TOKENS[adapterName].tokenAddress.toString()],
                ]);
              }

              const Token_ERC20Instance = await hre.ethers.getContractAt("ERC20", TOKENS[TOKEN_STRATEGY.token]);

              const CHIInstance = await hre.ethers.getContractAt("IChi", TOKENS["CHI"]);
              Vault = await deployVault(
                hre,
                essentialContracts.registry.address,
                TOKENS[TOKEN_STRATEGY.token],
                users[0],
                users[1],
                underlyingTokenName,
                underlyingTokenSymbol,
                profile,
                TESTING_DEPLOYMENT_ONCE,
              );
              await unpauseVault(users[0], essentialContracts.registry, Vault.address, true);
              contracts["vault"] = Vault;
              contracts["chi"] = CHIInstance;
              contracts["erc20"] = Token_ERC20Instance;
            });
            for (let i = 0; i < vault.stories.length; i++) {
              const story = vault.stories[i];
              it(story.description, async () => {
                for (let i = 0; i < story.activities.length; i++) {
                  const activity = story.activities[i];
                  const userIndexes = activity.userIndexes;
                  for (let i = 0; i < userIndexes.length; i++) {
                    const userIndex = userIndexes[i];
                    for (let i = 0; i < activity.actions.length; i++) {
                      const action = activity.actions[i];
                      switch (action.action) {
                        case "fundWallet": {
                          const { amount }: ARGUMENTS = action.args;
                          if (amount) {
                            const timestamp = (await getBlockTimestamp(hre)) * 2;
                            await fundWalletToken(
                              hre,
                              TOKENS[TOKEN_STRATEGY.token],
                              users[userIndex],
                              BigNumber.from(amount[TOKEN_STRATEGY.token]),
                              timestamp,
                            );
                          }
                          assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
                          break;
                        }
                        case "approve(address,uint256)": {
                          const { contractName, amount }: ARGUMENTS = action.args;

                          if (contractName && amount) {
                            let investedAmount: string | undefined;
                            if (amount[TOKEN_STRATEGY.token] === "all") {
                              const userAddr = await users[userIndex].getAddress();
                              const value = await contracts[action.contract].balanceOf(userAddr);
                              investedAmount = value.toString();
                            } else {
                              investedAmount = amount[TOKEN_STRATEGY.token];
                            }
                            await contracts[action.contract]
                              .connect(users[userIndex])
                              [action.action](contracts[contractName].address, investedAmount);
                          }
                          assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
                          assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
                          break;
                        }
                        case "mint(uint256)": {
                          const { amount }: ARGUMENTS = action.args;

                          if (amount) {
                            await contracts[action.contract]
                              .connect(users[userIndex])
                              [action.action](amount[action.contract.toUpperCase()]);
                          }

                          assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
                          break;
                        }
                        case "userDepositRebalance(uint256)":
                        case "userWithdrawRebalance(uint256)":
                        case "userDepositRebalanceWithCHI(uint256)":
                        case "userWithdrawRebalanceWithCHI(uint256)":
                        case "userDeposit(uint256)": {
                          const { amount }: ARGUMENTS = action.args;
                          if (action.action.includes("userWithdrawRebalance")) {
                            await delay(200);
                          }

                          if (amount) {
                            let investedAmount: string | undefined;
                            if (amount[TOKEN_STRATEGY.token] === "all") {
                              if (action.action.includes("userWithdrawRebalance")) {
                                const userAddr = await users[userIndex].getAddress();
                                const value = await contracts[action.contract].balanceOf(userAddr);
                                investedAmount = value.toString();
                              } else {
                                const userAddr = await users[userIndex].getAddress();
                                const value = await contracts["erc20"].allowance(
                                  userAddr,
                                  contracts[action.contract].address,
                                );
                                investedAmount = value.toString();
                              }
                            } else {
                              investedAmount = amount[TOKEN_STRATEGY.token];
                            }
                            await contracts[action.contract].connect(users[userIndex])[action.action](investedAmount);
                          }
                          assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
                          break;
                        }
                        case "userDepositAll()":
                        case "userDepositAllWithCHI()":
                        case "userDepositAllRebalance()":
                        case "userWithdrawAllRebalance()":
                        case "userDepositAllRebalanceWithCHI()":
                        case "userWithdrawAllRebalanceWithCHI()":
                        case "rebalance()": {
                          await contracts[action.contract].connect(users[userIndex])[action.action]();
                          break;
                        }
                      }
                    }
                    for (let i = 0; i < activity.getActions.length; i++) {
                      const action = activity.getActions[i];
                      switch (action.action) {
                        case "balanceOf(address)": {
                          const address = await users[userIndex].getAddress();
                          const value = await contracts[action.contract]
                            .connect(users[userIndex])
                            [action.action](address);
                          if (action.expectedValue.toString().includes(">")) {
                            expect(+value).to.be.gt(+action.expectedValue.toString().split(">")[1]);
                          } else {
                            expect(+value).to.be.equal(+action.expectedValue);
                          }
                          break;
                        }
                      }
                    }
                  }
                }
              }).timeout(100000);
            }
          }
        });
      }
    });
  }
});
