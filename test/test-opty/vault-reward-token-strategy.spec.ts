import chai, { expect, assert } from "chai";
import { solidity } from "ethereum-waffle";
import hre, { ethers } from "hardhat";
import { Contract, Signer, BigNumber } from "ethers";
import { setUp } from "./setup";
import { CONTRACTS } from "../../helpers/type";
import { ADDRESS_ZERO, TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants/utils";
import { VAULT_TOKENS, REWARD_TOKENS } from "../../helpers/constants/tokens";
import { HARVEST_V1_ADAPTER_NAME } from "../../helpers/constants/adapters";
import { TypedAdapterStrategies } from "../../helpers/data";
import { delay } from "../../helpers/utils";
import { deployVault } from "../../helpers/contracts-deployments";
import {
  setBestStrategy,
  approveLiquidityPoolAndMapAdapter,
  fundWalletToken,
  getBlockTimestamp,
  getTokenName,
  getTokenSymbol,
  approveAndSetTokenHashToTokens,
  unpauseVault,
  addWhiteListForHarvest,
} from "../../helpers/contracts-actions";
import scenario from "./scenarios/vault-reward-token-strategy.json";
import { executeFunc, generateTokenHash } from "../../helpers/helpers";

chai.use(solidity);

type ARGUMENTS = {
  addressName?: string;
  underlyingTokens?: string[];
  amount?: { [key: string]: string };
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
  // TODO: ADD TEST SCENARIOS, ADVANCED PROFILE, STRATEGIES.
  let essentialContracts: CONTRACTS;
  let adapters: CONTRACTS;
  const contracts: CONTRACTS = {};
  let users: { [key: string]: Signer };
  before(async () => {
    try {
      const [owner, admin, user1, operator, nonOperator] = await hre.ethers.getSigners();
      users = { owner, admin, user1, operator, nonOperator };
      [essentialContracts, adapters] = await setUp(
        owner,
        Object.values(VAULT_TOKENS).map(token => token.address),
      );
      assert.isDefined(essentialContracts, "Essential contracts not deployed");
      assert.isDefined(adapters, "Adapters not deployed");
    } catch (error: any) {
      console.log(error);
    }
  });

  for (let i = 0; i < scenario.vaults.length; i++) {
    describe(`${scenario.vaults[i].name}`, async () => {
      let Vault: Contract;
      const vault = scenario.vaults[i];
      const profile = vault.riskProfileCode;
      const adaptersName = Object.keys(TypedAdapterStrategies);
      let rewardTokenBalanceBefore: BigNumber;
      for (let i = 0; i < adaptersName.length; i++) {
        const adapterName = adaptersName[i];
        const strategies = TypedAdapterStrategies[adaptersName[i]];

        for (let i = 0; i < strategies.length; i++) {
          const TOKEN_STRATEGY = strategies[i];

          describe(`${strategies[i].strategyName}`, async () => {
            const token = VAULT_TOKENS[TOKEN_STRATEGY.token].address;
            const rewardTokenAdapterNames = Object.keys(REWARD_TOKENS).map(rewardTokenAdapterName =>
              rewardTokenAdapterName.toLowerCase(),
            );
            let investStrategyHash: string;
            let vaultRewardTokenHash: string;
            let underlyingTokenName: string;
            let underlyingTokenSymbol: string;
            let RewardToken_ERC20Instance: Contract;
            let vaultRewardTokens: string[] = [];
            before(async () => {
              underlyingTokenName = await getTokenName(hre, TOKEN_STRATEGY.token);
              underlyingTokenSymbol = await getTokenSymbol(hre, TOKEN_STRATEGY.token);
              const adapter = adapters[adapterName];
              const operator = await essentialContracts.registry.operator();
              const operatorSigner = await hre.ethers.getSigner(operator);
              Vault = await deployVault(
                hre,
                essentialContracts.registry.address,
                token,
                operatorSigner,
                users["admin"],
                underlyingTokenName,
                underlyingTokenSymbol,
                profile,
                TESTING_DEPLOYMENT_ONCE,
              );
              const _financeOperatorSigner = await hre.ethers.getSigner(
                await essentialContracts.registry.getFinanceOperator(),
              );
              const _operatorSigner = await hre.ethers.getSigner(await essentialContracts.registry.getOperator());
              await essentialContracts.registry
                .connect(_operatorSigner)
                .setQueueCap(Vault.address, ethers.constants.MaxUint256);
              await essentialContracts.registry
                .connect(_financeOperatorSigner)
                .setTotalValueLockedLimitInUnderlying(Vault.address, ethers.constants.MaxUint256);
              await executeFunc(essentialContracts.registry, users["owner"], "setOperator(address)", [
                await users["operator"].getAddress(),
              ]);
              if (adapterName === HARVEST_V1_ADAPTER_NAME) {
                await addWhiteListForHarvest(hre, Vault.address, users["admin"]);
              }
              await unpauseVault(users["operator"], essentialContracts.registry, Vault.address, true);

              if (rewardTokenAdapterNames.includes(adapterName.toLowerCase())) {
                await approveAndSetTokenHashToTokens(
                  users["operator"],
                  essentialContracts.registry,
                  [Vault.address, <string>REWARD_TOKENS[adapterName].tokenAddress],
                  false,
                );
                RewardToken_ERC20Instance = await hre.ethers.getContractAt(
                  "ERC20",
                  <string>REWARD_TOKENS[adapterName].tokenAddress,
                );
                vaultRewardTokens = [Vault.address, <string>REWARD_TOKENS[adapterName].tokenAddress];
              }

              await approveLiquidityPoolAndMapAdapter(
                users["operator"],
                essentialContracts.registry,
                adapter.address,
                TOKEN_STRATEGY.strategy[0].contract,
              );

              investStrategyHash = await setBestStrategy(
                TOKEN_STRATEGY.strategy,
                users["operator"],
                token,
                essentialContracts.investStrategyRegistry,
                essentialContracts.strategyProvider,
                profile,
                false,
              );

              const Token_ERC20Instance = await hre.ethers.getContractAt("ERC20", token);

              contracts["vault"] = Vault;
              contracts["registry"] = essentialContracts.registry;
              contracts["tokenErc20"] = Token_ERC20Instance;
              contracts["rewardTokenErc20"] = RewardToken_ERC20Instance;
              contracts["adapter"] = adapter;
              contracts["strategyProvider"] = essentialContracts.strategyProvider;
              contracts["riskManager"] = essentialContracts.riskManager;
            });

            for (let i = 0; i < vault.stories.length; i++) {
              const story = vault.stories[i];
              it(story.description, async () => {
                for (let j = 0; j < story.setActions.length; j++) {
                  const action = story.setActions[j];
                  switch (action.action) {
                    case "setVaultRewardStrategy(bytes32,(uint256,uint256))": {
                      const { vaultRewardTokenInvalidHash, vaultRewardStrategy }: ARGUMENTS = action.args;
                      try {
                        if (rewardTokenAdapterNames.includes(adapterName.toLowerCase())) {
                          if (Array.isArray(vaultRewardStrategy) && vaultRewardStrategy.length > 0) {
                            vaultRewardTokenHash = generateTokenHash([
                              Vault.address,
                              REWARD_TOKENS[adapterName].tokenAddress as string,
                            ]);
                            await contracts[action.contract]
                              .connect(users[action.executer])
                              [action.action](
                                vaultRewardTokenInvalidHash ? vaultRewardTokenInvalidHash : vaultRewardTokenHash,
                                vaultRewardStrategy,
                              );
                            const value = await contracts[action.contract]
                              .connect(users[action.executer])
                              ["vaultRewardTokenHashToVaultRewardTokenStrategy(bytes32)"](vaultRewardTokenHash);
                            expect([+value[0]._hex, +value[1]._hex]).to.have.members(vaultRewardStrategy);
                          }
                        }
                      } catch (error: any) {
                        if (action.expect === "success") {
                          assert.isUndefined(error);
                        } else {
                          expect(error.message).to.equal(
                            `VM Exception while processing transaction: reverted with reason string '${action.message}'`,
                          );
                        }
                      }

                      assert.isDefined(vaultRewardStrategy, `args is wrong in ${action.action} testcase`);
                      break;
                    }
                    case "fundWallet": {
                      const { addressName, amount }: ARGUMENTS = action.args;
                      try {
                        if (addressName && amount) {
                          const timestamp = (await getBlockTimestamp(hre)) * 2;
                          await fundWalletToken(
                            hre,
                            token,
                            users[addressName],
                            BigNumber.from(amount[TOKEN_STRATEGY.token]),
                            timestamp,
                          );
                        }
                      } catch (error: any) {
                        if (action.expect === "success") {
                          assert.isUndefined(error);
                        } else {
                          expect(error.message).to.equal(
                            `VM Exception while processing transaction: reverted with reason string '${action.message}'`,
                          );
                        }
                      }
                      assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
                      assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
                      break;
                    }
                    case "approve(address,uint256)": {
                      const { addressName, amount }: ARGUMENTS = action.args;
                      try {
                        if (addressName && amount) {
                          await contracts[action.contract]
                            .connect(users[action.executer])
                            [action.action](contracts[addressName].address, amount[TOKEN_STRATEGY.token]);
                        }
                      } catch (error: any) {
                        if (action.expect === "success") {
                          assert.isUndefined(error);
                        } else {
                          expect(error.message).to.equal(
                            `VM Exception while processing transaction: reverted with reason string '${action.message}'`,
                          );
                        }
                      }
                      assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
                      assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
                      break;
                    }
                    case "harvest(bytes32)": {
                      try {
                        if (investStrategyHash) {
                          const rewardToken = await essentialContracts.strategyManager.getRewardToken(
                            investStrategyHash,
                          );
                          if (rewardToken != ADDRESS_ZERO) {
                            const rewardTokenInstance = await hre.ethers.getContractAt("ERC20", rewardToken);
                            rewardTokenBalanceBefore = await rewardTokenInstance.balanceOf(Vault.address);
                          } else {
                            rewardTokenBalanceBefore = BigNumber.from(0);
                          }
                          await contracts[action.contract]
                            .connect(users[action.executer])
                            [action.action](investStrategyHash);
                        }
                      } catch (error: any) {
                        if (action.expect === "success") {
                          assert.isUndefined(error);
                        } else {
                          expect(error.message).to.equal(
                            `VM Exception while processing transaction: reverted with reason string '${action.message}'`,
                          );
                        }
                      }
                      break;
                    }
                    case "userDepositRebalance(uint256)":
                    case "userWithdrawRebalance(uint256)": {
                      const { amount }: ARGUMENTS = action.args;
                      if (action.action === "userWithdrawRebalance(uint256)") {
                        await delay(200);
                      }
                      try {
                        if (amount) {
                          await contracts[action.contract]
                            .connect(users[action.executer])
                            [action.action](amount[TOKEN_STRATEGY.token]);
                        }
                      } catch (error: any) {
                        if (action.expect === "success") {
                          assert.isUndefined(error);
                        } else {
                          expect(error.message).to.equal(
                            `VM Exception while processing transaction: reverted with reason string '${action.message}'`,
                          );
                        }
                      }
                      assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
                      break;
                    }
                  }
                }
                for (let j = 0; j < story.getActions.length; j++) {
                  const action = story.getActions[j];
                  switch (action.action) {
                    case "getVaultRewardTokenStrategy(address[])": {
                      if (rewardTokenAdapterNames.includes(adapterName.toLowerCase())) {
                        const { underlyingTokens }: ARGUMENTS = action.args;
                        const { vaultRewardStrategy }: EXPECTED_ARGUMENTS = action.expectedValue;
                        if (action.expect === "success") {
                          const value = await contracts[action.contract][action.action](
                            underlyingTokens ? underlyingTokens : vaultRewardTokens,
                          );
                          expect([+value[0]._hex, +value[1]._hex]).to.have.members(<number[]>vaultRewardStrategy);
                        } else {
                          await expect(
                            contracts[action.contract][action.action](
                              underlyingTokens ? underlyingTokens : vaultRewardTokens,
                            ),
                          ).to.be.revertedWith(action.message);
                        }
                      }
                      break;
                    }
                    case "vaultRewardTokenHashToVaultRewardTokenStrategy(bytes32)": {
                      const { vaultRewardTokenInvalidHash }: ARGUMENTS = action.args;
                      const { vaultRewardStrategy }: EXPECTED_ARGUMENTS = action.expectedValue;
                      try {
                        if (rewardTokenAdapterNames.includes(adapterName.toLowerCase())) {
                          const value = await contracts[action.contract][action.action](
                            vaultRewardTokenInvalidHash ? vaultRewardTokenInvalidHash : vaultRewardTokenHash,
                          );
                          expect([+value[0]._hex, +value[1]._hex]).to.have.members(<number[]>vaultRewardStrategy);
                        }
                      } catch (error: any) {
                        if (action.expect === "success") {
                          assert.isUndefined(error);
                        } else {
                          expect(error.message).to.equal(
                            `VM Exception while processing transaction: reverted with reason string '${action.message}'`,
                          );
                        }
                      }
                      break;
                    }
                    case "balanceOf(address)": {
                      const { addressName }: ARGUMENTS = action.args;
                      const { balance }: EXPECTED_ARGUMENTS = action.expectedValue;
                      if (addressName) {
                        const address =
                          addressName == "vault"
                            ? contracts[addressName].address
                            : await users[addressName].getAddress();
                        if (rewardTokenAdapterNames.includes(adapterName.toLowerCase())) {
                          const reward_token_balance = await contracts[action.contract][action.action](address);
                          if (balance == "=") {
                            expect(reward_token_balance).to.equal(rewardTokenBalanceBefore);
                          } else {
                            <string>balance == ">0"
                              ? REWARD_TOKENS[adapterName].distributionActive
                                ? expect(reward_token_balance).to.gte(BigNumber.from("0"))
                                : expect(reward_token_balance).to.equal(BigNumber.from("0"))
                              : expect(reward_token_balance).to.equal(balance);
                          }
                        }
                      }
                      break;
                    }
                  }
                }
              }).timeout(100000);
            }
          });
        }
      }
    });
  }
});
