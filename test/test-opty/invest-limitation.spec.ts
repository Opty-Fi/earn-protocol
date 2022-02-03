import chai, { expect, assert } from "chai";
import hre, { ethers } from "hardhat";
import { Signer, BigNumber } from "ethers";
import { solidity } from "ethereum-waffle";
import { setUp } from "./setup";
import { CONTRACTS } from "../../helpers/type";
import { retrieveAdapterFromStrategyName } from "../../helpers/helpers";
import { to_10powNumber_BN } from "../../helpers/utils";
import { TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants/utils";
import { VAULT_TOKENS } from "../../helpers/constants/tokens";
import { HARVEST_V1_ADAPTER_NAME, CONVEX_ADAPTER_NAME } from "../../helpers/constants/adapters";
import { TypedTokens } from "../../helpers/data";
import { TypedAdapterStrategies } from "../../helpers/data/adapter-with-strategies";
import { deployVault } from "../../helpers/contracts-deployments";
import {
  setBestStrategy,
  approveLiquidityPoolAndMapAdapter,
  fundWalletToken,
  getBlockTimestamp,
  unpauseVault,
  addWhiteListForHarvest,
} from "../../helpers/contracts-actions";
import scenarios from "./scenarios/invest-limitation.json";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";

type ARGUMENTS = {
  amount?: string;
  type?: number;
  userName?: string;
};
type EXPECTED_ARGUMENTS = {
  [key: string]: string | number;
};
chai.use(solidity);
describe(scenarios.title, () => {
  let essentialContracts: CONTRACTS;
  let adapters: CONTRACTS;
  let users: { [key: string]: Signer };
  const userAddresses: { [key: string]: string } = {};

  before(async () => {
    try {
      const [owner, admin] = await hre.ethers.getSigners();
      const riskOperator = owner;
      users = { owner, admin, riskOperator };
      userAddresses["owner"] = await users.owner.getAddress();
      userAddresses["admin"] = await users.admin.getAddress();
      userAddresses["riskOperator"] = await users.riskOperator.getAddress();
      [essentialContracts, adapters] = await setUp(
        users["owner"],
        Object.values(VAULT_TOKENS).map(token => token.address),
      );
      assert.isDefined(essentialContracts, "Essential contracts not deployed");
      assert.isDefined(adapters, "Adapters not deployed");
    } catch (error: any) {
      console.log(error);
    }
  });

  for (let i = 0; i < scenarios.vaults.length; i++) {
    describe(`${scenarios.vaults[i].name}`, async () => {
      const vault = scenarios.vaults[i];
      const stories = vault.stories;
      const profile = vault.riskProfileCode;
      const adaptersName = Object.keys(TypedAdapterStrategies);
      let usedAdapters: string[] = [];
      for (let i = 0; i < adaptersName.length; i++) {
        const strategies = TypedAdapterStrategies[adaptersName[i]];
        for (let i = 0; i < strategies.length; i++) {
          describe(`${strategies[i].strategyName}`, async () => {
            const strategy = strategies[i];
            const token = strategy.token;
            const contracts: CONTRACTS = {};
            let underlyingTokenName: string;
            let underlyingTokenSymbol: string;
            let decimals: string;
            let currentPoolValue: BigNumber;
            let canStake = false;
            const MAX_AMOUNT = token === TypedTokens["SLP_WETH_USDC"] ? BigNumber.from("20") : BigNumber.from("2000");
            const strategyLength = strategies[i].strategy.length;
            before(async () => {
              try {
                const ERC20Instance = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, token);
                underlyingTokenName = await ERC20Instance.name();
                underlyingTokenSymbol = await ERC20Instance.symbol();
                // decrease amount if token = SLP_WETH_USDC
                decimals = token === TypedTokens["SLP_WETH_USDC"] ? "6" : (await ERC20Instance.decimals()).toString();

                usedAdapters = retrieveAdapterFromStrategyName(strategy.strategyName);
                const firstAdapter = adapters[usedAdapters[0]];
                const lastAdapter = adapters[usedAdapters[strategyLength - 1]];
                canStake = await lastAdapter.canStake(strategy.strategy[0].contract);

                await setBestStrategy(
                  strategy.strategy,
                  users["owner"],
                  token,
                  essentialContracts.investStrategyRegistry,
                  essentialContracts.strategyProvider,
                  profile,
                  false,
                );
                const timestamp = (await getBlockTimestamp(hre)) * 2;
                await fundWalletToken(
                  hre,
                  token,
                  users["owner"],
                  MAX_AMOUNT.mul(to_10powNumber_BN(decimals)),
                  timestamp,
                );

                const Vault = await deployVault(
                  hre,
                  essentialContracts.registry.address,
                  token,
                  users["owner"],
                  users["admin"],
                  underlyingTokenName,
                  underlyingTokenSymbol,
                  profile,
                  TESTING_DEPLOYMENT_ONCE,
                );

                for (let i = 0; i < strategy.strategy.length; i++) {
                  await approveLiquidityPoolAndMapAdapter(
                    users["owner"],
                    essentialContracts.registry,
                    adapters[usedAdapters[i]].address,
                    strategy.strategy[i].contract,
                  );
                  if (usedAdapters[i] === "ConvexFinanceAdapter") {
                    await adapters[usedAdapters[i]].setPoolCoinData(strategy.strategy[i].contract);
                  }
                  if (usedAdapters[i] === HARVEST_V1_ADAPTER_NAME) {
                    await addWhiteListForHarvest(hre, Vault.address, users["admin"]);
                  }
                }
                await essentialContracts.registry.setQueueCap(Vault.address, ethers.constants.MaxUint256);
                await essentialContracts.registry.setTotalValueLockedLimitInUnderlying(
                  Vault.address,
                  ethers.constants.MaxUint256,
                );

                await unpauseVault(users["owner"], essentialContracts.registry, Vault.address, true);

                contracts["firstAdapter"] = firstAdapter;

                contracts["lastAdapter"] = lastAdapter;

                contracts["erc20"] = ERC20Instance;

                contracts["vault"] = Vault;
              } catch (error: any) {
                console.error(error);
              }
            });

            beforeEach(async () => {
              currentPoolValue = BigNumber.from("0");
            });

            for (let i = 0; i < stories.length; i++) {
              it(stories[i].description, async () => {
                const story = stories[i];
                for (let i = 0; i < story.setActions.length; i++) {
                  const setAction = story.setActions[i];
                  switch (setAction.action) {
                    case "setMaxDepositProtocolMode(uint8)": {
                      const { type }: ARGUMENTS = setAction.args;
                      if (setAction.expect === "success") {
                        await expect(
                          contracts[setAction.contract].connect(users[setAction.executer])[setAction.action](type),
                        )
                          .to.emit(contracts[setAction.contract], "LogMaxDepositProtocolMode")
                          .withArgs(type, userAddresses[setAction.executer]);
                      } else {
                        await expect(
                          contracts[setAction.contract].connect(users[setAction.executer])[setAction.action](type),
                        ).to.be.revertedWith(setAction.message);
                      }
                      break;
                    }
                    case "setMaxDepositAmount(address,address,uint256)": {
                      const { amount }: ARGUMENTS = setAction.args;
                      const maxDepositAmount = amount
                        ? BigNumber.from(amount).mul(
                            to_10powNumber_BN(
                              ["CurveSwapPoolAdapter", "CurveDepositPoolAdapter"].includes(usedAdapters[0])
                                ? 18
                                : decimals,
                            ),
                          )
                        : "0";
                      if (setAction.expect === "success") {
                        await expect(
                          contracts[setAction.contract]
                            .connect(users[setAction.executer])
                            [setAction.action](strategy.strategy[0].contract, token, maxDepositAmount),
                        )
                          .to.emit(contracts[setAction.contract], "LogMaxDepositAmount")
                          .withArgs(maxDepositAmount, userAddresses[setAction.executer]);
                      } else {
                        await expect(
                          contracts[setAction.contract]
                            .connect(users[setAction.executer])
                            [setAction.action](strategy.strategy[0].contract, token, maxDepositAmount),
                        ).to.be.revertedWith(setAction.message);
                      }
                      break;
                    }
                    case "setMaxDepositPoolPct(address,uint256)": {
                      const { amount }: ARGUMENTS = setAction.args;
                      const maxDepositPoolPct = amount ? BigNumber.from(amount).mul(to_10powNumber_BN(decimals)) : "0";
                      if (setAction.expect === "success") {
                        await expect(
                          contracts[setAction.contract]
                            .connect(users[setAction.executer])
                            [setAction.action](strategy.strategy[0].contract, maxDepositPoolPct),
                        )
                          .to.emit(contracts[setAction.contract], "LogMaxDepositPoolPct")
                          .withArgs(maxDepositPoolPct, userAddresses[setAction.executer]);
                      } else {
                        await expect(
                          contracts[setAction.contract]
                            .connect(users[setAction.executer])
                            [setAction.action](strategy.strategy[0].contract, maxDepositPoolPct),
                        ).to.be.revertedWith(setAction.message);
                      }
                      break;
                    }
                    case "setMaxDepositProtocolPct(uint256)": {
                      const { amount }: ARGUMENTS = setAction.args;
                      const maxDepositProtocolPct = amount
                        ? BigNumber.from(amount).mul(to_10powNumber_BN(decimals))
                        : "0";
                      if (setAction.expect === "success") {
                        await expect(
                          contracts[setAction.contract]
                            .connect(users[setAction.executer])
                            [setAction.action](maxDepositProtocolPct),
                        )
                          .to.emit(contracts[setAction.contract], "LogMaxDepositProtocolPct")
                          .withArgs(maxDepositProtocolPct, userAddresses[setAction.executer]);
                      } else {
                        await expect(
                          contracts[setAction.contract]
                            .connect(users[setAction.executer])
                            [setAction.action](maxDepositProtocolPct),
                        ).to.be.revertedWith(setAction.message);
                      }
                      break;
                    }
                    case "approve(address,uint256)": {
                      const { amount }: ARGUMENTS = setAction.args;
                      if (setAction.expect === "success") {
                        await contracts[setAction.contract]
                          .connect(users[setAction.executer])
                          [setAction.action](
                            contracts["vault"].address,
                            amount ? BigNumber.from(amount).mul(to_10powNumber_BN(decimals)) : "0",
                          );
                      } else {
                        await expect(
                          contracts[setAction.contract]
                            .connect(users[setAction.executer])
                            [setAction.action](
                              contracts["vault"].address,
                              amount ? BigNumber.from(amount).mul(to_10powNumber_BN(decimals)) : "0",
                            ),
                        ).to.be.revertedWith(setAction.message);
                      }
                      break;
                    }
                    case "userDepositRebalance(uint256)":
                    case "userWithdrawRebalance(uint256)": {
                      const { amount }: ARGUMENTS = setAction.args;

                      currentPoolValue = canStake
                        ? await contracts["lastAdapter"].getLiquidityPoolTokenBalanceStake(
                            contracts["vault"].address,
                            strategy.strategy[strategyLength - 1].contract,
                          )
                        : await contracts["lastAdapter"].getLiquidityPoolTokenBalance(
                            contracts["vault"].address,
                            token,
                            strategy.strategy[strategyLength - 1].contract,
                          );

                      if (setAction.expect === "success") {
                        await contracts[setAction.contract]
                          .connect(users[setAction.executer])
                          [setAction.action](amount ? BigNumber.from(amount).mul(to_10powNumber_BN(decimals)) : "0");
                      } else {
                        await expect(
                          contracts[setAction.contract]
                            .connect(users[setAction.executer])
                            [setAction.action](amount ? BigNumber.from(amount).mul(to_10powNumber_BN(decimals)) : "0"),
                        ).to.be.revertedWith(setAction.message);
                      }
                      break;
                    }
                    default:
                      break;
                  }
                }
                for (let i = 0; i < story.getActions.length; i++) {
                  const getAction = story.getActions[i];
                  switch (getAction.action) {
                    case "maxDepositPoolPct(address)": {
                      expect(
                        await contracts[getAction.contract][getAction.action](strategy.strategy[0].contract),
                      ).to.equal(BigNumber.from(getAction.expectedValue).mul(to_10powNumber_BN(decimals)));
                      break;
                    }
                    case "maxDepositProtocolPct()": {
                      expect(await contracts[getAction.contract][getAction.action]()).to.equal(
                        BigNumber.from(getAction.expectedValue).mul(to_10powNumber_BN(decimals)),
                      );
                      break;
                    }
                    case "maxDepositAmount(address,address)": {
                      if (["CurveSwapPoolAdapter", "CurveDepositPoolAdapter"].includes(usedAdapters[0])) {
                        expect(
                          await contracts[getAction.contract]["maxDepositAmount(address)"](
                            strategy.strategy[0].contract,
                          ),
                        ).to.equal(BigNumber.from(getAction.expectedValue).mul(to_10powNumber_BN(18)));
                      } else {
                        expect(
                          await contracts[getAction.contract][getAction.action](strategy.strategy[0].contract, token),
                        ).to.equal(BigNumber.from(getAction.expectedValue).mul(to_10powNumber_BN(decimals)));
                      }

                      break;
                    }
                    case "maxDepositProtocolMode()": {
                      const expectedValue: any = getAction.expectedValue;
                      expect(await contracts[getAction.contract][getAction.action]()).to.equal(expectedValue.type);
                      break;
                    }
                    case "balanceOf(address)": {
                      const { userName }: ARGUMENTS = getAction.args;
                      if (userName) {
                        const address = await users[userName].getAddress();
                        expect(await contracts[getAction.contract][getAction.action](address)).to.equal(
                          BigNumber.from(getAction.expectedValue).mul(to_10powNumber_BN(decimals)),
                        );
                      }
                      break;
                    }
                    case "balance()": {
                      const balance = await contracts[getAction.contract][getAction.action]();
                      expect(balance).to.equal(
                        BigNumber.from(getAction.expectedValue).mul(to_10powNumber_BN(decimals)),
                      );

                      if (balance > 0) {
                        await contracts["vault"].userWithdrawAllRebalance();
                      }
                      break;
                    }
                    case "getLiquidityPoolTokenBalance(address,address,address)": {
                      const value = canStake
                        ? await contracts["lastAdapter"].getLiquidityPoolTokenBalanceStake(
                            contracts["vault"].address,
                            strategy.strategy[strategyLength - 1].contract,
                          )
                        : await contracts["lastAdapter"].getLiquidityPoolTokenBalance(
                            contracts["vault"].address,
                            token,
                            strategy.strategy[strategyLength - 1].contract,
                          );
                      if (getAction.expectedValue === "<") {
                        expect(value.sub(currentPoolValue)).to.lt(0);
                      } else if (getAction.expectedValue === "=") {
                        expect(value.sub(currentPoolValue)).to.equal(0);
                      } else {
                        expect(value.sub(currentPoolValue)).to.gt(0);
                      }
                      break;
                    }
                  }
                }
                const currentBalance = await contracts["vault"].balanceOf(await users["owner"].getAddress());
                if (currentBalance > 0) {
                  await contracts["vault"].userWithdrawAllRebalance();
                }
              }).timeout(150000);
            }
          });
        }
      }
    });
  }
});
