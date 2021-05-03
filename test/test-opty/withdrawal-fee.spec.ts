import { expect, assert } from "chai";
import hre from "hardhat";
import { Contract, Signer, BigNumber } from "ethers";
import { setUp } from "./setup";
import { CONTRACTS } from "../../helpers/type";
import { TOKENS, TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants";
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
} from "../../helpers/contracts-actions";
import scenario from "./scenarios/withdrawal-fee.json";

type ARGUMENTS = {
  address?: string;
  addressName?: string;
  fee?: string;
  amount?: string;
};

describe(scenario.title, () => {
  // TODO: ADD TEST SCENARIOES, ADVANCED PROFILE, STRATEGIES.
  const token = "DAI";
  const MAX_AMOUNT = "2000000000000000000";
  let essentialContracts: CONTRACTS;
  let adapters: CONTRACTS;
  const contracts: CONTRACTS = {};
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
      const tokensHash = getSoliditySHA3Hash(["address[]"], [[TOKENS[token]]]);
      let ERC20Instance: Contract;

      before(async () => {
        await approveLiquidityPoolAndMapAdapter(
          users["owner"],
          essentialContracts.registry,
          adapters["CompoundAdapter"].address,
          TOKEN_STRATEGY.strategy[0].contract,
        );
        await setBestBasicStrategy(
          TOKEN_STRATEGY.strategy,
          tokensHash,
          essentialContracts.registry,
          essentialContracts.strategyProvider,
          "RP1",
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
            essentialContracts.riskManager.address,
            essentialContracts.strategyManager.address,
            essentialContracts.optyMinter.address,
            TOKENS[token],
            users["owner"],
            users["admin"],
            underlyingTokenName,
            underlyingTokenSymbol,
            profile,
            TESTING_DEPLOYMENT_ONCE,
          );

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
          for (let j = 0; j < story.setActions.length; j++) {
            const action = story.setActions[j];
            switch (action.action) {
              case "fundWallet": {
                const { addressName, amount }: ARGUMENTS = action.args;
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
                      `VM Exception while processing transaction: revert ${action.message}`,
                    );
                  }
                }
                assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
                assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
                break;
              }
              case "setTreasury(address)": {
                const { address }: ARGUMENTS = action.args;
                try {
                  if (address) {
                    await contracts[action.contract].connect(users[action.executer])[action.action](address);
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

                assert.isDefined(address, `args is wrong in ${action.action} testcase`);
                break;
              }
              case "setWithdrawalFee(uint256)": {
                const { fee }: ARGUMENTS = action.args;
                try {
                  if (fee) {
                    await contracts[action.contract].connect(users[action.executer])[action.action](fee);
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
                assert.isDefined(fee, `args is wrong in ${action.action} testcase`);
                break;
              }
              case "approve(address,uint256)":
              case "transfer(address,uint256)": {
                const { addressName, amount }: ARGUMENTS = action.args;
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
                      `VM Exception while processing transaction: revert ${action.message}`,
                    );
                  }
                }
                assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
                assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
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
                    await contracts[action.contract].connect(users[action.executer])[action.action](amount);
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
              case "treasury()": {
                const address = await contracts[action.contract][action.action]();
                expect(address).to.equal(action.expectedValue);
                break;
              }
              case "withdrawalFee()": {
                const address = await contracts[action.contract][action.action]();
                expect(address).to.equal(action.expectedValue);
                break;
              }
              case "balanceOf(address)": {
                const { address, addressName }: ARGUMENTS = action.args;
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
        }).timeout(100000);
      }
    });
  }
});
