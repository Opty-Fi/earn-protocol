import { expect, assert } from "chai";
import hre from "hardhat";
import { Contract, Signer, BigNumber } from "ethers";
import { setUp } from "./setup";
import { CONTRACTS } from "../../helpers/type";
import { TOKENS, TESTING_DEPLOYMENT_ONCE, REWARD_TOKENS } from "../../helpers/constants";
import { TypedAdapterStrategies } from "../../helpers/data";
import { getSoliditySHA3Hash, delay } from "../../helpers/utils";
import { deployVault } from "../../helpers/contracts-deployments";
import {
  setBestBasicStrategy,
  approveLiquidityPoolAndMapAdapter,
  fundWalletToken,
  getBlockTimestamp,
  getTokenName,
  getTokenSymbol,
  approveVaultRewardTokens,
} from "../../helpers/contracts-actions";
import scenario from "./scenarios/vault-reward-token-strategy.json";
import { getContractInstance } from "../../helpers/helpers";

type ARGUMENTS = {
  addressName?: string;
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
  // TODO: ADD TEST SCENARIOES, ADVANCED PROFILE, STRATEGIES.
  let essentialContracts: CONTRACTS;
  let adapters: CONTRACTS;
  const contracts: CONTRACTS = {};
  let users: { [key: string]: Signer };
  before(async () => {
    try {
      const [owner, admin, user1] = await hre.ethers.getSigners();
      users = { owner, admin, user1 };
      [essentialContracts, adapters] = await setUp(owner);
      assert.isDefined(essentialContracts, "Essential contracts not deployed");
      assert.isDefined(adapters, "Adapters not deployed");
    } catch (error) {
      console.log(error);
    }
  });

  for (let i = 0; i < scenario.vaults.length; i++) {
    describe(`${scenario.vaults[i].name}`, async () => {
      let Vault: Contract;
      const vault = scenario.vaults[i];
      const profile = vault.profile;
      const adaptersName = Object.keys(TypedAdapterStrategies);

      for (let i = 0; i < adaptersName.length; i++) {
        const adapterName = adaptersName[i];
        const strategies = TypedAdapterStrategies[adaptersName[i]];

        for (let i = 0; i < strategies.length; i++) {
          describe(`${strategies[i].strategyName}`, async () => {
            const TOKEN_STRATEGY = strategies[i];
            const tokensHash = getSoliditySHA3Hash(["address[]"], [[TOKENS[TOKEN_STRATEGY.token]]]);
            const rewardTokenAdapterNames = Object.keys(REWARD_TOKENS).map(rewardTokenAdapterName =>
              rewardTokenAdapterName.toLowerCase(),
            );
            let investStrategyHash: any;
            let vaultRewardTokenHash: string;
            let underlyingTokenName: string;
            let underlyingTokenSymbol: string;
            let RewardToken_ERC20Instance: any;

            before(async () => {
              underlyingTokenName = await getTokenName(hre, TOKEN_STRATEGY.token);
              underlyingTokenSymbol = await getTokenSymbol(hre, TOKEN_STRATEGY.token);
              const adapter = adapters[adapterName];
              Vault = await deployVault(
                hre,
                essentialContracts.registry.address,
                essentialContracts.riskManager.address,
                essentialContracts.strategyManager.address,
                essentialContracts.optyMinter.address,
                TOKENS[TOKEN_STRATEGY.token],
                users["owner"],
                users["admin"],
                underlyingTokenName,
                underlyingTokenSymbol,
                profile,
                TESTING_DEPLOYMENT_ONCE,
              );
              if (rewardTokenAdapterNames.includes(adapterName.toLowerCase())) {
                await approveVaultRewardTokens(
                  users["owner"],
                  Vault.address,
                  <string>REWARD_TOKENS[adapterName].tokenAddress,
                  essentialContracts.registry,
                );
                RewardToken_ERC20Instance = await getContractInstance(
                  hre,
                  "ERC20",
                  <string>REWARD_TOKENS[adapterName].tokenAddress,
                );
              }

              await approveLiquidityPoolAndMapAdapter(
                users["owner"],
                essentialContracts.registry,
                adapter.address,
                TOKEN_STRATEGY.strategy[0].contract,
              );

              investStrategyHash = await setBestBasicStrategy(
                TOKEN_STRATEGY.strategy,
                tokensHash,
                essentialContracts.registry,
                essentialContracts.strategyProvider,
                profile,
              );

              const Token_ERC20Instance = await getContractInstance(hre, "ERC20", TOKENS[TOKEN_STRATEGY.token]);
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
                            vaultRewardTokenHash = getSoliditySHA3Hash(
                              ["address[]"],
                              [[Vault.address, REWARD_TOKENS[adapterName].tokenAddress]],
                            );
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
                      } catch (error) {
                        if (action.expect === "success") {
                          assert.isUndefined(error);
                        } else {
                          expect(error.message).to.equal(
                            `VM Exception while processing transaction: revert ${action.message}`,
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
                            TOKENS[TOKEN_STRATEGY.token],
                            users[addressName],
                            BigNumber.from(amount[TOKEN_STRATEGY.token]),
                            timestamp,
                          );
                        }
                      } catch (error) {
                        if (action.expect === "success") {
                          assert.isUndefined(error);
                        } else {
                          expect(error.message).to.equal(
                            `VM Exception while processing transaction: revert ${action.message}`,
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
                      } catch (error) {
                        if (action.expect === "success") {
                          assert.isUndefined(error);
                        } else {
                          expect(error.message).to.equal(
                            `VM Exception while processing transaction: revert ${action.message}`,
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
                          await contracts[action.contract]
                            .connect(users[action.executer])
                            [action.action](investStrategyHash);
                        }
                      } catch (error) {
                        if (action.expect === "success") {
                          assert.isUndefined(error);
                        } else {
                          expect(error.message).to.equal(
                            `VM Exception while processing transaction: revert ${action.message}`,
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
                      } catch (error) {
                        if (action.expect === "success") {
                          assert.isUndefined(error);
                        } else {
                          expect(error.message).to.equal(
                            `VM Exception while processing transaction: revert ${action.message}`,
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
                    case "getVaultRewardTokenStrategy(bytes32)":
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
                      } catch (error) {
                        if (action.expect === "success") {
                          assert.isUndefined(error);
                        } else {
                          expect(error.message).to.equal(
                            `VM Exception while processing transaction: revert ${action.message}`,
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
                          <string>balance == ">0"
                            ? REWARD_TOKENS[adapterName].distributionActive
                              ? assert.isAbove(+reward_token_balance, +"0", "Vault should hold some reward tokens")
                              : expect(+reward_token_balance).to.equal(+"0")
                            : expect(+reward_token_balance).to.equal(+(<string>balance));
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
