import chai, { expect, assert } from "chai";
import { solidity } from "ethereum-waffle";
import hre from "hardhat";
import { BigNumber, Signer } from "ethers";
import { CONTRACTS } from "../../helpers/type";
import { TypedTokens, TypedDefiPools } from "../../helpers/data";
import { generateStrategyHash, deployContract, executeFunc, generateTokenHash } from "../../helpers/helpers";
import { getSoliditySHA3Hash } from "../../helpers/utils";
import { TESTING_DEPLOYMENT_ONCE, ZERO_BYTES32 } from "../../helpers/constants/utils";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { deployRegistry, deployRiskManager } from "../../helpers/contracts-deployments";
import { approveAndSetTokenHashToTokens, setStrategy } from "../../helpers/contracts-actions";
import scenario from "./scenarios/apr-oracle.json";
import { RISK_PROFILES } from "../../helpers/constants/contracts-data";
import { VAULT_TOKENS } from "../../helpers/constants/tokens";

chai.use(solidity);
type ARGUMENTS = {
  riskProfileCode?: string;
  canBorrow?: boolean;
  poolRatingRange?: number[];
  adapterName?: string;
  token?: string;
  tokens?: string[];
  score?: number;
  defaultStrategyState?: number;
  liquidityPools?: {
    adapterName: string;
    token: string;
  }[];
};

const vaultUnderlyingTokenNames = Object.keys(VAULT_TOKENS);

