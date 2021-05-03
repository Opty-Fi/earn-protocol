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
} from "../../helpers/contracts-actions";
import scenarios from "./scenarios/hold-tokens-sh-0x0.json";
type ARGUMENTS = {
  amount?: { [key: string]: string };
  riskProfile?: string;
  strategyHash?: string;
};

describe(scenarios.title, () => {
  // TODO: ADD TEST SCENARIOES, ADVANCED PROFILE, STRATEGIES.
  const MAX_AMOUNT: { [key: string]: BigNumber } = {
    DAI: BigNumber.from("1000000000000000000000"),
    USDT: BigNumber.from("1000000000"),
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
      let underlyingTokenName: string;
      let underlyingTokenSymbol: string;
      const profile = vault.profile;
      const stories = vault.stories;
      const adaptersName = Object.keys(TypedAdapterStrategies);
      for (let i = 0; i < adaptersName.length; i++) {
        const adapterName = adaptersName[i];
        const strategies = TypedAdapterStrategies[adaptersName[i]];

        for (let i = 0; i < strategies.length; i++) {
          describe(`${strategies[i].strategyName}`, async () => {
            const strategy = strategies[i];
            const tokensHash = getSoliditySHA3Hash(["address[]"], [[TOKENS[strategy.token]]]);
            let bestStrategyHash: void;
            let vaultRiskProfile: string;
            const contracts: CONTRACTS = {};
            before(async () => {
              try {
                underlyingTokenName = await getTokenName(hre, strategy.token);
                underlyingTokenSymbol = await getTokenSymbol(hre, strategy.token);
                const adapter = adapters[adapterName];
                const Vault = await deployVault(
                  hre,
                  essentialContracts.registry.address,
                  essentialContracts.riskManager.address,
                  essentialContracts.strategyManager.address,
                  essentialContracts.optyMinter.address,
                  TOKENS[strategy.token],
                  users["owner"],
                  users["admin"],
                  underlyingTokenName,
                  underlyingTokenSymbol,
                  profile,
                  TESTING_DEPLOYMENT_ONCE,
                );
                await approveLiquidityPoolAndMapAdapter(
                  users["owner"],
                  essentialContracts.registry,
                  adapter.address,
                  strategy.strategy[0].contract,
                );
                vaultRiskProfile = await Vault.profile();
                bestStrategyHash = await setBestBasicStrategy(
                  strategy.strategy,
                  tokensHash,
                  essentialContracts.registry,
                  essentialContracts.strategyProvider,
                  vaultRiskProfile,
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

                contracts["strategyProvider"] = essentialContracts.strategyProvider;
                contracts["adapter"] = adapter;

                contracts["vault"] = Vault;

                contracts["erc20"] = ERC20Instance;
              } catch (error) {
                console.error(error);
              }
            });

            for (let i = 0; i < stories.length; i++) {
              it(stories[i].description, async () => {
                const story = stories[i];
                for (let i = 0; i < story.actions.length; i++) {
                  const action = story.actions[i];
                  switch (action.action) {
                    case "setBestStrategy(string,bytes32,bytes32)": {
                      const { riskProfile, strategyHash }: ARGUMENTS = action.args;
                      if (action.expect === "success") {
                        await contracts[action.contract]
                          .connect(users[action.executer])
                          [action.action](riskProfile, tokensHash, strategyHash ? strategyHash : bestStrategyHash);
                      } else {
                        await expect(
                          contracts[action.contract]
                            .connect(users[action.executer])
                            [action.action](riskProfile, tokensHash, strategyHash ? strategyHash : bestStrategyHash),
                        ).to.be.revertedWith(action.message);
                      }
                      break;
                    }
                    case "approve(address,uint256)": {
                      const { amount }: ARGUMENTS = action.args;
                      if (action.expect === "success") {
                        await contracts[action.contract]
                          .connect(users[action.executer])
                          [action.action](contracts["vault"].address, amount ? amount[strategy.token] : "0");
                      } else {
                        await expect(
                          contracts[action.contract]
                            .connect(users[action.executer])
                            [action.action](contracts["vault"].address, amount ? amount[strategy.token] : "0"),
                        ).to.be.revertedWith(action.message);
                      }
                      break;
                    }
                    case "userDepositRebalance(uint256)": {
                      const { amount }: ARGUMENTS = action.args;

                      if (action.expect === "success") {
                        await contracts[action.contract]
                          .connect(users[action.executer])
                          [action.action](amount ? amount[strategy.token] : "0");
                      } else {
                        await expect(
                          contracts[action.contract]
                            .connect(users[action.executer])
                            [action.action](amount ? amount[strategy.token] : "0"),
                        ).to.be.revertedWith(action.message);
                      }
                      break;
                    }
                    case "balance()": {
                      const balance = await contracts[action.contract][action.action]();
                      expect(balance).to.equal(action.expectedValue[<keyof typeof action.expectedValue>strategy.token]);
                      break;
                    }
                    case "userWithdrawRebalance(uint256)": {
                      const { amount }: ARGUMENTS = action.args;
                      if (action.expect === "success") {
                        await contracts[action.contract]
                          .connect(users[action.executer])
                          [action.action](amount ? amount[strategy.token] : "0");
                      } else {
                        await expect(
                          contracts[action.contract]
                            .connect(users[action.executer])
                            [action.action](amount ? amount[strategy.token] : "0"),
                        ).to.be.revertedWith(action.message);
                      }
                      break;
                    }
                    default:
                      break;
                  }
                }
              }).timeout(350000);
            }
          });
        }
      }
    });
  }
});
