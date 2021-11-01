import chai, { expect, assert } from "chai";
import hre from "hardhat";
import { Signer, BigNumber } from "ethers";
import { solidity } from "ethereum-waffle";
import { setUp } from "./setup";
import { CONTRACTS } from "../../helpers/type";
import { VAULT_TOKENS, TESTING_DEPLOYMENT_ONCE, HARVEST_V1_ADAPTER_NAME } from "../../helpers/constants";
import { TypedAdapterStrategies } from "../../helpers/data";
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
import scenarios from "./scenarios/invest-limitation.json";

type ARGUMENTS = {
  amount?: { [key: string]: string };
  type?: number;
  userName?: string;
};
type EXPECTED_ARGUMENTS = {
  [key: string]: string | number;
};
chai.use(solidity);
describe(scenarios.title, () => {
  const MAX_AMOUNT: { [key: string]: BigNumber } = {
    DAI: BigNumber.from("20000000000000000000"),
    USDC: BigNumber.from("20000000"),
    USDT: BigNumber.from("20000000"),
    SLP_WETH_USDC: BigNumber.from("200000000000000"),
  };
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
      [essentialContracts, adapters] = await setUp(users["owner"], Object.values(VAULT_TOKENS));
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
      for (let i = 0; i < adaptersName.length; i++) {
        const adapterName = adaptersName[i];
        const strategies = TypedAdapterStrategies[adaptersName[i]];
        for (let i = 0; i < strategies.length; i++) {
          describe(`${strategies[i].strategyName}`, async () => {
            const strategy = strategies[i];
            const token = VAULT_TOKENS[strategy.token];
            const contracts: CONTRACTS = {};
            let underlyingTokenName: string;
            let underlyingTokenSymbol: string;
            let currentPoolValue: BigNumber;
            let canStake = false;
            before(async () => {
              try {
                const adapter = adapters[adapterName];
                canStake = await adapter.canStake(strategy.strategy[0].contract);
                await approveLiquidityPoolAndMapAdapter(
                  users["owner"],
                  essentialContracts.registry,
                  adapter.address,
                  strategy.strategy[0].contract,
                );
                await setBestStrategy(
                  strategy.strategy,
                  token,
                  essentialContracts.investStrategyRegistry,
                  essentialContracts.strategyProvider,
                  profile,
                  false,
                );
                const timestamp = (await getBlockTimestamp(hre)) * 2;
                await fundWalletToken(
                  hre,
                  VAULT_TOKENS[strategy.token],
                  users["owner"],
                  MAX_AMOUNT[strategy.token],
                  timestamp,
                );

                underlyingTokenName = await getTokenName(hre, strategy.token);
                underlyingTokenSymbol = await getTokenSymbol(hre, strategy.token);
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
                if (adapterName === HARVEST_V1_ADAPTER_NAME) {
                  await addWhiteListForHarvest(hre, Vault.address, users["admin"]);
                }
                await unpauseVault(users["owner"], essentialContracts.registry, Vault.address, true);

                const ERC20Instance = await hre.ethers.getContractAt("ERC20", VAULT_TOKENS[strategy.token]);

                contracts["adapter"] = adapter;

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
                      const maxDepositAmount = amount ? amount[strategy.token] : "0";
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
                      const maxDepositPoolPct = amount ? amount[strategy.token] : "0";
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
                      const maxDepositProtocolPct = amount ? amount[strategy.token] : "0";
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
                          [setAction.action](contracts["vault"].address, amount ? amount[strategy.token] : "0");
                      } else {
                        await expect(
                          contracts[setAction.contract]
                            .connect(users[setAction.executer])
                            [setAction.action](contracts["vault"].address, amount ? amount[strategy.token] : "0"),
                        ).to.be.revertedWith(setAction.message);
                      }
                      break;
                    }
                    case "userDepositRebalance(uint256)":
                    case "userWithdrawRebalance(uint256)": {
                      const { amount }: ARGUMENTS = setAction.args;

                      currentPoolValue = canStake
                        ? await contracts["adapter"].getLiquidityPoolTokenBalanceStake(
                            contracts["vault"].address,
                            strategy.strategy[0].contract,
                          )
                        : await contracts["adapter"].getLiquidityPoolTokenBalance(
                            contracts["vault"].address,
                            token,
                            strategy.strategy[0].contract,
                          );

                      if (setAction.expect === "success") {
                        await contracts[setAction.contract]
                          .connect(users[setAction.executer])
                          [setAction.action](amount ? amount[strategy.token] : "0");
                      } else {
                        await expect(
                          contracts[setAction.contract]
                            .connect(users[setAction.executer])
                            [setAction.action](amount ? amount[strategy.token] : "0"),
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
                      const expectedValue: EXPECTED_ARGUMENTS = getAction.expectedValue;
                      expect(
                        await contracts[getAction.contract][getAction.action](strategy.strategy[0].contract),
                      ).to.equal(+expectedValue[strategy.token]);
                      break;
                    }
                    case "maxDepositProtocolPct()": {
                      const expectedValue: EXPECTED_ARGUMENTS = getAction.expectedValue;
                      expect(+(await contracts[getAction.contract][getAction.action]())).to.equal(
                        +expectedValue[strategy.token],
                      );
                      break;
                    }
                    case "maxDepositAmount(address,address)": {
                      const expectedValue: EXPECTED_ARGUMENTS = getAction.expectedValue;
                      if (["CurveSwapPoolAdapter", "CurveDepositPoolAdapter"].includes(adapterName)) {
                        expect(
                          await contracts[getAction.contract]["maxDepositAmount(address)"](
                            strategy.strategy[0].contract,
                          ),
                        ).to.equal(expectedValue[strategy.token]);
                      } else {
                        expect(
                          await contracts[getAction.contract][getAction.action](
                            strategy.strategy[0].contract,
                            VAULT_TOKENS[strategy.token],
                          ),
                        ).to.equal(expectedValue[strategy.token]);
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
                        const expectedValue: EXPECTED_ARGUMENTS = getAction.expectedValue;
                        expect(await contracts[getAction.contract][getAction.action](address)).to.equal(
                          expectedValue[strategy.token],
                        );
                      }
                      break;
                    }
                    case "balance()": {
                      const balance = await contracts[getAction.contract][getAction.action]();
                      const expectedValue: EXPECTED_ARGUMENTS = getAction.expectedValue;
                      expect(balance).to.equal(expectedValue[strategy.token]);

                      if (balance > 0) {
                        await contracts["vault"].userWithdrawAllRebalance();
                      }
                      break;
                    }
                    case "getLiquidityPoolTokenBalance(address,address,address)": {
                      const expectedValue: EXPECTED_ARGUMENTS = getAction.expectedValue;
                      const value = canStake
                        ? await contracts["adapter"].getLiquidityPoolTokenBalanceStake(
                            contracts["vault"].address,
                            strategy.strategy[0].contract,
                          )
                        : await contracts["adapter"].getLiquidityPoolTokenBalance(
                            contracts["vault"].address,
                            token,
                            strategy.strategy[0].contract,
                          );
                      if (expectedValue[strategy.token] === "<") {
                        expect(value.sub(currentPoolValue)).to.lt(0);
                      } else if (expectedValue[strategy.token] === "=") {
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
