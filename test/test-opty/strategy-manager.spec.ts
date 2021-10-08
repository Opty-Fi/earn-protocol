import chai, { expect } from "chai";
import hre from "hardhat";
import { Contract, Signer, BigNumber } from "ethers";
import { solidity } from "ethereum-waffle";
import { CONTRACTS, MOCK_CONTRACTS, STRATEGY_DATA } from "../../helpers/type";
import {
  generateStrategyHash,
  deployContract,
  deploySmockContract,
  retrieveAdapterFromStrategyName,
  getDefaultFundAmountInDecimal,
} from "../../helpers/helpers";
import {
  TESTING_DEPLOYMENT_ONCE,
  ESSENTIAL_CONTRACTS,
  TESTING_CONTRACTS,
  ADDRESS_ZERO,
  CURVE_SWAP_POOL_ADAPTER_NAME,
  CURVE_DEPOSIT_POOL_ADAPTER_NAME,
  SUSHISWAP_ADAPTER_NAME,
} from "../../helpers/constants";
import { fundWalletToken, getBlockTimestamp } from "../../helpers/contracts-actions";
import { deployAdapter } from "../../helpers/contracts-deployments";
import scenario from "./scenarios/strategy-manager.json";
import { TypedStrategies, TypedTokens } from "../../helpers/data";
import { smock } from "@defi-wonderland/smock";

chai.use(solidity);

