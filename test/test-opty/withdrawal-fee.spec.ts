import { expect, assert } from "chai";
import hre from "hardhat";
import { Contract, Signer, BigNumber } from "ethers";
import { setUp } from "./setup";
import { CONTRACTS } from "../../helpers/type";
import { TOKENS, TESTING_DEPLOYMENT_ONCE, ADDRESS_ZERO } from "../../helpers/constants";
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
  unpauseVault,
} from "../../helpers/contracts-actions";
import scenario from "./scenarios/withdrawal-fee.json";

describe(scenario.title, () => {
  // TODO: ADD TEST SCENARIOES, ADVANCED PROFILE, STRATEGIES.
  const token = "DAI";
  const MAX_AMOUNT = "2000000000000000000";
  let essentialContracts: CONTRACTS;
  let adapters: CONTRACTS;
  const contracts: CONTRACTS = {};
  const EOA = "0xBc3dBFf7ec4f650e736b261C3E20335070D2b81B";
  let users: { [key: string]: Signer };
  before(async () => {
    try {
      const [owner, admin, user1, user2] = await hre.ethers.getSigners();
      users = { owner, admin, user1, user2 };
      [essentialContracts, adapters] = await setUp(owner);
      assert.isDefined(essentialContracts, "Essential contracts not deployed");
      assert.isDefined(adapters, "Adapters not deployed");
      contracts["registry"] = essentialContracts["registry"];
    } catch (error) {
      console.log(error);
    }
  });

  for (let i = 0; i < scenario.vaults.length; i++) {
    describe(`${scenario.vaults[i].name}`, async () => {
      let Vault: Contract;
      let underlyingTokenName: string;
      let underlyingTokenSymbol: string;
      const vault = scenario.vaults[i];
      const profile = vault.profile;
      const TOKEN_STRATEGY = TypedAdapterStrategies["CompoundAdapter"][0];
      let ERC20Instance: Contract;

      before(async () => {
        await approveLiquidityPoolAndMapAdapter(
          users["owner"],
          essentialContracts.registry,
          adapters["CompoundAdapter"].address,
          TOKEN_STRATEGY.strategy[0].contract,
        );
        await setBestStrategy(
          TOKEN_STRATEGY.strategy,
          TOKENS[token],
          essentialContracts.vaultStepInvestStrategyDefinitionRegistry,
          essentialContracts.strategyProvider,
          "RP1",
          false,
        );
        const timestamp = (await getBlockTimestamp(hre)) * 2;
        await fundWalletToken(hre, TOKENS[token], users["owner"], BigNumber.from(MAX_AMOUNT), timestamp);
      });
      beforeEach(async () => {
        try {
          underlyingTokenName = await getTokenName(hre, token);
          underlyingTokenSymbol = await getTokenSymbol(hre, token);
          Vault = await deployVault(
            hre,
            essentialContracts.registry.address,
            TOKENS[token],
            users["owner"],
            users["admin"],
            underlyingTokenName,
            underlyingTokenSymbol,
            profile,
            TESTING_DEPLOYMENT_ONCE,
          );
          await unpauseVault(users["owner"], essentialContracts.registry, Vault.address, true);

          ERC20Instance = await hre.ethers.getContractAt("ERC20", TOKENS[token]);
          contracts["vault"] = Vault;
          contracts["erc20"] = ERC20Instance;
        } catch (error) {
          console.error(error);
        }
      });

      for (let i = 0; i < vault.stories.length; i++) {
        const story = vault.stories[i];
        it(story.description, async () => {
          for (let j = 0; j < story.activities.length; j++) {
            const activities = story.activities[j];
            for (let k = 0; k < activities.setActions.length; k++) {
              const action = activities.setActions[k];
              switch (action.action) {
                case "setFinanceOperator(address)": {
                  const { newFinanceOperator } = <any>action.args;
                  const tempNewFinanceOperatorrAddr = await users[newFinanceOperator].getAddress();
                  if (newFinanceOperator) {
                    if (action.expect === "success") {
                      await contracts[action.contract]
                        .connect(users[action.executer])
                        [action.action](tempNewFinanceOperatorrAddr);
                    } else {
                      await expect(
                        contracts[action.contract]
                          .connect(users[action.executer])
                          [action.action](tempNewFinanceOperatorrAddr),
                      ).to.be.revertedWith(action.message);
                    }
                  }
                  assert.isDefined(newFinanceOperator, `args is wrong in ${action.action} testcase`);
                  break;
                }
                case "fundWallet": {
                  const { addressName, amount } = <any>action.args;
                  try {
                    if (addressName && amount) {
                      const timestamp = (await getBlockTimestamp(hre)) * 2;
                      await fundWalletToken(hre, TOKENS[token], users[addressName], BigNumber.from(amount), timestamp);
                    }
                  } catch (error) {
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
                case "setTreasuryShares(address,(address,uint256)[])": {
                  const { addressName, treasuryAccountsWithShares } = <any>action.args;
                  try {
                    if (treasuryAccountsWithShares) {
                      await contracts[action.contract]
                        .connect(users[action.executer])
                        [action.action](
                          addressName.toString().toLowerCase() == "zero"
                            ? ADDRESS_ZERO
                            : addressName.toString().toLowerCase() == "eoa"
                            ? EOA
                            : contracts[addressName.toString().toLowerCase()].address,
                          treasuryAccountsWithShares,
                        );
                    }
                  } catch (error) {
                    if (action.expect === "success") {
                      assert.isUndefined(error);
                    } else {
                      expect(error.message).to.equal(
                        `VM Exception while processing transaction: reverted with reason string '${action.message}'`,
                      );
                    }
                  }
                  assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
                  assert.isDefined(treasuryAccountsWithShares, `args is wrong in ${action.action} testcase`);
                  break;
                }
                case "setWithdrawalFee(address,uint256)": {
                  const { addressName, fee } = <any>action.args;
                  try {
                    if (fee) {
                      await contracts[action.contract]
                        .connect(users[action.executer])
                        [action.action](
                          addressName.toString().toLowerCase() == "zero"
                            ? ADDRESS_ZERO
                            : addressName.toString().toLowerCase() == "eoa"
                            ? EOA
                            : contracts[addressName.toString().toLowerCase()].address,
                          fee,
                        );
                    }
                  } catch (error) {
                    if (action.expect === "success") {
                      assert.isUndefined(error);
                    } else {
                      expect(error.message).to.equal(
                        `VM Exception while processing transaction: reverted with reason string '${action.message}'`,
                      );
                    }
                  }
                  assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
                  assert.isDefined(fee, `args is wrong in ${action.action} testcase`);
                  break;
                }
                case "approve(address,uint256)":
                case "transfer(address,uint256)": {
                  const { addressName, amount } = <any>action.args;
                  try {
                    if (addressName && amount) {
                      let address: string;
                      if (action.action === "approve(address,uint256)") {
                        address = contracts[addressName].address;
                      } else {
                        address = await users[addressName].getAddress();
                      }
                      await contracts[action.contract].connect(users[action.executer])[action.action](address, amount);
                    }
                  } catch (error) {
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
                case "userDepositRebalance(uint256)":
                case "userWithdrawRebalance(uint256)": {
                  const { amount } = <any>action.args;

                  if (action.action === "userWithdrawRebalance(uint256)") {
                    await delay(200);
                  }
                  try {
                    if (amount) {
                      await contracts[action.contract].connect(users[action.executer])[action.action](amount);
                    }
                  } catch (error) {
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
            for (let k = 0; k < activities.getActions.length; k++) {
              const action = activities.getActions[k];
              switch (action.action) {
                case "getTreasuryShares(address)": {
                  const { addressName } = <any>action.args;
                  const treasuryShares = await contracts[action.contract][action.action](
                    contracts[addressName.toString().toLowerCase()].address,
                  );
                  const expectedValues = Array.isArray(action.expectedValue) ? action.expectedValue : [];
                  expect(+treasuryShares.length).to.equal(+expectedValues.length);
                  for (let i = 0; i < treasuryShares.length; i++) {
                    expect([treasuryShares[i].treasury, +treasuryShares[i].share]).to.have.members(expectedValues[i]);
                  }
                  assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
                  break;
                }
                case "vaultToVaultConfiguration(address)": {
                  const { addressName } = <any>action.args;
                  const value = await contracts[action.contract][action.action](
                    contracts[addressName.toString().toLowerCase()].address,
                  );
                  expect(+value.withdrawalFee).to.equal(+action.expectedValue);
                  assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
                  break;
                }
                case "balanceOf(address)": {
                  const { address, addressName } = <any>action.args;
                  if (address) {
                    const value = await contracts[action.contract][action.action](address);
                    expect(+value).to.gte(+action.expectedValue);
                  } else if (addressName) {
                    const address = users[addressName].getAddress();
                    const value = await contracts[action.contract][action.action](address);
                    expect(+value).to.gte(+action.expectedValue);
                  }
                  break;
                }
              }
            }
          }
        }).timeout(100000);
      }
    });
  }
});
