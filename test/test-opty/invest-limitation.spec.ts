import { expect, assert } from "chai";
import hre from "hardhat";
import { Signer, BigNumber } from "ethers";
import { setUp } from "./setup";
import { CONTRACTS } from "../../helpers/type";
import { TOKENS, TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants";
import { TypedAdapterStrategies } from "../../helpers/data";
import { getSoliditySHA3Hash } from "../../helpers/utils";
import { deployVault } from "../../helpers/contracts-deployments";
import {
  setBestBasicStrategy,
  approveLiquidityPoolAndMapAdapter,
  fundWalletToken,
  getBlockTimestamp,
  getTokenName,
  getTokenSymbol,
  unpauseVault,
} from "../../helpers/contracts-actions";
import scenarios from "./scenarios/invest-limitation.json";
import { expectInvestLimitEvents } from "../../helpers/helpers";

type ARGUMENTS = {
  amount?: { [key: string]: string };
  type?: number;
  userName?: string;
};
type EXPECTED_ARGUMENTS = {
  [key: string]: string | number;
};
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
      // For all adapters except CurvePool and CurveSwap
      // @reason : CurvePool and CurveSwap don't follow the same approach for invest limitation compared to other adapters.
      const adaptersName = Object.keys(TypedAdapterStrategies).filter(
        strategy => !["CurveDepositPoolAdapter", "CurveSwapPoolAdapter"].includes(strategy),
      );
      for (let i = 0; i < adaptersName.length; i++) {
        const adapterName = adaptersName[i];
        const strategies = TypedAdapterStrategies[adaptersName[i]];

        for (let i = 0; i < strategies.length; i++) {
          describe(`${strategies[i].strategyName}`, async () => {
            const strategy = strategies[i];
            const token = TOKENS[strategy.token];
            const tokensHash = getSoliditySHA3Hash(["address[]"], [[token]]);
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
                await setBestBasicStrategy(
                  strategy.strategy,
                  tokensHash,
                  essentialContracts.vaultStepInvestStrategyDefinitionRegistry,
                  essentialContracts.strategyProvider,
                  profile,
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
                    case "setMaxDepositProtocolMode(uint8)": {
                      const { type }: ARGUMENTS = setAction.args;
                      if (setAction.expect === "success") {
                        const _setMaxDepositProtocolModeTx = await contracts[setAction.contract]
                          .connect(users[setAction.executer])
                          [setAction.action](type);
                        const setMaxDepositProtocolModeTx = await _setMaxDepositProtocolModeTx.wait();
                        expectInvestLimitEvents(
                          setMaxDepositProtocolModeTx,
                          "LogMaxDepositProtocolMode",
                          "LogMaxDepositProtocolMode(uint8,address)",
                          contracts[setAction.contract].address,
                          userAddresses[setAction.executer],
                          type!,
                        );
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
                        const _setMaxDepositAmountTx = await contracts[setAction.contract]
                          .connect(users[setAction.executer])
                          [setAction.action](strategy.strategy[0].contract, token, maxDepositAmount);
                        const setMaxDepositAmountTx = await _setMaxDepositAmountTx.wait();
                        expectInvestLimitEvents(
                          setMaxDepositAmountTx,
                          "LogMaxDepositAmount",
                          "LogMaxDepositAmount(uint256,address)",
                          contracts[setAction.contract].address,
                          userAddresses[setAction.executer],
                          maxDepositAmount,
                        );
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
                        const _setMaxDepositPoolPctTx = await contracts[setAction.contract]
                          .connect(users[setAction.executer])
                          [setAction.action](strategy.strategy[0].contract, maxDepositPoolPct);
                        const setMaxDepositPoolPctTx = await _setMaxDepositPoolPctTx.wait();
                        expectInvestLimitEvents(
                          setMaxDepositPoolPctTx,
                          "LogMaxDepositPoolPct",
                          "LogMaxDepositPoolPct(uint256,address)",
                          contracts[setAction.contract].address,
                          userAddresses[setAction.executer],
                          maxDepositPoolPct,
                        );
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
                        const _setMaxDepositProtocolPctTx = await contracts[setAction.contract]
                          .connect(users[setAction.executer])
                          [setAction.action](maxDepositProtocolPct);
                        const setMaxDepositProtocolPctTx = await _setMaxDepositProtocolPctTx.wait();
                        expectInvestLimitEvents(
                          setMaxDepositProtocolPctTx,
                          "LogMaxDepositProtocolPct",
                          "LogMaxDepositProtocolPct(uint256,address)",
                          contracts[setAction.contract].address,
                          userAddresses[setAction.executer],
                          maxDepositProtocolPct,
                        );
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
                      currentPoolValue = await contracts["adapter"].getPoolValue(strategy.strategy[0].contract, token);
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
                      const value: BigNumber = await contracts[getAction.contract][getAction.action](
                        strategy.strategy[0].contract,
                      );
                      expect(+value).to.equal(+expectedValue[strategy.token]);
                      break;
                    }
                    case "maxDepositProtocolPct()": {
                      const expectedValue: EXPECTED_ARGUMENTS = getAction.expectedValue;
                      const value: BigNumber = await contracts[getAction.contract][getAction.action]();
                      expect(+value).to.equal(+expectedValue[strategy.token]);
                      break;
                    }
                    case "maxDepositAmount(address,address)": {
                      const expectedValue: EXPECTED_ARGUMENTS = getAction.expectedValue;
                      const value: BigNumber = await contracts[getAction.contract][getAction.action](
                        strategy.strategy[0].contract,
                        TOKENS[strategy.token],
                      );
                      expect(+value).to.equal(+expectedValue[strategy.token]);
                      break;
                    }
                    case "maxDepositProtocolMode()": {
                      const expectedValue: any = getAction.expectedValue;
                      const value: BigNumber = await contracts[getAction.contract][getAction.action]();
                      expect(+value).to.equal(+expectedValue.type);
                      break;
                    }
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
                      const value = await contracts["adapter"].getPoolValue(strategy.strategy[0].contract, token);
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
