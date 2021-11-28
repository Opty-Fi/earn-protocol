import { expect, assert } from "chai";
import hre from "hardhat";
import { Contract, Signer, BigNumber } from "ethers";
import { setUp } from "./setup";
import { CONTRACTS, STRATEGY_DATA } from "../../helpers/type";
import { TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants/utils";
import { VAULT_TOKENS, REWARD_TOKENS } from "../../helpers/constants/tokens";
import { ADDRESS_ZERO } from "../../helpers/constants/utils";
import { HARVEST_V1_ADAPTER_NAME } from "../../helpers/constants/adapters";
import { TypedTokenStrategies, TypedTokens } from "../../helpers/data";
import { executeFunc, getDefaultFundAmountInDecimal } from "../../helpers/helpers";
import { deployAlphaVault } from "../../helpers/contracts-deployments";
import {
  setBestStrategy,
  approveLiquidityPoolAndMapAdapter,
  fundWalletToken,
  getBlockTimestamp,
  unpauseVault,
  addWhiteListForHarvest,
} from "../../helpers/contracts-actions";
import testAlphaVaultScenario from "./scenarios/test-alpha-vault.json";

type ARGUMENTS = {
  contractName?: string;
  limitStatus?: boolean;
  value?: number;
  token?: string;
  user?: number;
  whitelisted?: boolean;
};

describe(testAlphaVaultScenario.title, () => {
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

  let AlphaVault: Contract;
  const vault = testAlphaVaultScenario.vaults[0];
  describe("USDC Alpha Vault", async () => {
    const TOKEN_STRATEGY = TypedTokenStrategies["USDC"][0];
    const tokenAddress = VAULT_TOKENS["USDC"].address;
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

        AlphaVault = await deployAlphaVault(
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
            await addWhiteListForHarvest(hre, AlphaVault.address, users[1]);
          }
          await unpauseVault(users[0], essentialContracts.registry, AlphaVault.address, true);
          if (
            rewardTokenAdapterNames.includes(adapterNames[i].toLowerCase()) &&
            !(await essentialContracts.registry.tokens(REWARD_TOKENS[adapterNames[i]].tokenAddress.toString()))
          ) {
            await executeFunc(essentialContracts.registry, users[0], "approveToken(address[])", [
              [AlphaVault.address, REWARD_TOKENS[adapterNames[i]].tokenAddress.toString()],
            ]);
            await executeFunc(essentialContracts.registry, users[0], "setTokensHashToTokens(address[])", [
              [AlphaVault.address, REWARD_TOKENS[adapterNames[i]].tokenAddress.toString()],
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

        contracts["vault"] = AlphaVault;
        contracts["chi"] = CHIInstance;
        contracts["erc20"] = Token_ERC20Instance;
        contracts["registry"] = essentialContracts.registry;
      });
      for (let i = 0; i < vault.stories.length; i++) {
        const story = vault.stories[i];
        it(story.description, async function () {
          for (let i = 0; i < story.setActions.length; i++) {
            const action = story.setActions[i];
            switch (action.action) {
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
              case "setLimitStatus(address,bool)": {
                const { limitStatus } = action.args as ARGUMENTS;
                if (limitStatus) {
                  if (action.expect == "success") {
                    await contracts[action.contract]
                      .connect(users[action.executor])
                      [action.action](contracts["vault"].address, limitStatus);
                  } else {
                    await expect(
                      contracts[action.contract]
                        .connect(users[action.executor])
                        [action.action](contracts["vault"].address, limitStatus),
                    ).to.be.revertedWith(action.message);
                  }
                }
                assert.isDefined(limitStatus, `args is wrong in ${action.action} testcase`);
                break;
              }
              case "setWhitelisted(address,bool)": {
                const { user, whitelisted } = action.args as ARGUMENTS;
                if (user && whitelisted) {
                  if (action.expect == "success") {
                    await contracts[action.contract]
                      .connect(users[action.executor])
                      [action.action](await users[user].getAddress(), whitelisted);
                  } else {
                    await expect(
                      contracts[action.contract]
                        .connect(users[action.executor])
                        [action.action](await users[user].getAddress(), whitelisted),
                    ).to.be.revertedWith(action.message);
                  }
                }
                assert.isDefined(user, `args is wrong in ${action.action} testcase`);
                assert.isDefined(whitelisted, `args is wrong in ${action.action} testcase`);
                break;
              }
              case "setUserDepositCap(address,uint256)":
              case "setMinimumDepositAmount(address,uint256)":
              case "setQueueCap(address,uint256)": {
                const { value } = action.args as ARGUMENTS;
                if (value) {
                  if (action.expect == "success") {
                    await contracts[action.contract]
                      .connect(users[action.executor])
                      [action.action](contracts["vault"].address, value);
                  } else {
                    await expect(
                      contracts[action.contract]
                        .connect(users[action.executor])
                        [action.action](contracts["vault"].address, value),
                    ).to.be.revertedWith(action.message);
                  }
                }
                assert.isDefined(value, `args is wrong in ${action.action} testcase`);
                break;
              }
              case "approve(address,uint256)": {
                const { contractName } = action.args as ARGUMENTS;
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
              case "userDepositRebalance(uint256)":
              case "userDeposit(uint256)": {
                const { value } = action.args as ARGUMENTS;
                if (value) {
                  investStrategyHash = await setBestStrategy(
                    strategySteps,
                    users[0],
                    tokenAddress,
                    essentialContracts.investStrategyRegistry,
                    essentialContracts.strategyProvider,
                    1,
                    false,
                  );
                  if (action.expect == "success") {
                    await contracts[action.contract].connect(users[action.executor])[action.action](value);
                  } else {
                    await expect(
                      contracts[action.contract].connect(users[action.executor])[action.action](value),
                    ).to.be.revertedWith(action.message);
                  }
                }
                break;
              }
            }
          }
          for (let i = 0; i < story.getActions.length; i++) {
            const action = story.getActions[i];
            switch (action.action) {
              case "totalDeposits(address)":
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
            }
          }
          // for (let i = 0; i < story.cleanActions.length; i++) {
          //   const action = story.cleanActions[i];
          //   switch (action.action) {
          //     case "resetStrategy": {
          //       const tokenHash = generateTokenHash([tokenAddress]);
          //       await essentialContracts.strategyProvider
          //         .connect(users[0])
          //         .setBestStrategy(1, tokenHash, ZERO_BYTES32);
          //       const bestStrategy = await essentialContracts.strategyProvider.rpToTokenToBestStrategy(
          //         1,
          //         tokenHash,
          //       );
          //       expect(bestStrategy).to.be.eq(ZERO_BYTES32);
          //       break;
          //     }
          //     case "approve(address,uint256)": {
          //       const { contractName, user }: ARGUMENTS = action.args;

          //       if (contractName && user) {
          //         const userAddr = await users[user].getAddress();
          //         const value = await contracts[action.contract].balanceOf(userAddr);
          //         await contracts[action.contract]
          //           .connect(users[user])
          //           [action.action](contracts[contractName].address, value);
          //       }
          //       assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
          //       assert.isDefined(user, `args is wrong in ${action.action} testcase`);
          //       break;
          //     }
          //     case "userWithdrawAllRebalance()": {
          //       const { user } = action.args as ARGUMENTS;
          //       if (user) {
          //         const userAddr = await users[user].getAddress();
          //         await contracts[action.contract].connect(users[user])[action.action]();
          //         expect(await contracts[action.contract].balanceOf(userAddr)).to.be.eq(0);
          //       }
          //       assert.isDefined(user, `args is wrong in ${action.action} testcase`);
          //       break;
          //     }
          //     case "rebalance()": {
          //       await contracts[action.contract].connect(users[3])[action.action]();
          //       expect(await contracts[action.contract].pendingDeposits(await users[2].getAddress())).to.be.eq(0);
          //       break;
          //     }
          //   }
          // }
        }).timeout(100000);
      }
    });
  });
});
