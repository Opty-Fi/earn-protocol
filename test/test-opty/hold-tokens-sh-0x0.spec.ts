import { expect, assert } from "chai";
import hre from "hardhat";
import { Signer, BigNumber } from "ethers";
import { setUp } from "./setup";
import { CONTRACTS } from "../../helpers/type";
import { VAULT_TOKENS, TESTING_DEPLOYMENT_ONCE, HARVEST_V1_ADAPTER_NAME } from "../../helpers/constants";
import { TypedAdapterStrategies } from "../../helpers/data";
import { generateTokenHash } from "../../helpers/helpers";
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
import scenarios from "./scenarios/hold-tokens-sh-0x0.json";

type ARGUMENTS = {
  amount?: { [key: string]: string };
  riskProfileCode?: string;
  strategyHash?: string;
};

describe(scenarios.title, () => {
  // TODO: ADD TEST SCENARIOES, ADVANCED PROFILE, STRATEGIES.
  const MAX_AMOUNT: { [key: string]: BigNumber } = {
    DAI: BigNumber.from("1000000000000000000000"),
    USDT: BigNumber.from("1000000000"),
    SLP_WETH_USDC: BigNumber.from("1000000000000000"),
  };
  let essentialContracts: CONTRACTS;
  let adapters: CONTRACTS;
  let users: { [key: string]: Signer };

  before(async () => {
    try {
      const [owner, admin] = await hre.ethers.getSigners();
      users = { owner, admin };
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
      let underlyingTokenName: string;
      let underlyingTokenSymbol: string;
      const profile = vault.riskProfileCode;
      const stories = vault.stories;
      const adaptersName = Object.keys(TypedAdapterStrategies);

      for (let i = 0; i < adaptersName.length; i++) {
        const adapterName = adaptersName[i];
        const strategies = TypedAdapterStrategies[adaptersName[i]];
        for (let i = 0; i < strategies.length; i++) {
          describe(`${strategies[i].strategyName}`, async () => {
            const strategy = strategies[i];
            const tokensHash = generateTokenHash([VAULT_TOKENS[strategy.token]]);
            let bestStrategyHash: string;
            let vaultRiskProfile: number;
            const contracts: CONTRACTS = {};
            before(async () => {
              try {
                underlyingTokenName = await getTokenName(hre, strategy.token);
                underlyingTokenSymbol = await getTokenSymbol(hre, strategy.token);
                const adapter = adapters[adapterName];
                const Vault = await deployVault(
                  hre,
                  essentialContracts.registry.address,
                  VAULT_TOKENS[strategy.token],
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
                await approveLiquidityPoolAndMapAdapter(
                  users["owner"],
                  essentialContracts.registry,
                  adapter.address,
                  strategy.strategy[0].contract,
                );
                vaultRiskProfile = await Vault.riskProfileCode();
                bestStrategyHash = await setBestStrategy(
                  strategy.strategy,
                  VAULT_TOKENS[strategy.token],
                  essentialContracts.investStrategyRegistry,
                  essentialContracts.strategyProvider,
                  vaultRiskProfile,
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

                const ERC20Instance = await hre.ethers.getContractAt("ERC20", VAULT_TOKENS[strategy.token]);

                contracts["strategyProvider"] = essentialContracts.strategyProvider;
                contracts["adapter"] = adapter;

                contracts["vault"] = Vault;

                contracts["erc20"] = ERC20Instance;
              } catch (error: any) {
                console.error(error);
              }
            });

            for (let i = 0; i < stories.length; i++) {
              it(stories[i].description, async () => {
                const story = stories[i];
                for (let i = 0; i < story.actions.length; i++) {
                  const action = story.actions[i];
                  switch (action.action) {
                    case "setBestStrategy(uint256,bytes32,bytes32)": {
                      const { riskProfileCode, strategyHash }: ARGUMENTS = action.args;
                      if (action.expect === "success") {
                        await contracts[action.contract]
                          .connect(users[action.executer])
                          [action.action](riskProfileCode, tokensHash, strategyHash ? strategyHash : bestStrategyHash);
                      } else {
                        await expect(
                          contracts[action.contract]
                            .connect(users[action.executer])
                            [action.action](
                              riskProfileCode,
                              tokensHash,
                              strategyHash ? strategyHash : bestStrategyHash,
                            ),
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
                      expect(await contracts[action.contract][action.action]()).to.equal(
                        action.expectedValue[<keyof typeof action.expectedValue>strategy.token],
                      );
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
