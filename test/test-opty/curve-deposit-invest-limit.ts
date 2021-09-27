import { expect, assert } from "chai";
import hre from "hardhat";
import { Signer, BigNumber } from "ethers";
import { setUp } from "./setup";
import { CONTRACTS } from "../../helpers/type";
import { TOKENS, TESTING_DEPLOYMENT_ONCE, ADDRESS_ZERO } from "../../helpers/constants";
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
} from "../../helpers/contracts-actions";
import scenarios from "./scenarios/curve-deposit-invest-limitation.json";
type ARGUMENTS = {
  amount?: { [key: string]: string };
  type?: number;
  userName?: string;
};
type EXPECTED_ARGUMENTS = {
  [key: string]: string;
};
describe(scenarios.title, () => {
  const MAX_AMOUNT: { [key: string]: BigNumber } = {
    DAI: BigNumber.from("20000000000000000000"),
    USDC: BigNumber.from("20000000"),
    USDT: BigNumber.from("20000000"),
  };
  let essentialContracts: CONTRACTS;
  let adapters: CONTRACTS;
  let users: { [key: string]: Signer };

  before(async () => {
    try {
      const [owner, admin] = await hre.ethers.getSigners();
      users = { owner, admin };
      [essentialContracts, adapters] = await setUp(users["owner"]);
      assert.isDefined(essentialContracts, "Essential contracts not deployed");
      assert.isDefined(adapters, "Adapters not deployed");
    } catch (error) {
      console.log(error);
    }
  });

  for (let i = 0; i < scenarios.vaults.length; i++) {
    describe(`${scenarios.vaults[i].name}`, async () => {
      const vault = scenarios.vaults[i];
      const stories = vault.stories;
      const profile = vault.profile;
      const adaptersName = Object.keys(TypedAdapterStrategies).filter(strategy =>
        ["CurveDepositPoolAdapter"].includes(strategy),
      );
      for (let i = 0; i < adaptersName.length; i++) {
        const adapterName = adaptersName[i];
        const strategies = TypedAdapterStrategies[adaptersName[i]];

        for (let i = 0; i < strategies.length; i++) {
          describe(`${strategies[i].strategyName}`, async () => {
            const strategy = strategies[i];
            const token = TOKENS[strategy.token];
            const contracts: CONTRACTS = {};
            let underlyingTokenName: string;
            let underlyingTokenSymbol: string;
            let currentPoolValue: BigNumber;
            before(async () => {
              try {
                const adapter = adapters[adapterName];
                await approveLiquidityPoolAndMapAdapter(
                  users["owner"],
                  essentialContracts.registry,
                  adapter.address,
                  strategy.strategy[i].contract,
                );
                await setBestStrategy(
                  strategy.strategy,
                  token,
                  essentialContracts.vaultStepInvestStrategyDefinitionRegistry,
                  essentialContracts.strategyProvider,
                  profile,
                  false,
                );
                const timestamp = (await getBlockTimestamp(hre)) * 2;
                await fundWalletToken(
                  hre,
                  TOKENS[strategy.token],
                  users["owner"],
                  MAX_AMOUNT[strategy.token],
                  timestamp,
                );

                const ERC20Instance = await hre.ethers.getContractAt("ERC20", TOKENS[strategy.token]);

                contracts["adapter"] = adapter;

                contracts["erc20"] = ERC20Instance;
              } catch (error) {
                console.error(error);
              }
            });

            beforeEach(async () => {
              try {
                currentPoolValue = BigNumber.from("0");
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
                await unpauseVault(users["owner"], essentialContracts.registry, Vault.address, true);
                contracts["vault"] = Vault;
              } catch (error) {
                console.error(error);
              }
            });
            for (let i = 0; i < stories.length; i++) {
              it(stories[i].description, async () => {
                const story = stories[i];
                for (let i = 0; i < story.setActions.length; i++) {
                  const setAction = story.setActions[i];
                  switch (setAction.action) {
                    case "setMaxDepositPoolType(uint8)": {
                      const { type }: ARGUMENTS = setAction.args;
                      if (setAction.expect === "success") {
                        await contracts[setAction.contract].connect(users[setAction.executer])[setAction.action](type);
                      } else {
                        await expect(
                          contracts[setAction.contract].connect(users[setAction.executer])[setAction.action](type),
                        ).to.be.revertedWith(setAction.message);
                      }
                      break;
                    }
                    case "setMaxDepositAmount(address,address,uint256)": {
                      const { amount }: ARGUMENTS = setAction.args;
                      if (setAction.expect === "success") {
                        await contracts[setAction.contract]
                          .connect(users[setAction.executer])
                          [setAction.action](
                            strategy.strategy[0].contract,
                            TOKENS[strategy.token],
                            amount ? amount[strategy.token] : "0",
                          );
                      } else {
                        await expect(
                          contracts[setAction.contract]
                            .connect(users[setAction.executer])
                            [setAction.action](
                              strategy.strategy[0].contract,
                              TOKENS[strategy.token],
                              amount ? amount[strategy.token] : "0",
                            ),
                        ).to.be.revertedWith(setAction.message);
                      }
                      break;
                    }
                    case "setMaxDepositPoolPct(address,uint256)": {
                      const { amount }: ARGUMENTS = setAction.args;
                      if (setAction.expect === "success") {
                        await contracts[setAction.contract]
                          .connect(users[setAction.executer])
                          [setAction.action](strategy.strategy[0].contract, amount ? amount[strategy.token] : "0");
                      } else {
                        await expect(
                          contracts[setAction.contract]
                            .connect(users[setAction.executer])
                            [setAction.action](strategy.strategy[0].contract, amount ? amount[strategy.token] : "0"),
                        ).to.be.revertedWith(setAction.message);
                      }
                      break;
                    }
                    case "setMaxDepositAmountDefault(address,uint256)": {
                      const { amount }: ARGUMENTS = setAction.args;
                      if (setAction.expect === "success") {
                        await contracts[setAction.contract]
                          .connect(users[setAction.executer])
                          [setAction.action](TOKENS[strategy.token], amount ? amount[strategy.token] : "0");
                      } else {
                        await expect(
                          contracts[setAction.contract]
                            .connect(users[setAction.executer])
                            [setAction.action](TOKENS[strategy.token], amount ? amount[strategy.token] : "0"),
                        ).to.be.revertedWith(setAction.message);
                      }
                      break;
                    }
                    case "setMaxDepositPoolPctDefault(uint256)": {
                      const { amount }: ARGUMENTS = setAction.args;
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
                      if (adapterName.includes("Aave") || adapterName === "DyDxAdapter") {
                        currentPoolValue = await contracts["adapter"].getPoolValue(
                          strategy.strategy[0].contract,
                          token,
                        );
                      } else {
                        currentPoolValue = await contracts["adapter"].getPoolValue(
                          strategy.strategy[0].contract,
                          ADDRESS_ZERO,
                        );
                      }
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
                    case "balanceOf(address)": {
                      const { userName }: ARGUMENTS = getAction.args;
                      if (userName) {
                        const address = await users[userName].getAddress();
                        const balance = await contracts[getAction.contract][getAction.action](address);
                        const expectedValue: EXPECTED_ARGUMENTS = getAction.expectedValue;
                        expect(balance).to.equal(expectedValue[strategy.token]);
                      }
                      break;
                    }
                    case "balance()": {
                      const balance = await contracts[getAction.contract][getAction.action]();
                      const expectedValue: EXPECTED_ARGUMENTS = getAction.expectedValue;
                      expect(balance).to.equal(expectedValue[strategy.token]);
                      break;
                    }
                    case "getPoolValue(address,address)": {
                      const expectedValue: EXPECTED_ARGUMENTS = getAction.expectedValue;
                      let value: BigNumber;
                      if (adapterName.includes("Aave") || adapterName === "DyDxAdapter") {
                        value = await contracts["adapter"].getPoolValue(strategy.strategy[0].contract, token);
                      } else {
                        value = await contracts["adapter"].getPoolValue(strategy.strategy[0].contract, ADDRESS_ZERO);
                      }
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
              }).timeout(150000);
            }
          });
        }
      }
    });
  }
});