describe(scenario.title, () => {
  const sideContracts: MOCK_CONTRACTS = {};
  let strategyManager: Contract;
  let testingStrategyManager: Contract;
  let owner: Signer;
  let user1: Signer;
  let ownerAddress: string;
  before(async () => {
    try {
      [owner, user1] = await hre.ethers.getSigners();
      ownerAddress = await owner.getAddress();
      sideContracts["registry"] = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.REGISTRY, []);
      sideContracts["vaultStepInvestStrategyDefinitionRegistry"] = await deploySmockContract(
        smock,
        ESSENTIAL_CONTRACTS.VAULT_STEP_INVEST_STRATEGY_DEFINITION_REGISTRY,
        [sideContracts["registry"].address],
      );
      sideContracts["harvestCodeProvider"] = await deploySmockContract(
        smock,
        ESSENTIAL_CONTRACTS.HARVEST_CODE_PROVIDER,
        [sideContracts["registry"].address],
      );
      sideContracts["opty"] = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.OPTY, [
        sideContracts["registry"].address,
        100000000000000,
      ]);
      sideContracts["opty"].balanceOf.returns(100000000000000);
      sideContracts["optyDistributor"] = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.OPTY_DISTRIBUTOR, [
        sideContracts["registry"].address,
        sideContracts["opty"].address,
        1700000000,
      ]);
      sideContracts["vaultBooster"] = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.ODEFI_VAULT_BOOSTER, [
        sideContracts["registry"].address,
        sideContracts["opty"].address,
      ]);

      strategyManager = await deployContract(
        hre,
        ESSENTIAL_CONTRACTS.STRATEGY_MANAGER,
        TESTING_DEPLOYMENT_ONCE,
        owner,
        [sideContracts["registry"].address],
      );
      testingStrategyManager = await deployContract(
        hre,
        TESTING_CONTRACTS.TEST_STRATEGY_MANAGER,
        TESTING_DEPLOYMENT_ONCE,
        owner,
        [],
      );
      sideContracts["registry"].getRiskOperator.returns(await owner.getAddress());
      sideContracts["registry"].getOperator.returns(await owner.getAddress());
      sideContracts["registry"].getVaultStepInvestStrategyDefinitionRegistry.returns(
        sideContracts["vaultStepInvestStrategyDefinitionRegistry"].address,
      );
      sideContracts["registry"].getHarvestCodeProvider.returns(sideContracts["harvestCodeProvider"].address);
      sideContracts["registry"].getOPTYDistributor.returns(sideContracts["optyDistributor"].address);
      sideContracts["registry"].getODEFIVaultBooster.returns(sideContracts["vaultBooster"].address);
      await sideContracts["vaultBooster"].setODEFIRewarder(sideContracts["opty"].address, ownerAddress);

      await sideContracts["optyDistributor"].setOptyVaultRate(sideContracts["opty"].address, 1000);
      await sideContracts["vaultBooster"].setOdefiVaultRate(sideContracts["opty"].address, 1000);
    } catch (error) {
      console.log(error);
    }
  });
  for (let i = 0; i < TypedStrategies.length; i++) {
    const strategyDetail = TypedStrategies[i];
    if (i > 0) {
      break;
    }
    const adapterNames = retrieveAdapterFromStrategyName(strategyDetail.strategyName);
    const adapters: CONTRACTS = {};
    const underlyingToken = TypedTokens[strategyDetail.token.toUpperCase()];

    const steps = strategyDetail.strategy.length;
    const lastStrategyStep = strategyDetail.strategy[steps - 1];
    const strategyHash = generateStrategyHash(strategyDetail.strategy, underlyingToken);
    before(async () => {
      for (let i = 0; i < adapterNames.length; i++) {
        adapters[adapterNames[i]] = await deployAdapter(
          hre,
          owner,
          adapterNames[i],
          sideContracts["registry"].address,
          TESTING_DEPLOYMENT_ONCE,
        );
      }
    });

    for (let i = 0; i < scenario.stories.length; i++) {
      const story = scenario.stories[i];
      it(`${story.description}`, async function () {
        const ERC20Instance = await hre.ethers.getContractAt("ERC20", underlyingToken);
        const rewardTokenAddress = await adapters[adapterNames[steps - 1]].getRewardToken(lastStrategyStep.contract);
        let RewardTokenInstance: Contract | undefined;
        if (rewardTokenAddress !== ADDRESS_ZERO) {
          RewardTokenInstance = await hre.ethers.getContractAt("ERC20", rewardTokenAddress);
        }
        const decimals = await ERC20Instance.decimals();
        let defaultFundAmount: BigNumber = getDefaultFundAmountInDecimal(underlyingToken, decimals);
        let underlyingBalanceBefore: BigNumber = hre.ethers.BigNumber.from(0);
        let rewardTokenBalanceBefore: BigNumber = hre.ethers.BigNumber.from(0);
        const timestamp = (await getBlockTimestamp(hre)) * 2;
        for (let i = 0; i < story.setActions.length; i++) {
          const action = story.setActions[i];
          switch (action.action) {
            case "checkAddLiquidity()": {
              if (!adapterNames.includes(SUSHISWAP_ADAPTER_NAME)) {
                this.skip();
              }
              break;
            }
            case "checkRewardToken": {
              let isAvailableRewardToken = false;
              for (let i = 0; i < steps; i++) {
                const adapter = adapters[adapterNames[i]];
                const liquidityPool = strategyDetail.strategy[i].contract;
                if ((await adapter.getRewardToken(liquidityPool)) !== ADDRESS_ZERO) {
                  isAvailableRewardToken = true;
                  break;
                }
              }
              if (!isAvailableRewardToken) {
                this.skip();
              }
              break;
            }
            case "getStrategy()": {
              sideContracts["vaultStepInvestStrategyDefinitionRegistry"].getStrategy.returns([
                0,
                strategyDetail.strategy.map(s => ({
                  pool: s.contract,
                  outputToken: s.outputToken,
                  isBorrow: s.isBorrow,
                })),
              ]);
              break;
            }
            case "getLiquidityPoolToAdapter()": {
              for (let i = 0; i < strategyDetail.strategy.length; i++) {
                sideContracts["registry"].getLiquidityPoolToAdapter
                  .whenCalledWith(strategyDetail.strategy[i].contract)
                  .returns(adapters[adapterNames[i]].address);
              }
              break;
            }
            case "fundWallet": {
              const underlyingBalance: BigNumber = await ERC20Instance.balanceOf(testingStrategyManager.address);
              if (underlyingBalance.lt(defaultFundAmount)) {
                defaultFundAmount = await fundWalletToken(
                  hre,
                  underlyingToken,
                  owner,
                  defaultFundAmount,
                  timestamp,
                  testingStrategyManager.address,
                );
              }
              break;
            }
            case "fundWalletWithRewardToken": {
              if (rewardTokenAddress !== ADDRESS_ZERO) {
                const balance: BigNumber = await RewardTokenInstance?.balanceOf(testingStrategyManager.address);
                const decimals = await RewardTokenInstance?.decimals();
                if (balance.lte(0)) {
                  const value = await fundWalletToken(
                    hre,
                    underlyingToken,
                    owner,
                    getDefaultFundAmountInDecimal(rewardTokenAddress, decimals),
                    timestamp,
                    testingStrategyManager.address,
                  );
                  expect(value).to.be.gt(0);
                }
              }
              break;
            }
            case "testPoolDepositAllCode(address,address,bytes32,uint256,uint256)": {
              underlyingBalanceBefore = await ERC20Instance.balanceOf(testingStrategyManager.address);
              for (let i = 0; i < steps; i++) {
                await testingStrategyManager[action.action](
                  strategyManager.address,
                  underlyingToken,
                  strategyHash,
                  i,
                  steps,
                );
              }
              break;
            }
            case "testPoolWithdrawAllCodes(address,address,bytes32,uint256,uint256)": {
              underlyingBalanceBefore = await ERC20Instance.balanceOf(testingStrategyManager.address);
              for (let i = 0; i < steps; i++) {
                const iterator = steps - 1 - i;
                await testingStrategyManager[action.action](
                  strategyManager.address,
                  underlyingToken,
                  strategyHash,
                  iterator,
                  steps,
                );
              }
              break;
            }
            case "testPoolClaimAllRewardCodes(address,bytes32)": {
              rewardTokenBalanceBefore = await RewardTokenInstance?.balanceOf(testingStrategyManager.address);
              await testingStrategyManager[action.action](strategyManager.address, strategyHash);
              break;
            }
            case "testPoolHarvestAllRewardCodes(address,address,bytes32)": {
              await testingStrategyManager[action.action](strategyManager.address, underlyingToken, strategyHash);
              break;
            }
            case "testPoolHarvestSomeRewardCodes(address,address,bytes32,(uint256,uint256))": {
              await testingStrategyManager[action.action](strategyManager.address, underlyingToken, strategyHash, [
                0,
                0,
              ]);
              break;
            }
            case "testAddLiquidityCodes(address,address,bytes32)": {
              await testingStrategyManager[action.action](strategyManager.address, underlyingToken, strategyHash);
              break;
            }
            case "testSplitPaymentCode(address,address,address,uint256,(address,uint256)[])": {
              const ownerAddress = await owner.getAddress();
              const userAddress = await user1.getAddress();
              const treasuryShare = [[userAddress, 5000]];
              await testingStrategyManager[action.action](
                strategyManager.address,
                underlyingToken,
                ownerAddress,
                defaultFundAmount,
                treasuryShare,
              );
              expect(await ERC20Instance.balanceOf(ownerAddress)).to.be.equal(defaultFundAmount.div(2));
              expect(await ERC20Instance.balanceOf(userAddress)).to.be.equal(defaultFundAmount.div(2));
              break;
            }
            case "testUpdateUserRewardsCodes(address,address,address)": {
              const ownerAddress = await owner.getAddress();
              await testingStrategyManager[action.action](
                strategyManager.address,
                sideContracts["opty"].address,
                ownerAddress,
              );
              expect(await sideContracts["optyDistributor"].optyAccrued(ownerAddress)).to.be.gte(0);
              expect(
                await sideContracts["optyDistributor"].lastUserUpdate(sideContracts["opty"].address, ownerAddress),
              ).to.be.gte(0);
              expect(await sideContracts["vaultBooster"].odefiAccrued(ownerAddress)).to.be.gte(0);
              expect(
                await sideContracts["vaultBooster"].lastUserUpdate(sideContracts["opty"].address, ownerAddress),
              ).to.be.gte(0);
              break;
            }
            case "testUpdateUserStateInVaultCodes(address,address,address)": {
              const ownerAddress = await owner.getAddress();
              await testingStrategyManager[action.action](
                strategyManager.address,
                sideContracts["opty"].address,
                ownerAddress,
              );
              expect(
                await sideContracts["optyDistributor"].optyVaultRatePerSecondAndVaultToken(
                  sideContracts["opty"].address,
                ),
              ).to.be.gte(0);
              expect(
                await sideContracts["optyDistributor"].lastUserUpdate(sideContracts["opty"].address, ownerAddress),
              ).to.be.gte(0);
              expect(await sideContracts["vaultBooster"].odefiAccrued(ownerAddress)).to.be.gte(0);
              expect(
                await sideContracts["vaultBooster"].lastUserUpdate(sideContracts["opty"].address, ownerAddress),
              ).to.be.gte(0);
              break;
            }
          }
        }
        for (let i = 0; i < story.getActions.length; i++) {
          const action = story.getActions[i];
          switch (action.action) {
            case "balanceOf(address)": {
              const underlyingBalanceAfter: BigNumber = await ERC20Instance.balanceOf(testingStrategyManager.address);
              if (action.expectedValue === "=0") {
                expect(underlyingBalanceAfter).to.be.equal(0);
              } else if (action.expectedValue === ">0") {
                expect(underlyingBalanceAfter).to.be.gt(underlyingBalanceBefore);
              }
              break;
            }
            case "rewardTokenBalanceOf": {
              const underlyingBalanceAfter: BigNumber = await RewardTokenInstance?.balanceOf(
                testingStrategyManager.address,
              );
              if (action.expectedValue === "=0") {
                expect(underlyingBalanceAfter).to.be.equal(0);
              } else if (action.expectedValue === ">0") {
                expect(underlyingBalanceAfter).to.be.gt(rewardTokenBalanceBefore);
              }
              break;
            }
            case "getDepositAllStepCount(bytes32)": {
              let expectedCount = steps;
              if (await adapters[adapterNames[steps - 1]].canStake(lastStrategyStep.contract)) {
                expectedCount++;
              }
              expectedCount += strategyDetail.strategy.filter(s => s.isBorrow === true).length;
              expect(await strategyManager[action.action](strategyHash)).to.be.equal(expectedCount);
              break;
            }
            case "getWithdrawAllStepsCount(bytes32)": {
              let expectedCount = steps;
              expectedCount += strategyDetail.strategy.filter(s => s.isBorrow === true).length;
              expect(await strategyManager[action.action](strategyHash)).to.be.equal(expectedCount);
              break;
            }
            case "getClaimRewardStepsCount(bytes32)": {
              const lastStep = strategyDetail.strategy[steps - 1];
              const expectedCount =
                (await adapters[adapterNames[steps - 1]].getRewardToken(lastStep.contract)) !== ADDRESS_ZERO ? 1 : 0;
              expect(await strategyManager[action.action](strategyHash)).to.be.equal(expectedCount);
              break;
            }
            case "getBalanceInUnderlyingToken(address,address,bytes32)": {
              let expectedValue = 0;
              if (
                adapterNames.includes(CURVE_SWAP_POOL_ADAPTER_NAME) ||
                adapterNames.includes(CURVE_DEPOSIT_POOL_ADAPTER_NAME)
              ) {
                action.action = "getBalanceInUnderlyingTokenWrite(address,address,bytes32)";
              }
              for (let i = 0; i < steps; i++) {
                const iterator = steps - 1 - i;
                const liquidityPool = strategyDetail.strategy[iterator].contract;
                const adapter = adapters[adapterNames[iterator]];
                const inputToken = iterator === 0 ? underlyingToken : strategyDetail.strategy[iterator - 1].outputToken;
                if (!strategyDetail.strategy[iterator].isBorrow) {
                  if (iterator === steps - 1) {
                    if (await adapter.canStake(liquidityPool)) {
                      expectedValue =
                        action.action === "getBalanceInUnderlyingTokenWrite(address,address,bytes32)"
                          ? await adapter.getAllAmountInTokenStakeWrite(
                              testingStrategyManager.address,
                              inputToken,
                              liquidityPool,
                            )
                          : await adapter.getAllAmountInTokenStake(
                              testingStrategyManager.address,
                              inputToken,
                              liquidityPool,
                            );
                    } else {
                      expectedValue = await adapter.getAllAmountInToken(
                        testingStrategyManager.address,
                        inputToken,
                        liquidityPool,
                      );
                    }
                  } else {
                    expectedValue = await adapter.getSomeAmountInToken(inputToken, liquidityPool, expectedValue);
                  }
                } else {
                  const borrowToken = strategyDetail.strategy[iterator].outputToken;
                  expectedValue = await adapter.getAllAmountInTokenBorrow(
                    testingStrategyManager.address,
                    inputToken,
                    liquidityPool,
                    borrowToken,
                    expectedValue,
                  );
                }
              }
              const value = await strategyManager[action.action](
                testingStrategyManager.address,
                underlyingToken,
                strategyHash,
              );
              expect(value).to.be.equal(expectedValue);
              if (action.expectedValue === "=0") {
                expect(value).to.be.equal(0);
              } else if (action.expectedValue === ">0") {
                expect(value).to.be.gt(0);
              }
              break;
            }
          }
        }
        for (let i = 0; i < story.cleanActions.length; i++) {
          const action = story.cleanActions[i];
          switch (action.action) {
            case "testPoolWithdrawAllCodes(address,address,bytes32,uint256,uint256)": {
              for (let i = 0; i < steps; i++) {
                const iterator = steps - 1 - i;
                await testingStrategyManager[action.action](
                  strategyManager.address,
                  underlyingToken,
                  strategyHash,
                  iterator,
                  steps,
                );
              }
              expect(await ERC20Instance.balanceOf(testingStrategyManager.address)).to.be.gt(0);
              break;
            }
          }
        }
      });
    }
  }
});
