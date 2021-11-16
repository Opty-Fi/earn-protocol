import chai, { expect, assert } from "chai";
import { solidity } from "ethereum-waffle";
import hre from "hardhat";
import { Contract, Signer, BigNumber } from "ethers";
import { setUp } from "./setup";
import { CONTRACTS, STRATEGY_DATA } from "../../helpers/type";
import { TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants/utils";
import { VAULT_TOKENS } from "../../helpers/constants/tokens";
import { TypedStrategies, TypedTokens } from "../../helpers/data";
import { deployVault } from "../../helpers/contracts-deployments";
import {
  fundWalletToken,
  getBlockTimestamp,
  getTokenName,
  getTokenSymbol,
  unpauseVault,
} from "../../helpers/contracts-actions";
import scenario from "./scenarios/gas-fees-owed-opt-009.json";
import {
  generateTokenHash,
  generateStrategyHash,
  retrieveAdapterFromStrategyName,
  generateStrategyStep,
} from "../../helpers/helpers";
import { ERC20 } from "../../typechain/ERC20";
chai.use(solidity);

type ARGUMENTS = {
  contractName?: string;
  adapterName?: string;
  token?: string;
  tokens?: string[];
  liquidityPool?: string;
  strategy?: STRATEGY_DATA[];
  amount?: string;
  riskProfileCode?: string;
  poolRatingRange?: number[];
  score?: number;
};

const tokenAddresses = [
  TypedTokens.DAI,
  TypedTokens.USDC,
  TypedTokens.USDT,
  TypedTokens.WBTC,
  TypedTokens.WETH,
  TypedTokens.SLP_WETH_USDC,
];

describe(scenario.title, () => {
  let essentialContracts: CONTRACTS;
  let adapters: CONTRACTS;
  const contracts: CONTRACTS = {};
  let admin: Signer;
  let operator: Signer;
  before(async () => {
    try {
      [operator, admin] = await hre.ethers.getSigners();
      [essentialContracts, adapters] = await setUp(operator, tokenAddresses);
      assert.isDefined(essentialContracts, "Essential contracts not deployed");
      assert.isDefined(adapters, "Adapters not deployed");
    } catch (error: any) {
      console.log(error);
    }
  });

  let Vault: Contract;
  let gasOwed = BigNumber.from("0");
  let gasOwedTotal = BigNumber.from("0");
  const tokensName = Object.keys(VAULT_TOKENS);

  for (let i = 0; i < tokensName.length; i++) {
    const token = tokensName[i];
    const strategies = TypedStrategies.filter(strategy => strategy.token.toUpperCase() === token.toUpperCase());
    if (strategies.length < 2) {
      // Insufficient strategy to test
      continue;
    }
    let strategyIndex = 0;
    const tokenHash = generateTokenHash([VAULT_TOKENS[token].address]);
    let decimals: number;
    let underlyingTokenName: string;
    let underlyingTokenSymbol: string;
    const riskProfileCode = 1;
    describe(`${token}`, () => {
      before(async () => {
        underlyingTokenName = await getTokenName(hre, token);
        underlyingTokenSymbol = await getTokenSymbol(hre, token);

        Vault = await deployVault(
          hre,
          essentialContracts.registry.address,
          VAULT_TOKENS[token].address,
          operator,
          admin,
          underlyingTokenName,
          underlyingTokenSymbol,
          riskProfileCode,
          TESTING_DEPLOYMENT_ONCE,
        );

        await unpauseVault(operator, essentialContracts.registry, Vault.address, true);

        const Token_ERC20Instance = <ERC20>await hre.ethers.getContractAt("ERC20", VAULT_TOKENS[token].address);

        decimals = await Token_ERC20Instance.decimals();

        contracts["erc20"] = Token_ERC20Instance;

        const CHIInstance = await hre.ethers.getContractAt("IChi", TypedTokens["CHI"]);

        contracts["chi"] = CHIInstance;

        contracts["registry"] = essentialContracts.registry;

        contracts["investStrategyRegistry"] = essentialContracts.investStrategyRegistry;

        contracts["strategyProvider"] = essentialContracts.strategyProvider;

        contracts["vault"] = Vault;
      });
      for (let i = 0; i < scenario.stories.length; i++) {
        const story = scenario.stories[i];
        it(`${story.description}`, async () => {
          for (let i = 0; i < story.setActions.length; i++) {
            const action = story.setActions[i];
            switch (action.action) {
              case "approveToken(address)": {
                const { token }: ARGUMENTS = action.args;
                if (token) {
                  if (action.expect === "success") {
                    await contracts[action.contract][action.action](token);
                  } else {
                    await expect(contracts[action.contract][action.action](token)).to.be.revertedWith(action.message);
                  }
                }
                assert.isDefined(token, `args is wrong in ${action.action} testcase`);
                break;
              }
              case "approveLiquidityPool(address)": {
                for (let i = 0; i < strategies[strategyIndex].strategy.length; i++) {
                  const strategy = strategies[strategyIndex].strategy[i];
                  try {
                    if (action.expect === "success") {
                      await contracts[action.contract][action.action](strategy.contract);
                    } else {
                      await expect(contracts[action.contract][action.action](strategy.contract)).to.be.revertedWith(
                        action.message,
                      );
                    }
                  } catch (error: any) {
                    expect(error.message).to.equal(
                      "VM Exception while processing transaction: reverted with reason string '!liquidityPools'",
                    );
                  }
                }

                break;
              }
              case "rateLiquidityPool(address,uint8)": {
                const { score }: ARGUMENTS = action.args;
                if (score) {
                  for (let i = 0; i < strategies[strategyIndex].strategy.length; i++) {
                    const strategy = strategies[strategyIndex].strategy[i];
                    if (action.expect === "success") {
                      await contracts[action.contract][action.action](strategy.contract, score);
                    } else {
                      await expect(
                        contracts[action.contract][action.action](strategy.contract, score),
                      ).to.be.revertedWith(action.message);
                    }
                  }
                }
                assert.isDefined(score, `args is wrong in ${action.action} testcase`);
                break;
              }
              case "setTokensHashToTokens(address[])": {
                const { tokens }: ARGUMENTS = action.args;
                if (tokens) {
                  if (action.expect === "success") {
                    await contracts[action.contract][action.action](tokens);
                  } else {
                    await expect(contracts[action.contract][action.action](tokens)).to.be.revertedWith(action.message);
                  }
                }
                assert.isDefined(tokens, `args is wrong in ${action.action} testcase`);
                break;
              }
              case "setStrategy(bytes32,(address,address,bool)[])": {
                const strategySteps = generateStrategyStep(strategies[strategyIndex].strategy);
                if (action.expect === "success") {
                  await contracts[action.contract][action.action](tokenHash, strategySteps);
                } else {
                  await expect(contracts[action.contract][action.action](tokenHash, strategySteps)).to.be.revertedWith(
                    action.message,
                  );
                }

                break;
              }
              case "setLiquidityPoolToAdapter(address,address)": {
                const adapterNames = retrieveAdapterFromStrategyName(strategies[strategyIndex].strategyName);

                for (let i = 0; i < adapterNames.length; i++) {
                  const adapterName = adapterNames[i];
                  if (action.expect === "success") {
                    await contracts[action.contract][action.action](
                      strategies[strategyIndex].strategy[i].contract,
                      adapters[adapterName].address,
                    );
                  } else {
                    await expect(
                      contracts[action.contract][action.action](
                        strategies[strategyIndex].strategy[0].contract,
                        adapters[adapterName].address,
                      ),
                    ).to.be.revertedWith(action.message);
                  }
                }

                break;
              }
              case "fundWallet": {
                const { amount }: ARGUMENTS = action.args;
                try {
                  if (amount) {
                    const timestamp = (await getBlockTimestamp(hre)) * 2;
                    await fundWalletToken(
                      hre,
                      VAULT_TOKENS[token].address,
                      operator,
                      BigNumber.from(amount).mul(BigNumber.from(10).pow(decimals)),
                      timestamp,
                    );
                  }
                } catch (error: any) {
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
              case "approve(address,uint256)": {
                const { contractName, amount }: ARGUMENTS = action.args;
                try {
                  if (contractName && amount) {
                    await contracts[action.contract]
                      .connect(operator)
                      [action.action](
                        contracts[contractName].address,
                        BigNumber.from(amount).mul(BigNumber.from(10).pow(decimals)),
                      );
                  }
                } catch (error: any) {
                  if (action.expect === "success") {
                    assert.isUndefined(error);
                  } else {
                    expect(error.message).to.equal(
                      `VM Exception while processing transaction: reverted with reason string '${action.message}'`,
                    );
                  }
                }
                assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
                assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
                break;
              }
              case "userDeposit(uint256)": {
                const { amount }: ARGUMENTS = action.args;
                try {
                  if (amount) {
                    await contracts[action.contract]
                      .connect(operator)
                      [action.action](BigNumber.from(amount).mul(BigNumber.from(10).pow(decimals)));
                  }
                } catch (error: any) {
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
              case "setBestStrategy(uint256,bytes32,bytes32)": {
                const strategyHash = generateStrategyHash(
                  strategies[strategyIndex].strategy,
                  VAULT_TOKENS[token].address,
                );
                if (action.expect === "success") {
                  await contracts[action.contract][action.action](riskProfileCode, tokenHash, strategyHash);
                } else {
                  await expect(
                    contracts[action.contract][action.action](riskProfileCode, tokenHash, strategyHash),
                  ).to.be.revertedWith(action.message);
                }
                strategyIndex++;
                break;
              }
              case "rebalance()": {
                try {
                  await contracts[action.contract].connect(operator)[action.action]();
                  gasOwed = await contracts[action.contract]["gasOwedToOperator()"]();
                  gasOwedTotal = gasOwedTotal.add(gasOwed);
                } catch (error: any) {
                  if (action.expect === "success") {
                    assert.isUndefined(error);
                  } else {
                    expect(error.message).to.equal(
                      `VM Exception while processing transaction: reverted with reason string '${action.message}'`,
                    );
                  }
                }
                break;
              }
            }
          }
          for (let i = 0; i < story.getActions.length; i++) {
            const action = story.getActions[i];
            switch (action.action) {
              case "gasOwedToOperator()": {
                expect(+(await contracts[action.contract][action.action]())).to.be.lt(+gasOwedTotal);
              }
            }
          }
        });
      }
    });
  }
});
