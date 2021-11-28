import { expect, assert } from "chai";
import hre from "hardhat";
import { Contract, Signer, BigNumber, utils } from "ethers";
import { getAddress } from "ethers/lib/utils";
import { setUp } from "./setup";
import { CONTRACTS, STRATEGY_DATA } from "../../helpers/type";
import { TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants/utils";
import { VAULT_TOKENS, REWARD_TOKENS } from "../../helpers/constants/tokens";
import { ZERO_BYTES32, ADDRESS_ZERO } from "../../helpers/constants/utils";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { TESTING_CONTRACTS } from "../../helpers/constants/test-contracts-name";
import { COMPOUND_ADAPTER_NAME, HARVEST_V1_ADAPTER_NAME } from "../../helpers/constants/adapters";
import { TypedTokenStrategies, TypedAdapterStrategies, TypedTokens } from "../../helpers/data";
import { delay } from "../../helpers/utils";
import {
  executeFunc,
  deployContract,
  generateTokenHash,
  getDefaultFundAmountInDecimal,
  moveToSpecificBlock,
} from "../../helpers/helpers";
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
import testVaultScenario from "./scenarios/test-vault.json";
import scenario from "./scenarios/vault.json";

type ARGUMENTS = {
  contractName?: string;
  amount?: { [key: string]: string | undefined };
  hold?: number;
  convert?: number;
  vaultRewardStrategy?: number[];
  vaultRewardTokenInvalidHash?: string;
  token?: string;
  jump?: number;
  profile?: number;
  user?: number;
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

const strategyDivisor = +process.env.STRATEGY_DIVISOR!;

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
                users[0],
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
                await expect(
                  essentialContracts.registry
                    .connect(users[0])
                    ["setTokensHashToTokens(address[])"]([
                      Vault.address,
                      REWARD_TOKENS[adapterName].tokenAddress.toString(),
                    ]),
                )
                  .to.emit(essentialContracts.registry, "LogTokensToTokensHash")
                  .withArgs(
                    generateTokenHash([Vault.address, REWARD_TOKENS[adapterName].tokenAddress.toString()]),
                    await users[0].getAddress(),
                  );
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
                            if (action.action === "userDeposit(uint256)") {
                              const queue = await contracts[action.contract].getDepositQueue();
                              const balanceBefore = await contracts["erc20"].balanceOf(
                                contracts[action.contract].address,
                              );
                              const _tx = await contracts[action.contract]
                                .connect(users[userIndex])
                                [action.action](investedAmount);
                              const balanceAfter = await contracts["erc20"].balanceOf(
                                contracts[action.contract].address,
                              );

                              const tx = await _tx.wait(1);
                              expect(tx.events[0].event).to.equal("Transfer");
                              expect(tx.events[0].args[0]).to.equal(await users[userIndex].getAddress());
                              expect(tx.events[0].args[1]).to.equal(contracts[action.contract].address);
                              expect(tx.events[0].args[2]).to.equal(balanceAfter.sub(balanceBefore));
                              expect(tx.events[1].event).to.equal("DepositQueue");
                              expect(tx.events[1].args[0]).to.equal(await users[userIndex].getAddress());
                              expect(tx.events[1].args[1]).to.equal(queue.length + 1);
                              expect(tx.events[1].args[2]).to.equal(balanceAfter.sub(balanceBefore));
                            } else {
                              await contracts[action.contract].connect(users[userIndex])[action.action](investedAmount);
                            }
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

describe(testVaultScenario.title, () => {
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

  let Vault: Contract;
  const vault = testVaultScenario.vaults[0];
  const profile = vault.riskProfileCode;
  const defaultData = VAULT_DEFAULT_DATA;
  for (const token in TypedTokenStrategies) {
    describe(token, async () => {
      for (let i = 0; i < TypedTokenStrategies[token].length; i = i + strategyDivisor) {
        const TOKEN_STRATEGY = TypedTokenStrategies[token][i];
        const tokenAddress = VAULT_TOKENS[token].address;
        const numberOfSteps = TOKEN_STRATEGY.steps.length;
        const adapterNames: string[] = [];
        let description: string = "";
        for (let i = 0; i < numberOfSteps; i++) {
          adapterNames.push(TOKEN_STRATEGY.steps[i].protocol.name + "Adapter");
          if (i != 0) {
            description = description + " - ";
          }
          description = description + TOKEN_STRATEGY.steps[i].protocol.name;
        }
        describe(description, async () => {
          const rewardTokenAdapterNames = Object.keys(REWARD_TOKENS).map(rewardTokenAdapterName =>
            rewardTokenAdapterName.toLowerCase(),
          );
          let underlyingTokenName: string;
          let underlyingTokenSymbol: string;
          let underlyingTokenDecimals: number;
          const strategySteps: STRATEGY_DATA[] = [];
          let investStrategyHash: string;
          before(async () => {
            const Token_ERC20Instance = await hre.ethers.getContractAt("ERC20", tokenAddress);
            underlyingTokenName = await Token_ERC20Instance.name();
            underlyingTokenSymbol = await Token_ERC20Instance.symbol();
            underlyingTokenDecimals = await Token_ERC20Instance.decimals();

            Vault = await deployVault(
              hre,
              essentialContracts.registry.address,
              tokenAddress,
              users[0],
              users[1],
              underlyingTokenName,
              underlyingTokenSymbol,
              1,
              TESTING_DEPLOYMENT_ONCE,
            );
            for (let i = 0; i < numberOfSteps; i++) {
              const adapter = adapters[adapterNames[i]];
              if (adapterNames[i] === HARVEST_V1_ADAPTER_NAME) {
                await addWhiteListForHarvest(hre, Vault.address, users[1]);
              }
              await unpauseVault(users[0], essentialContracts.registry, Vault.address, true);
              if (
                rewardTokenAdapterNames.includes(adapterNames[i].toLowerCase()) &&
                !(await essentialContracts.registry.tokens(REWARD_TOKENS[adapterNames[i]].tokenAddress.toString()))
              ) {
                await executeFunc(essentialContracts.registry, users[0], "approveToken(address[])", [
                  [Vault.address, REWARD_TOKENS[adapterNames[i]].tokenAddress.toString()],
                ]);
                await executeFunc(essentialContracts.registry, users[0], "setTokensHashToTokens(address[])", [
                  [Vault.address, REWARD_TOKENS[adapterNames[i]].tokenAddress.toString()],
                ]);
              }
              await approveLiquidityPoolAndMapAdapter(
                users[0],
                essentialContracts.registry,
                adapter.address,
                TOKEN_STRATEGY.steps[i].poolContractAddress,
              );
              strategySteps.push({
                contract: TOKEN_STRATEGY.steps[i].poolContractAddress,
                outputToken: TOKEN_STRATEGY.steps[i].lpToken,
                isBorrow: TOKEN_STRATEGY.steps[i].isBorrow,
              });
            }

            const CHIInstance = await hre.ethers.getContractAt("IChi", TypedTokens["CHI"]);

            contracts["vault"] = Vault;
            contracts["chi"] = CHIInstance;
            contracts["erc20"] = Token_ERC20Instance;
          });
          for (let i = 0; i < vault.stories.length; i++) {
            const story = vault.stories[i];
            it(story.description, async function () {
              for (let i = 0; i < story.setActions.length; i++) {
                const action = story.setActions[i];
                switch (action.action) {
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
                      [essentialContracts.registry.address, underlyingTokenName, underlyingTokenSymbol, profile],
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
                    const { token } = action.args as ARGUMENTS;
                    let defaultFundAmount: BigNumber;
                    let underlyingBalance: BigNumber;
                    if (token == "underlying") {
                      defaultFundAmount = getDefaultFundAmountInDecimal(
                        tokenAddress,
                        BigNumber.from(underlyingTokenDecimals),
                      );
                      underlyingBalance = await contracts["erc20"].balanceOf(await users[2].getAddress());
                      if (underlyingBalance.lt(defaultFundAmount)) {
                        const timestamp = (await getBlockTimestamp(hre)) * 2;
                        await fundWalletToken(hre, tokenAddress, users[action.executor], defaultFundAmount, timestamp);
                      }
                    } else if (token == "chi") {
                      defaultFundAmount = getDefaultFundAmountInDecimal(TypedTokens["CHI"], 2);
                      underlyingBalance = await contracts["chi"].balanceOf(await users[2].getAddress());
                      if (underlyingBalance.lt(defaultFundAmount)) {
                        const timestamp = (await getBlockTimestamp(hre)) * 2;
                        await fundWalletToken(
                          hre,
                          TypedTokens["CHI"],
                          users[action.executor],
                          defaultFundAmount,
                          timestamp,
                        );
                      }
                    }
                    break;
                  }
                  case "fundVaultWallet": {
                    if (adapterNames[0] !== COMPOUND_ADAPTER_NAME) {
                      //only test COMPOUND strategies for adminCall
                      this.skip();
                    }
                    const { amount }: ARGUMENTS = action.args;
                    if (amount) {
                      const timestamp = (await getBlockTimestamp(hre)) * 2;
                      await fundWalletToken(
                        hre,
                        tokenAddress,
                        users[action.executor],
                        BigNumber.from(amount[TOKEN_STRATEGY.underlyingTokens[0].symbol]),
                        timestamp,
                        contracts["vault"].address,
                      );
                    }
                    assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
                    break;
                  }
                  case "approve(address,uint256)": {
                    const { contractName }: ARGUMENTS = action.args;

                    if (contractName) {
                      const userAddr = await users[action.executor].getAddress();
                      const value = await contracts[action.contract].balanceOf(userAddr);
                      await contracts[action.contract]
                        .connect(users[action.executor])
                        [action.action](contracts[contractName].address, value);
                    }
                    assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
                    break;
                  }
                  case "setMaxVaultValueJump(uint256)": {
                    const { jump } = action.args as ARGUMENTS;
                    if (jump) {
                      if (action.expect == "success") {
                        await contracts[action.contract].connect(users[action.executor])[action.action](jump);
                      } else {
                        await expect(
                          contracts[action.contract].connect(users[action.executor])[action.action](jump),
                        ).to.be.revertedWith(action.message);
                      }
                      assert.isDefined(jump, `args is wrong in ${action.action} testcase`);
                    }
                    break;
                  }
                  case "setRiskProfileCode(uint256)": {
                    const { profile } = action.args as ARGUMENTS;
                    if (profile) {
                      if (action.expect == "success") {
                        await contracts[action.contract].connect(users[action.executor])[action.action](profile);
                      } else {
                        await expect(
                          contracts[action.contract].connect(users[action.executor])[action.action](profile),
                        ).to.be.revertedWith(action.message);
                      }
                      assert.isDefined(profile, `args is wrong in ${action.action} testcase`);
                    }
                    break;
                  }
                  case "setToken(address)": {
                    const { token } = action.args as ARGUMENTS;
                    if (token) {
                      if (action.expect == "success") {
                        await contracts[action.contract]
                          .connect(users[action.executor])
                          [action.action](TypedTokens[token]);
                      } else {
                        await expect(
                          contracts[action.contract].connect(users[action.executor])[action.action](TypedTokens[token]),
                        ).to.be.revertedWith(action.message);
                      }
                      assert.isDefined(token, `args is wrong in ${action.action} testcase`);
                    }
                    break;
                  }
                  case "userDepositRebalance(uint256)":
                  case "userDepositRebalanceWithCHI(uint256)":
                  case "userDeposit(uint256)":
                  case "userDepositWithCHI(uint256)": {
                    investStrategyHash = await setBestStrategy(
                      strategySteps,
                      users[0],
                      tokenAddress,
                      essentialContracts.investStrategyRegistry,
                      essentialContracts.strategyProvider,
                      1,
                      false,
                    );

                    const userAddr = await users[action.executor].getAddress();
                    const value = await contracts["erc20"].balanceOf(userAddr);
                    await contracts[action.contract].connect(users[action.executor])[action.action](value);
                    break;
                  }
                  case "userWithdrawRebalance(uint256)":
                  case "userWithdrawRebalanceWithCHI(uint256)": {
                    const tokenHash = generateTokenHash([tokenAddress]);
                    await essentialContracts.strategyProvider
                      .connect(users[0])
                      .setBestStrategy(1, tokenHash, ZERO_BYTES32);

                    const userAddr = await users[action.executor].getAddress();
                    const value = await contracts["vault"].balanceOf(userAddr);
                    await contracts[action.contract].connect(users[action.executor])[action.action](value);
                    break;
                  }
                  case "userDepositAll()":
                  case "userDepositAllWithCHI()":
                  case "userDepositAllRebalance()":
                  case "userWithdrawAllRebalance()":
                  case "userDepositAllRebalanceWithCHI()":
                  case "userWithdrawAllRebalanceWithCHI()":
                  case "rebalance()": {
                    investStrategyHash = await setBestStrategy(
                      strategySteps,
                      users[0],
                      tokenAddress,
                      essentialContracts.investStrategyRegistry,
                      essentialContracts.strategyProvider,
                      1,
                      false,
                    );
                    await contracts[action.contract].connect(users[action.executor])[action.action]();
                    break;
                  }
                  case "harvest(bytes32)": {
                    await contracts[action.contract].connect(users[action.executor])[action.action](investStrategyHash);
                    break;
                  }
                  case "setUnpaused(bool)": {
                    if (action.expect == "fail") {
                      await expect(
                        contracts[action.contract].connect(users[action.executor])[action.action](false),
                      ).to.be.revertedWith(action.message);
                    } else {
                      await essentialContracts.registry
                        .connect(users[0])
                        .unpauseVaultContract(contracts["vault"].address, false);
                    }
                    break;
                  }
                  case "getPricePerFullShareWrite()": {
                    if (
                      TOKEN_STRATEGY.steps[TOKEN_STRATEGY.steps.length - 1].protocol.name == "CurveDepositPool" ||
                      TOKEN_STRATEGY.steps[TOKEN_STRATEGY.steps.length - 1].protocol.name == "CurveSwapPool"
                    ) {
                      await contracts[action.contract].connect(users[action.executor])[action.action]();
                      const pricePerShareWrite = await contracts[action.contract].pricePerShareWrite();
                      expect(pricePerShareWrite).to.be.gt(BigNumber.from(10).pow(18).mul(99).div(100));
                    } else {
                      this.skip();
                    }
                    break;
                  }
                  case "testGetDepositAllCodes": {
                    const liquidityPoolInstance = await hre.ethers.getContractAt(
                      "ERC20",
                      TOKEN_STRATEGY.steps[0].poolContractAddress,
                    );
                    const balanceBefore = await liquidityPoolInstance.balanceOf(contracts["vault"].address);
                    const functionCodes = [];
                    let iface = new utils.Interface(["function approve(address,uint256)"]);
                    functionCodes.push(
                      utils.defaultAbiCoder.encode(
                        ["address", "bytes"],
                        [
                          tokenAddress,
                          iface.encodeFunctionData("approve", [TOKEN_STRATEGY.steps[0].poolContractAddress, 0]),
                        ],
                      ),
                    );
                    functionCodes.push(
                      utils.defaultAbiCoder.encode(
                        ["address", "bytes"],
                        [
                          tokenAddress,
                          iface.encodeFunctionData("approve", [
                            TOKEN_STRATEGY.steps[0].poolContractAddress,
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
                          TOKEN_STRATEGY.steps[0].poolContractAddress,
                          iface.encodeFunctionData("mint", [
                            await contracts["erc20"].balanceOf(contracts["vault"].address),
                          ]),
                        ],
                      ),
                    );
                    if (action.expect === "success") {
                      await contracts["vault"].connect(users[action.executor]).adminCall(functionCodes);
                      expect(await liquidityPoolInstance.balanceOf(contracts["vault"].address)).to.be.gt(balanceBefore);
                    } else {
                      await expect(
                        contracts["vault"].connect(users[action.executor]).adminCall(functionCodes),
                      ).to.be.revertedWith(action.message);
                    }

                    break;
                  }
                  case "testGetClaimRewardTokenCode": {
                    const liquidityPoolInstance = await hre.ethers.getContractAt(
                      "ICompound",
                      TOKEN_STRATEGY.steps[0].poolContractAddress,
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
                      await contracts["vault"].connect(users[action.executor]).adminCall(functionCodes);
                      expect(await rewardTokenInstance.balanceOf(contracts["vault"].address)).to.be.gt(balanceBefore);
                    } else {
                      await expect(
                        contracts["vault"].connect(users[action.executor]).adminCall(functionCodes),
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
                          TOKEN_STRATEGY.steps[0].poolContractAddress,
                          iface.encodeFunctionData("invalid", [contracts["vault"].address]),
                        ],
                      ),
                    );
                    await expect(
                      contracts["vault"].connect(users[action.executor]).adminCall(functionCodes),
                    ).to.be.revertedWith(action.message);
                    break;
                  }
                  case "wait10000Seconds": {
                    const blockNumber = await hre.ethers.provider.getBlockNumber();
                    const block = await hre.ethers.provider.getBlock(blockNumber);
                    await moveToSpecificBlock(hre, block.timestamp + 10000);
                    break;
                  }
                }
              }
              for (let i = 0; i < story.getActions.length; i++) {
                const action = story.getActions[i];
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
                  case "pendingDeposits(address)":
                  case "balanceOf(address)": {
                    const { user } = action.args as ARGUMENTS;
                    if (user) {
                      const address = await users[user].getAddress();
                      const value = await contracts[action.contract][action.action](address);
                      if (action.expectedValue == ">") {
                        expect(value).to.be.gt(0);
                      } else {
                        expect(value).to.be.eq(0);
                      }
                    }
                    assert.isDefined(user, `args is wrong in ${action.action} testcase`);
                    break;
                  }
                  case "investStrategyHash()": {
                    const value = await contracts[action.contract][action.action]();
                    expect(value).to.be.eq(investStrategyHash);
                    break;
                  }
                  case "maxVaultValueJump()": {
                    const value = await contracts[action.contract][action.action]();
                    expect(value).to.be.eq(action.expectedValue);
                    break;
                  }
                  case "balance()": {
                    const value = await contracts[action.contract][action.action]();
                    const unpaused = (
                      await essentialContracts.registry.vaultToVaultConfiguration(contracts[action.contract].address)
                    )[1];
                    if (action.expectedValue == ">") {
                      const rewardToken = await essentialContracts.strategyManager.getRewardToken(investStrategyHash);
                      const lastAdapterName = adapterNames[numberOfSteps - 1];
                      if (
                        (rewardToken != ADDRESS_ZERO && REWARD_TOKENS[lastAdapterName].distributionActive == true) ||
                        !unpaused
                      ) {
                        expect(value).to.be.gt(0);
                      } else {
                        expect(value).to.be.eq(0);
                      }
                    } else if (action.expectedValue == "above") {
                      expect(value).to.be.gt(0);
                    }
                    break;
                  }
                  case "getPricePerFullShare()": {
                    const pricePerShare = await contracts[action.contract][action.action]();
                    expect(pricePerShare).to.be.gt(BigNumber.from(10).pow(18).mul(99).div(100));
                    break;
                  }
                  case "riskProfileCode()": {
                    const riskProfileCode = await contracts[action.contract][action.action]();
                    expect(riskProfileCode).to.be.eq(action.expectedValue);
                    break;
                  }
                  case "underlyingToken()": {
                    const underlyingToken = await contracts[action.contract][action.action]();
                    expect(underlyingToken).to.be.eq(getAddress(TypedTokens.TUSD));
                    break;
                  }
                  case "isMaxVaultValueJumpAllowed(uint256,uint256)": {
                    const mockedVaultBalance = BigNumber.from(10).pow(18);
                    if (action.expectedValue == "success") {
                      expect(
                        await contracts[action.contract][action.action](
                          mockedVaultBalance.div(1000),
                          mockedVaultBalance,
                        ),
                      ).to.be.eq(true);
                    } else {
                      expect(
                        await contracts[action.contract][action.action](mockedVaultBalance, mockedVaultBalance),
                      ).to.be.eq(false);
                    }
                    break;
                  }
                }
              }
              for (let i = 0; i < story.cleanActions.length; i++) {
                const action = story.cleanActions[i];
                switch (action.action) {
                  case "resetStrategy": {
                    const tokenHash = generateTokenHash([tokenAddress]);
                    await essentialContracts.strategyProvider
                      .connect(users[0])
                      .setBestStrategy(1, tokenHash, ZERO_BYTES32);
                    const bestStrategy = await essentialContracts.strategyProvider.rpToTokenToBestStrategy(
                      1,
                      tokenHash,
                    );
                    expect(bestStrategy).to.be.eq(ZERO_BYTES32);
                    break;
                  }
                  case "approve(address,uint256)": {
                    const { contractName, user }: ARGUMENTS = action.args;

                    if (contractName && user) {
                      const userAddr = await users[user].getAddress();
                      const value = await contracts[action.contract].balanceOf(userAddr);
                      await contracts[action.contract]
                        .connect(users[user])
                        [action.action](contracts[contractName].address, value);
                    }
                    assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
                    assert.isDefined(user, `args is wrong in ${action.action} testcase`);
                    break;
                  }
                  case "userWithdrawAllRebalance()": {
                    const { user } = action.args as ARGUMENTS;
                    if (user) {
                      const userAddr = await users[user].getAddress();
                      await contracts[action.contract].connect(users[user])[action.action]();
                      expect(await contracts[action.contract].balanceOf(userAddr)).to.be.eq(0);
                    }
                    assert.isDefined(user, `args is wrong in ${action.action} testcase`);
                    break;
                  }
                  case "setMaxVaultValueJump(uint256)": {
                    await contracts[action.contract].connect(users[0])[action.action](0);
                    expect(await contracts[action.contract].maxVaultValueJump()).to.be.eq(0);
                    break;
                  }
                  case "rebalance()": {
                    await contracts[action.contract].connect(users[3])[action.action]();
                    expect(await contracts[action.contract].pendingDeposits(await users[2].getAddress())).to.be.eq(0);
                    break;
                  }
                  case "setUnpaused(bool)": {
                    await essentialContracts.registry
                      .connect(users[0])
                      .unpauseVaultContract(contracts[action.contract].address, true);
                    expect(
                      (
                        await essentialContracts.registry.vaultToVaultConfiguration(contracts[action.contract].address)
                      )[1],
                    ).to.be.eq(true);
                    break;
                  }
                  case "setRiskProfileCode(uint256)": {
                    await contracts[action.contract].connect(users[0])[action.action](1);
                    expect(await contracts[action.contract].riskProfileCode()).to.be.eq(1);
                    break;
                  }
                  case "setToken(address)": {
                    await contracts[action.contract].connect(users[0])[action.action](tokenAddress);
                    expect(await contracts[action.contract].underlyingToken()).to.be.eq(tokenAddress);
                    break;
                  }
                }
              }
            }).timeout(100000);
          }
        });
      }
    });
  }
});