describe(scenario.title, async () => {
  let contracts: CONTRACTS = {};
  let users: { [key: string]: Signer };
  before(async () => {
    try {
      const [owner, user1] = await hre.ethers.getSigners();
      users = { owner, user1 };
      const registry = await deployRegistry(hre, owner, TESTING_DEPLOYMENT_ONCE);
      const investStrategyRegistry = await deployContract(
        hre,
        ESSENTIAL_CONTRACTS.INVEST_STRATEGY_REGISTRY,
        TESTING_DEPLOYMENT_ONCE,
        owner,
        [registry.address],
      );

      await executeFunc(registry, owner, "setInvestStrategyRegistry(address)", [investStrategyRegistry.address]);

      const strategyProvider = await deployContract(
        hre,
        ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER,
        TESTING_DEPLOYMENT_ONCE,
        owner,
        [registry.address],
      );

      await executeFunc(registry, owner, "setStrategyProvider(address)", [strategyProvider.address]);

      const aprOracle = await deployContract(hre, ESSENTIAL_CONTRACTS.APR_ORACLE, TESTING_DEPLOYMENT_ONCE, owner, [
        registry.address,
      ]);

      await executeFunc(registry, owner, "setAPROracle(address)", [aprOracle.address]);

      const riskManager = await deployRiskManager(hre, owner, TESTING_DEPLOYMENT_ONCE, registry.address);

      await registry["addRiskProfile(uint256,string,string,bool,(uint8,uint8))"](
        RISK_PROFILES[1].code,
        RISK_PROFILES[1].name,
        RISK_PROFILES[1].symbol,
        RISK_PROFILES[1].canBorrow,
        RISK_PROFILES[1].poolRating,
      );

      await approveAndSetTokenHashToTokens(
        owner,
        registry,
        scenario.usedTokens.map(tokenName => TypedTokens[tokenName.toUpperCase()]),
        true,
      );

      contracts = { registry, investStrategyRegistry, strategyProvider, riskManager, aprOracle };
    } catch (error) {
      console.log(error);
    }
  });

  for (let i = 0; i < scenario.stories.length; i++) {
    const story = scenario.stories[i];
    it(`${story.description}`, async () => {
      if (i === 1) {
        // scenario no.0 doesn't require to set Strategies
        for (let i = 0; i < scenario.usedStrategies.length; i++) {
          const strategyInfo = scenario.usedStrategies[i];
          const strategy = {
            contract: TypedDefiPools[strategyInfo.adapterName][strategyInfo.token.toLowerCase()].pool,
            outputToken: TypedDefiPools[strategyInfo.adapterName][strategyInfo.token.toLowerCase()].lpToken,
            isBorrow: false,
          };
          await setStrategy(
            [strategy],
            users["owner"],
            [TypedTokens[strategyInfo.token.toUpperCase()]],
            contracts["investStrategyRegistry"],
          );
        }
      }
      for (let i = 0; i < story.setActions.length; i++) {
        const action = story.setActions[i];
        switch (action.action) {
          case "updateRPPoolRatings(uint256,(uint8,uint8))": {
            const { riskProfileCode, poolRatingRange }: ARGUMENTS = action.args;
            if (riskProfileCode && poolRatingRange) {
              if (action.expect === "success") {
                const value = await contracts[action.contract].getRiskProfile(riskProfileCode);
                const riskProfileIndex = value.index;
                await expect(contracts[action.contract][action.action](riskProfileCode, poolRatingRange))
                  .to.emit(contracts[action.contract], "LogRPPoolRatings")
                  .withArgs(
                    riskProfileIndex,
                    poolRatingRange[0],
                    poolRatingRange[1],
                    await users["owner"].getAddress(),
                  );
              } else {
                await expect(
                  contracts[action.contract][action.action](riskProfileCode, poolRatingRange),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(riskProfileCode, `args is wrong in ${action.action} testcase`);
            assert.isDefined(poolRatingRange, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "approveLiquidityPool(address)": {
            const { token, adapterName }: ARGUMENTS = action.args;
            if (token && adapterName) {
              if (TypedDefiPools[adapterName][token.toLowerCase()].lpToken) {
                if (action.expect === "success") {
                  await expect(
                    contracts[action.contract]
                      .connect(users["owner"])
                      ["approveLiquidityPool(address)"](TypedDefiPools[adapterName][token.toLowerCase()].lpToken),
                  )
                    .to.emit(contracts[action.contract], "LogLiquidityPool")
                    .withArgs(
                      hre.ethers.utils.getAddress(TypedDefiPools[adapterName][token.toLowerCase()].lpToken),
                      true,
                      await users["owner"].getAddress(),
                    );
                } else {
                  await expect(
                    contracts[action.contract][action.action](TypedDefiPools[adapterName][token.toLowerCase()].lpToken),
                  ).to.be.revertedWith(action.message);
                }
              }
              assert.isDefined(
                TypedDefiPools[adapterName][token.toLowerCase()].lpToken,
                `args is wrong in ${action.action} testcase`,
              );
            }
            assert.isDefined(token, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "rateLiquidityPool(address,uint8)": {
            const { token, score, adapterName }: ARGUMENTS = action.args;
            if (token && adapterName && score) {
              if (TypedDefiPools[adapterName][token.toLowerCase()].lpToken) {
                if (action.expect === "success") {
                  await expect(
                    contracts[action.contract][action.action](
                      TypedDefiPools[adapterName][token.toLowerCase()].lpToken,
                      score,
                    ),
                  )
                    .to.emit(contracts[action.contract], "LogRateLiquidityPool")
                    .withArgs(
                      hre.ethers.utils.getAddress(TypedDefiPools[adapterName][token.toLowerCase()].lpToken),
                      score,
                      await users["owner"].getAddress(),
                    );
                } else {
                  await expect(
                    contracts[action.contract][action.action](
                      TypedDefiPools[adapterName][token.toLowerCase()].lpToken,
                      score,
                    ),
                  ).to.be.revertedWith(action.message);
                }
              }
            }
            assert.isDefined(token, `args is wrong in ${action.action} testcase`);
            assert.isDefined(score, `args is wrong in ${action.action} testcase`);
            assert.isDefined(adapterName, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setBestStrategy(uint256,bytes32,bytes32)":
          case "setBestDefaultStrategy(uint256,bytes32,bytes32)": {
            const { adapterName, token, riskProfileCode }: ARGUMENTS = action.args;
            if (adapterName && token && riskProfileCode) {
              if (TypedDefiPools[adapterName][token.toLowerCase()].lpToken && TypedTokens[token.toUpperCase()]) {
                const strategy = {
                  contract: TypedDefiPools[adapterName][token.toLowerCase()].lpToken,
                  outputToken: TypedDefiPools[adapterName][token.toLowerCase()].lpToken,
                  isBorrow: false,
                };
                const strategyHash = generateStrategyHash([strategy], TypedTokens[token.toUpperCase()]);
                const tokenHash = getSoliditySHA3Hash(["address[]"], [[TypedTokens[token.toUpperCase()]]]);

                if (action.expect === "success") {
                  await contracts[action.contract][action.action](riskProfileCode, tokenHash, strategyHash);
                } else {
                  await expect(
                    contracts[action.contract][action.action](riskProfileCode, tokenHash, strategyHash),
                  ).to.be.revertedWith(action.message);
                }
              }
              assert.isDefined(
                TypedDefiPools[adapterName][token.toLowerCase()].lpToken,
                `args is wrong in ${action.action} testcase`,
              );
              assert.isDefined(TypedTokens[token.toUpperCase()], `args is wrong in ${action.action} testcase`);
            }
            assert.isDefined(adapterName, `args is wrong in ${action.action} testcase`);
            assert.isDefined(token, `args is wrong in ${action.action} testcase`);
            assert.isDefined(riskProfileCode, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setDefaultStrategyState(uint8)": {
            const { defaultStrategyState }: ARGUMENTS = action.args;
            if (action.expect === "success") {
              await contracts[action.contract].connect(users[action.executor])[action.action](defaultStrategyState);
            } else {
              await expect(
                contracts[action.contract].connect(users[action.executor])[action.action](defaultStrategyState),
              ).to.be.revertedWith(action.message);
            }
            break;
          }
        }
      }
      for (let i = 0; i < story.getActions.length; i++) {
        const action = story.getActions[i];
        switch (action.action) {
          case "getBestStrategy(uint256,address[])": {
            const { riskProfileCode, token }: ARGUMENTS = action.args;
            if (riskProfileCode && token) {
              const value = await contracts[action.contract][action.action](riskProfileCode, [
                TypedTokens[token.toUpperCase()],
              ]);
              const tokenHash = generateTokenHash([TypedTokens[token.toUpperCase()]]);
              if (action.expectedValue) {
                if (action.expectedValue.adapterName && action.expectedValue.token) {
                  const strategy = {
                    contract:
                      TypedDefiPools[action.expectedValue.adapterName][action.expectedValue.token.toLowerCase()]
                        .lpToken,
                    outputToken:
                      TypedDefiPools[action.expectedValue.adapterName][action.expectedValue.token.toLowerCase()]
                        .lpToken,
                    isBorrow: false,
                  };
                  const strategyHash = generateStrategyHash(
                    [strategy],
                    TypedTokens[action.expectedValue.token.toUpperCase()],
                  );
                  expect(value).to.be.equal(strategyHash);
                } else {
                  const strategyHash = await contracts.aprOracle.getBestAPR(tokenHash);
                  expect(value).to.be.equal(strategyHash);
                }
              } else {
                expect(value).to.be.equal(ZERO_BYTES32);
              }
            }

            assert.isDefined(riskProfileCode, `args is wrong in ${action.action} testcase`);
            assert.isDefined(token, `args is wrong in ${action.action} testcase`);
            break;
          }
        }
      }
      for (let i = 0; i < story.cleanActions.length; i++) {
        const action = story.cleanActions[i];
        switch (action.action) {
          case "revokeLiquidityPool(address[])": {
            const { liquidityPools }: ARGUMENTS = action.args;
            if (liquidityPools) {
              await contracts[action.contract][action.action](
                liquidityPools.map(
                  poolInfor => TypedDefiPools[poolInfor.adapterName][poolInfor.token.toLowerCase()].lpToken,
                ),
              );
            }
            assert.isDefined(liquidityPools, `args is wrong in ${action.action} testcase`);
            break;
          }
        }
      }
    });
  }
  // unit test getBestAPR
  it(`getBestAPR should execute for ${JSON.stringify(vaultUnderlyingTokenNames)}`, async function () {
    for (const vaultTokenName of scenario.usedTokens) {
      if (vaultUnderlyingTokenNames.includes(vaultTokenName)) {
        const token = TypedTokens[vaultTokenName.toUpperCase()];
        const tokenHash = generateTokenHash([token]);

        const aaveV1Provider = await hre.ethers.getContractAt(
          "IAaveV1LendingPoolAddressesProvider",
          await contracts.aprOracle.aaveV1(),
        );
        const aaveV1Core = await hre.ethers.getContractAt(
          "IAaveV1LendingPoolCore",
          await aaveV1Provider.getLendingPoolCore(),
        );
        const aV1Token = await aaveV1Core.getReserveATokenAddress(token);
        const aV1APR = BigNumber.from(await aaveV1Core.getReserveCurrentLiquidityRate(token)).div(
          BigNumber.from("10").pow("9"),
        );

        const aaveV2Provider = await hre.ethers.getContractAt(
          "IAaveV2LendingPoolAddressesProvider",
          await contracts.aprOracle.aaveV2(),
        );
        const aaveV2LP = await hre.ethers.getContractAt("IAaveV2", await aaveV2Provider.getLendingPool());
        const aV2ReserverData = await aaveV2LP.getReserveData(token);
        const aV2Token = aV2ReserverData.aTokenAddress;
        const aV2APR = BigNumber.from(aV2ReserverData.currentLiquidityRate).div(BigNumber.from("10").pow("9"));

        const cToken = await contracts.aprOracle.cTokens(token);
        const cAPR = cToken
          ? BigNumber.from(await (await hre.ethers.getContractAt("ICompound", cToken)).supplyRatePerBlock()).mul(
              await contracts.aprOracle.blocksPerYear(),
            )
          : BigNumber.from("0");
        let expectedHash = "";
        if (aV1APR.eq(0) && cAPR.eq(0) && aV2APR.eq(0)) {
          expectedHash = ZERO_BYTES32;
        } else {
          let strategy = { contract: "", outputToken: "", isBorrow: false };

          if (aV1APR.gt(cAPR)) {
            if (aV1APR.gt(aV2APR)) {
              strategy = { contract: aaveV1Provider.address, outputToken: aV1Token, isBorrow: false };
            } else {
              strategy = {
                contract: await contracts.aprOracle.aaveV2Registry(),
                outputToken: aV2Token,
                isBorrow: false,
              };
            }
          } else {
            if (cAPR.gt(aV2APR)) {
              strategy = { contract: cToken, outputToken: cToken, isBorrow: false };
            } else {
              strategy = {
                contract: await contracts.aprOracle.aaveV2Registry(),
                outputToken: aV2Token,
                isBorrow: false,
              };
            }
          }
          expectedHash = generateStrategyHash([strategy], token);
        }
        const hash = await contracts.aprOracle.getBestAPR(tokenHash);
        expect(hash).to.be.equal(expectedHash);
      }
    }
  });
});
