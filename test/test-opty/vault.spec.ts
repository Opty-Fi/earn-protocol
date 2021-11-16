import { expect, assert } from "chai";
import hre from "hardhat";
import { Contract, Signer, BigNumber, utils } from "ethers";
import { setUp } from "./setup";
import { CONTRACTS } from "../../helpers/type";
import { TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants/utils";
import { VAULT_TOKENS, REWARD_TOKENS } from "../../helpers/constants/tokens";

import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { TESTING_CONTRACTS } from "../../helpers/constants/test-contracts-name";
import { COMPOUND_ADAPTER_NAME, HARVEST_V1_ADAPTER_NAME } from "../../helpers/constants/adapters";
import { TypedAdapterStrategies, TypedTokens } from "../../helpers/data";
import { delay } from "../../helpers/utils";
import { executeFunc, deployContract } from "../../helpers/helpers";
import { deployVault } from "../../helpers/contracts-deployments";
import {
  setBestStrategy,
  approveLiquidityPoolAndMapAdapter,
  fundWalletToken,
  getBlockTimestamp,
  getTokenName,
  getTokenSymbol,
  unpauseVault,
  addWhiteListForHarvest,
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

const VAULT_DEFAULT_DATA: { [key: string]: { getFunction: string; input: any[]; output: any } } = {
  gasOwedToOperator: {
    getFunction: "gasOwedToOperator()",
    input: [],
    output: "",
  },
  blockToBlockVaultValues: {
    getFunction: "blockToBlockVaultValues(uint256,uint256)",
    input: [],
    output: "",
  },
  queue: {
    getFunction: "queue(uint256)",
    input: [],
    output: "",
  },
  pendingDeposits: {
    getFunction: "pendingDeposits(address)",
    input: [],
    output: "",
  },
  depositQueue: {
    getFunction: "depositQueue()",
    input: [],
    output: "",
  },
  investStrategyHash: {
    getFunction: "investStrategyHash()",
    input: [],
    output: "",
  },
  maxVaultValueJump: {
    getFunction: "maxVaultValueJump()",
    input: [],
    output: "",
  },
  underlyingToken: {
    getFunction: "underlyingToken()",
    input: [],
    output: "",
  },
  riskProfileCode: {
    getFunction: "riskProfileCode()",
    input: [],
    output: "",
  },
  pricePerShareWrite: {
    getFunction: "pricePerShareWrite()",
    input: [],
    output: "",
  },
};

describe(scenario.title, () => {
  let essentialContracts: CONTRACTS;
  let adapters: CONTRACTS;
  const contracts: CONTRACTS = {};
  let users: Signer[];

  before(async () => {
    try {
      users = await hre.ethers.getSigners();
      [essentialContracts, adapters] = await setUp(
        users[0],
        Object.values(VAULT_TOKENS).map(token => token.address),
      );
      assert.isDefined(essentialContracts, "Essential contracts not deployed");
      assert.isDefined(adapters, "Adapters not deployed");
    } catch (error: any) {
      console.log(error);
    }
  });

  for (let i = 0; i < scenario.vaults.length; i++) {
    describe(`RP-${scenario.vaults[i].riskProfileCode}`, async () => {
      let Vault: Contract;
      const vault = scenario.vaults[i];
      const profile = vault.riskProfileCode;
      const adaptersName = Object.keys(TypedAdapterStrategies);

      for (let i = 0; i < adaptersName.length; i++) {
        const adapterName = adaptersName[i];
        const strategies = TypedAdapterStrategies[adaptersName[i]];
        const defaultData = VAULT_DEFAULT_DATA;
        describe(`${adapterName}`, async () => {
          for (let i = 0; i < strategies.length; i++) {
            const TOKEN_STRATEGY = strategies[i];
            const tokenAddress = VAULT_TOKENS[TOKEN_STRATEGY.token].address;
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
                tokenAddress,
                essentialContracts.investStrategyRegistry,
                essentialContracts.strategyProvider,
                profile,
                false,
              );

              const Token_ERC20Instance = await hre.ethers.getContractAt("ERC20", tokenAddress);

              const CHIInstance = await hre.ethers.getContractAt("IChi", TypedTokens["CHI"]);
              Vault = await deployVault(
                hre,
                essentialContracts.registry.address,
                tokenAddress,
                users[0],
                users[1],
                underlyingTokenName,
                underlyingTokenSymbol,
                profile,
                TESTING_DEPLOYMENT_ONCE,
              );
              if (adapterName === HARVEST_V1_ADAPTER_NAME) {
                await addWhiteListForHarvest(hre, Vault.address, users[1]);
              }
              await unpauseVault(users[0], essentialContracts.registry, Vault.address, true);
              if (rewardTokenAdapterNames.includes(adapterName.toLowerCase())) {
                await executeFunc(essentialContracts.registry, users[0], "approveToken(address[])", [
                  [Vault.address, REWARD_TOKENS[adapterName].tokenAddress.toString()],
                ]);
                await executeFunc(essentialContracts.registry, users[0], "setTokensHashToTokens(address[])", [
                  [Vault.address, REWARD_TOKENS[adapterName].tokenAddress.toString()],
                ]);
              }
              contracts["vault"] = Vault;
              contracts["chi"] = CHIInstance;
              contracts["erc20"] = Token_ERC20Instance;
            });
            for (let i = 0; i < vault.stories.length; i++) {
              const story = vault.stories[i];
              it(story.description, async function () {
                for (let i = 0; i < story.activities.length; i++) {
                  const activity = story.activities[i];
                  const userIndexes = activity.userIndexes;
                  for (let i = 0; i < userIndexes.length; i++) {
                    const userIndex = userIndexes[i];
                    for (let i = 0; i < activity.actions.length; i++) {
                      const action = activity.actions[i];
                      switch (action.action) {
                        case "initData()": {
                          const { amount }: ARGUMENTS = action.args;
                          if (amount) {
                            const halfAmount = BigNumber.from(amount[TOKEN_STRATEGY.token]).div(BigNumber.from(2));
                            const userAddress = await users[userIndex].getAddress();
                            const balanceTx = await contracts["vault"]
                              .connect(users[userIndex])
                              .userDepositRebalance(halfAmount);
                            defaultData.blockToBlockVaultValues.input = [balanceTx.blockNumber, 0];
                            defaultData.blockToBlockVaultValues.output = await contracts[
                              "vault"
                            ].blockToBlockVaultValues(balanceTx.blockNumber, 0);
                            defaultData.investStrategyHash.output = await contracts["vault"].investStrategyHash();
                            defaultData.underlyingToken.output = await contracts["vault"].underlyingToken();
                            defaultData.riskProfileCode.output = await contracts["vault"].riskProfileCode();
                            defaultData.maxVaultValueJump.output = await contracts["vault"].maxVaultValueJump();
                            await contracts["vault"].connect(users[userIndex]).rebalance();
                            defaultData.gasOwedToOperator.output = await contracts["vault"].gasOwedToOperator();
                            await contracts["vault"].connect(users[userIndex]).userDeposit(halfAmount);
                            defaultData.queue.input = [0];
                            defaultData.queue.output = await contracts["vault"].queue(0);
                            defaultData.pendingDeposits.input = [userAddress];
                            defaultData.pendingDeposits.output = await contracts["vault"].pendingDeposits(userAddress);
                            defaultData.depositQueue.output = await contracts["vault"].depositQueue();
                            defaultData.pricePerShareWrite.output = await contracts["vault"].pricePerShareWrite();
                          }
                          break;
                        }
                        case "upgradeTo(address)": {
                          const vaultProxy = await hre.ethers.getContractAt(
                            ESSENTIAL_CONTRACTS.VAULT_PROXY,
                            contracts["vault"].address,
                          );
                          const vault = await deployContract(
                            hre,
                            TESTING_CONTRACTS.TEST_VAULT_NEW_IMPLEMENTATION,
                            TESTING_DEPLOYMENT_ONCE,
                            users[0],
                            [
                              essentialContracts.registry.address,
                              underlyingTokenName,
                              underlyingTokenSymbol,
                              `RP-${profile}`,
                            ],
                          );

                          await expect(vaultProxy.connect(users[1])["upgradeTo(address)"](vault.address))
                            .to.emit(vaultProxy, "Upgraded")
                            .withArgs(vault.address);

                          contracts["vault"] = await hre.ethers.getContractAt(
                            TESTING_CONTRACTS.TEST_VAULT_NEW_IMPLEMENTATION,
                            vaultProxy.address,
                          );
                          await executeFunc(contracts["vault"], users[0], "initialize(address)", [
                            essentialContracts.registry.address,
                          ]);

                          break;
                        }
                        case "fundWallet": {
                          const { amount }: ARGUMENTS = action.args;
                          if (amount) {
                            const timestamp = (await getBlockTimestamp(hre)) * 2;
                            await fundWalletToken(
                              hre,
                              tokenAddress,
                              users[userIndex],
                              BigNumber.from(amount[TOKEN_STRATEGY.token]),
                              timestamp,
                            );
                          }
                          assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
                          break;
                        }
                        case "fundVaultWallet": {
                          if (adapterName !== COMPOUND_ADAPTER_NAME) {
                            //only test COMPOUND strategies for adminCall
                            this.skip();
                          }
                          const { amount }: ARGUMENTS = action.args;
                          if (amount) {
                            const timestamp = (await getBlockTimestamp(hre)) * 2;
                            await fundWalletToken(
                              hre,
                              tokenAddress,
                              users[userIndex],
                              BigNumber.from(amount[TOKEN_STRATEGY.token]),
                              timestamp,
                              contracts["vault"].address,
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
                        case "testGetDepositAllCodes": {
                          const liquidityPoolInstace = await hre.ethers.getContractAt(
                            "ERC20",
                            TOKEN_STRATEGY.strategy[0].contract,
                          );
                          const balanceBefore = await liquidityPoolInstace.balanceOf(contracts["vault"].address);
                          const functionCodes = [];
                          let iface = new utils.Interface(["function approve(address,uint256)"]);
                          functionCodes.push(
                            utils.defaultAbiCoder.encode(
                              ["address", "bytes"],
                              [
                                tokenAddress,
                                iface.encodeFunctionData("approve", [TOKEN_STRATEGY.strategy[0].contract, 0]),
                              ],
                            ),
                          );
                          functionCodes.push(
                            utils.defaultAbiCoder.encode(
                              ["address", "bytes"],
                              [
                                tokenAddress,
                                iface.encodeFunctionData("approve", [
                                  TOKEN_STRATEGY.strategy[0].contract,
                                  await contracts["erc20"].balanceOf(contracts["vault"].address),
                                ]),
                              ],
                            ),
                          );
                          iface = new utils.Interface(["function mint(uint256)"]);
                          functionCodes.push(
                            utils.defaultAbiCoder.encode(
                              ["address", "bytes"],
                              [
                                TOKEN_STRATEGY.strategy[0].contract,
                                iface.encodeFunctionData("mint", [
                                  await contracts["erc20"].balanceOf(contracts["vault"].address),
                                ]),
                              ],
                            ),
                          );
                          if (action.expect === "success") {
                            await contracts["vault"].connect(users[userIndex]).adminCall(functionCodes);
                            expect(await liquidityPoolInstace.balanceOf(contracts["vault"].address)).to.be.gt(
                              balanceBefore,
                            );
                          } else {
                            await expect(
                              contracts["vault"].connect(users[userIndex]).adminCall(functionCodes),
                            ).to.be.revertedWith(action.message);
                          }

                          break;
                        }
                        case "testGetClaimRewardTokenCode": {
                          const liquidityPoolInstance = await hre.ethers.getContractAt(
                            "ICompound",
                            TOKEN_STRATEGY.strategy[0].contract,
                          );
                          const comptroller = await hre.ethers.getContractAt(
                            "ICompound",
                            await liquidityPoolInstance.comptroller(),
                          );
                          const rewardTokenInstance = await hre.ethers.getContractAt(
                            "ERC20",
                            await comptroller.getCompAddress(),
                          );
                          const balanceBefore = await rewardTokenInstance.balanceOf(contracts["vault"].address);
                          const functionCodes = [];
                          const iface = new utils.Interface(["function claimComp(address)"]);
                          functionCodes.push(
                            utils.defaultAbiCoder.encode(
                              ["address", "bytes"],
                              [
                                await liquidityPoolInstance.comptroller(),
                                iface.encodeFunctionData("claimComp", [contracts["vault"].address]),
                              ],
                            ),
                          );
                          if (action.expect === "success") {
                            await contracts["vault"].connect(users[userIndex]).adminCall(functionCodes);
                            expect(await rewardTokenInstance.balanceOf(contracts["vault"].address)).to.be.gt(
                              balanceBefore,
                            );
                          } else {
                            await expect(
                              contracts["vault"].connect(users[userIndex]).adminCall(functionCodes),
                            ).to.be.revertedWith(action.message);
                          }
                          break;
                        }
                        case "testInvalidCodes": {
                          const functionCodes = [];
                          const iface = new utils.Interface(["function invalid(address)"]);
                          functionCodes.push(
                            utils.defaultAbiCoder.encode(
                              ["address", "bytes"],
                              [
                                TOKEN_STRATEGY.strategy[0].contract,
                                iface.encodeFunctionData("invalid", [contracts["vault"].address]),
                              ],
                            ),
                          );
                          await expect(
                            contracts["vault"].connect(users[userIndex]).adminCall(functionCodes),
                          ).to.be.revertedWith(action.message);
                          break;
                        }
                      }
                    }
                    for (let i = 0; i < activity.getActions.length; i++) {
                      const action = activity.getActions[i];
                      switch (action.action) {
                        case "isNewContract()": {
                          expect(await contracts[action.contract][action.action]()).to.be.equal(true);
                          break;
                        }
                        case "verifyOldValue()": {
                          const data = Object.values(defaultData);
                          for (let i = 0; i < data.length; i++) {
                            const action = data[i];
                            const value = await contracts["vault"][action.getFunction](...action.input);
                            if (Array.isArray(action.output)) {
                              for (let i = 0; i < action.output.length; i++) {
                                expect(value[i]).to.be.equal(action.output[i]);
                              }
                            } else {
                              expect(value).to.be.equal(action.output);
                            }
                          }
                          break;
                        }
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
