import chai, { expect } from "chai";
import hre from "hardhat";
import { Contract, Signer, BigNumber } from "ethers";
import { solidity } from "ethereum-waffle";
import { CONTRACTS, MOCK_CONTRACTS } from "../../helpers/type";
import {
  generateStrategyHash,
  deployContract,
  deploySmockContract,
  retrieveAdapterFromStrategyName,
  getDefaultFundAmountInDecimal,
} from "../../helpers/helpers";
import { TESTING_DEPLOYMENT_ONCE, ADDRESS_ZERO } from "../../helpers/constants/utils";
import { REWARD_TOKENS } from "../../helpers/constants/tokens";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { TESTING_CONTRACTS } from "../../helpers/constants/test-contracts-name";
import {
  SUSHISWAP_ADAPTER_NAME,
  CURVE_SWAP_POOL_ADAPTER_NAME,
  CURVE_DEPOSIT_POOL_ADAPTER_NAME,
} from "../../helpers/constants/adapters";
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
      sideContracts["investStrategyRegistry"] = await deploySmockContract(
        smock,
        ESSENTIAL_CONTRACTS.INVEST_STRATEGY_REGISTRY,
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
      sideContracts["registry"].getInvestStrategyRegistry.returns(sideContracts["investStrategyRegistry"].address);
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
    describe(strategyDetail.strategyName, async () => {
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
              case "checkAddLiquidity": {
                if (!adapterNames.includes(SUSHISWAP_ADAPTER_NAME)) {
                  this.skip();
                }
                break;
              }
              case "checkHarvestability": {
                const rewardTokenAdapters = Object.keys(REWARD_TOKENS);
                rewardTokenAdapters.push(CURVE_SWAP_POOL_ADAPTER_NAME, CURVE_DEPOSIT_POOL_ADAPTER_NAME);
                if (!rewardTokenAdapters.includes(adapterNames[steps - 1])) {
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
                sideContracts["investStrategyRegistry"].getStrategy.returns([
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
                      rewardTokenAddress,
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
                const count = await strategyManager.getDepositAllStepsCount(strategyHash);
                for (let i = 0; i < count; i++) {
                  await testingStrategyManager[action.action](
                    strategyManager.address,
                    underlyingToken,
                    strategyHash,
                    i,
                    count,
                  );
                }
                break;
              }
              case "testPoolWithdrawAllCodes(address,address,bytes32,uint256,uint256)": {
                underlyingBalanceBefore = await ERC20Instance.balanceOf(testingStrategyManager.address);
                const count = await strategyManager.getWithdrawAllStepsCount(strategyHash);
                for (let i = 0; i < count; i++) {
                  const iterator = count - 1 - i;
                  await testingStrategyManager[action.action](
                    strategyManager.address,
                    underlyingToken,
                    strategyHash,
                    iterator,
                    count,
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
                await testingStrategyManager[action.action](
                  strategyManager.address,
                  underlyingToken,
                  strategyHash,
                  [0, 0],
                );
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
                const ownerBalanceBefore = await ERC20Instance.balanceOf(ownerAddress);
                const userBalanceBefore = await ERC20Instance.balanceOf(userAddress);
                await testingStrategyManager[action.action](
                  strategyManager.address,
                  underlyingToken,
                  ownerAddress,
                  defaultFundAmount,
                  treasuryShare,
                );
                const halfAmount = defaultFundAmount.div(2);
                const expectedUserBalance = halfAmount.add(userBalanceBefore);
                const expectedOwnerBalance = defaultFundAmount.sub(halfAmount).add(ownerBalanceBefore);
                expect(await ERC20Instance.balanceOf(ownerAddress)).to.be.equal(expectedOwnerBalance);
                expect(await ERC20Instance.balanceOf(userAddress)).to.be.equal(expectedUserBalance);
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
                  expect(underlyingBalanceAfter).to.be.gte(rewardTokenBalanceBefore);
                }
                break;
              }
              case "getDepositAllStepsCount(bytes32)": {
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
                  const inputToken =
                    iterator === 0 ? underlyingToken : strategyDetail.strategy[iterator - 1].outputToken;
                  if (!strategyDetail.strategy[iterator].isBorrow) {
                    if (iterator === steps - 1) {
                      if (await adapter.canStake(liquidityPool)) {
                        expectedValue =
                          action.action === "getBalanceInUnderlyingTokenWrite(address,address,bytes32)"
                            ? await adapter.callStatic.getAllAmountInTokenStakeWrite(
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
                const value =
                  action.action === "getBalanceInUnderlyingTokenWrite(address,address,bytes32)"
                    ? await strategyManager.callStatic[action.action](
                        testingStrategyManager.address,
                        underlyingToken,
                        strategyHash,
                      )
                    : await strategyManager[action.action](
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
              case "getRewardToken(bytes32)": {
                const lastStep = strategyDetail.strategy[steps - 1];
                expect(await strategyManager.getRewardToken(strategyHash)).to.be.equal(
                  await adapters[adapterNames[steps - 1]].getRewardToken(lastStep.contract),
                );
                break;
              }
            }
          }
          for (let i = 0; i < story.cleanActions.length; i++) {
            const action = story.cleanActions[i];
            switch (action.action) {
              case "testPoolWithdrawAllCodes(address,address,bytes32,uint256,uint256)": {
                const count = await strategyManager.getWithdrawAllStepsCount(strategyHash);
                for (let i = 0; i < count; i++) {
                  const iterator = count - 1 - i;
                  await testingStrategyManager[action.action](
                    strategyManager.address,
                    underlyingToken,
                    strategyHash,
                    iterator,
                    count,
                  );
                }
                expect(await ERC20Instance.balanceOf(testingStrategyManager.address)).to.be.gt(0);
                break;
              }
            }
          }
        });
      }
    });
  }

  for (let i = 0; i < scenario.standaloneStories.length; i++) {
    const story = scenario.standaloneStories[i];
    it(`${story.description}`, async () => {
      for (let i = 0; i < story.setActions.length; i++) {
        const action = story.setActions[i];
        switch (action.action) {
          case "testUpdateUserRewardsCodes(address,address,address)": {
            const ownerAddress = await owner.getAddress();
            await testingStrategyManager[action.action](
              strategyManager.address,
              sideContracts["opty"].address,
              ownerAddress,
            );
            expect(await sideContracts["optyDistributor"].optyAccrued(ownerAddress)).to.be.gt(0);
            expect(
              await sideContracts["optyDistributor"].lastUserUpdate(sideContracts["opty"].address, ownerAddress),
            ).to.be.gt(0);
            expect(await sideContracts["vaultBooster"].odefiAccrued(ownerAddress)).to.be.gt(0);
            expect(
              await sideContracts["vaultBooster"].lastUserUpdate(sideContracts["opty"].address, ownerAddress),
            ).to.be.gt(0);
            break;
          }
          case "testUpdateUserStateInVaultCodes(address,address,address)": {
            const ownerAddress = await owner.getAddress();
            await testingStrategyManager[action.action](
              strategyManager.address,
              sideContracts["opty"].address,
              ownerAddress,
            );

            let value = await sideContracts["optyDistributor"].optyUserStateInVault(
              sideContracts["opty"].address,
              ownerAddress,
            );
            expect(value.index).to.be.gte(0);
            expect(value.timestamp).to.be.gte(0);

            value = await sideContracts["vaultBooster"].odefiUserStateInVault(
              sideContracts["opty"].address,
              ownerAddress,
            );
            expect(value.index).to.be.gte(0);
            expect(value.timestamp).to.be.gte(0);

            break;
          }
          case "testUpdateRewardVaultRateAndIndexCodes(address,address)": {
            await testingStrategyManager[action.action](strategyManager.address, sideContracts["opty"].address);
            expect(
              await sideContracts["optyDistributor"].optyVaultRatePerSecondAndVaultToken(sideContracts["opty"].address),
            ).to.be.gt(0);
            expect(
              (await sideContracts["optyDistributor"].optyVaultState(sideContracts["opty"].address)).index,
            ).to.be.gte(0);
            expect(
              await sideContracts["optyDistributor"].optyVaultStartTimestamp(sideContracts["opty"].address),
            ).to.be.gt(0);

            expect(
              await sideContracts["vaultBooster"].odefiVaultRatePerSecondAndVaultToken(sideContracts["opty"].address),
            ).to.be.gt(0);
            expect(
              (await sideContracts["vaultBooster"].odefiVaultState(sideContracts["opty"].address)).index,
            ).to.be.gte(0);
            expect(
              await sideContracts["vaultBooster"].odefiVaultStartTimestamp(sideContracts["opty"].address),
            ).to.be.gt(0);
            break;
          }
        }
      }
    });
  }
});

describe("optyDistributor=ZERO_ADDRESS, odefiVaultBooster=ZERO_ADDRESS", () => {
  const sideContracts: MOCK_CONTRACTS = {};
  let strategyManager: Contract;
  let testingStrategyManager: Contract;
  let owner: Signer;
  let ownerAddress: string;
  before(async () => {
    try {
      [owner] = await hre.ethers.getSigners();
      ownerAddress = await owner.getAddress();
      sideContracts["registry"] = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.REGISTRY, []);
      sideContracts["vault"] = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.OPTY, [
        sideContracts["registry"].address,
        100000000000000,
      ]);
      sideContracts["vault"].balanceOf.returns(100000000000000);
      sideContracts["optyDistributor"] = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.OPTY_DISTRIBUTOR, [
        sideContracts["registry"].address,
        sideContracts["vault"].address,
        1700000000,
      ]);
      sideContracts["vaultBooster"] = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.ODEFI_VAULT_BOOSTER, [
        sideContracts["registry"].address,
        sideContracts["vault"].address,
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
      sideContracts["registry"].getOPTYDistributor.returns(ADDRESS_ZERO);
      sideContracts["registry"].getODEFIVaultBooster.returns(ADDRESS_ZERO);
    } catch (error) {
      console.log(error);
    }
  });
  for (let i = 0; i < scenario.standaloneStories.length; i++) {
    const story = scenario.standaloneStories[i];
    it(`${story.description}`, async () => {
      for (let i = 0; i < story.setActions.length; i++) {
        const action = story.setActions[i];
        switch (action.action) {
          case "testUpdateUserRewardsCodes(address,address,address)": {
            await testingStrategyManager[action.action](
              strategyManager.address,
              sideContracts["vault"].address,
              ownerAddress,
            );
            expect(await sideContracts["optyDistributor"].optyAccrued(ownerAddress)).to.equal(0);
            expect(
              await sideContracts["optyDistributor"].lastUserUpdate(sideContracts["vault"].address, ownerAddress),
            ).to.equal(0);
            expect(await sideContracts["vaultBooster"].odefiAccrued(ownerAddress)).to.equal(0);
            expect(
              await sideContracts["vaultBooster"].lastUserUpdate(sideContracts["vault"].address, ownerAddress),
            ).to.equal(0);
            break;
          }
          case "testUpdateUserStateInVaultCodes(address,address,address)": {
            await testingStrategyManager[action.action](
              strategyManager.address,
              sideContracts["vault"].address,
              ownerAddress,
            );

            let value = await sideContracts["optyDistributor"].optyUserStateInVault(
              sideContracts["vault"].address,
              ownerAddress,
            );
            expect(value.index).to.equal(0);
            expect(value.timestamp).to.equal(0);

            value = await sideContracts["vaultBooster"].odefiUserStateInVault(
              sideContracts["vault"].address,
              ownerAddress,
            );
            expect(value.index).to.equal(0);
            expect(value.timestamp).to.equal(0);

            break;
          }
          case "testUpdateRewardVaultRateAndIndexCodes(address,address)": {
            await testingStrategyManager[action.action](strategyManager.address, sideContracts["vault"].address);
            expect(
              await sideContracts["optyDistributor"].optyVaultRatePerSecondAndVaultToken(
                sideContracts["vault"].address,
              ),
            ).to.equal(0);
            expect(
              (await sideContracts["optyDistributor"].optyVaultState(sideContracts["vault"].address)).index,
            ).to.equal(0);
            expect(
              await sideContracts["optyDistributor"].optyVaultStartTimestamp(sideContracts["vault"].address),
            ).to.equal(0);

            expect(
              await sideContracts["vaultBooster"].odefiVaultRatePerSecondAndVaultToken(sideContracts["vault"].address),
            ).to.equal(0);
            expect(
              (await sideContracts["vaultBooster"].odefiVaultState(sideContracts["vault"].address)).index,
            ).to.equal(0);
            expect(
              await sideContracts["vaultBooster"].odefiVaultStartTimestamp(sideContracts["vault"].address),
            ).to.equal(0);
            break;
          }
        }
      }
    });
  }
});

describe("optyDistributor=ZERO_ADDRESS", () => {
  const sideContracts: MOCK_CONTRACTS = {};
  let strategyManager: Contract;
  let testingStrategyManager: Contract;
  let owner: Signer;
  let ownerAddress: string;
  before(async () => {
    try {
      [owner] = await hre.ethers.getSigners();
      ownerAddress = await owner.getAddress();
      sideContracts["registry"] = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.REGISTRY, []);
      sideContracts["vault"] = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.OPTY, [
        sideContracts["registry"].address,
        100000000000000,
      ]);
      sideContracts["vault"].balanceOf.returns(100000000000000);
      sideContracts["optyDistributor"] = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.OPTY_DISTRIBUTOR, [
        sideContracts["registry"].address,
        sideContracts["vault"].address,
        1700000000,
      ]);
      sideContracts["vaultBooster"] = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.ODEFI_VAULT_BOOSTER, [
        sideContracts["registry"].address,
        sideContracts["vault"].address,
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
      sideContracts["registry"].getOPTYDistributor.returns(ADDRESS_ZERO);
      sideContracts["registry"].getODEFIVaultBooster.returns(sideContracts["vaultBooster"].address);
      await sideContracts["vaultBooster"].setODEFIRewarder(sideContracts["vault"].address, ownerAddress);
      await sideContracts["vaultBooster"].setOdefiVaultRate(sideContracts["vault"].address, 1000);
    } catch (error) {
      console.log(error);
    }
  });
  for (let i = 0; i < scenario.standaloneStories.length; i++) {
    const story = scenario.standaloneStories[i];
    it(`${story.description}`, async () => {
      for (let i = 0; i < story.setActions.length; i++) {
        const action = story.setActions[i];
        switch (action.action) {
          case "testUpdateUserRewardsCodes(address,address,address)": {
            await testingStrategyManager[action.action](
              strategyManager.address,
              sideContracts["vault"].address,
              ownerAddress,
            );
            expect(await sideContracts["optyDistributor"].optyAccrued(ownerAddress)).to.equal(0);
            expect(
              await sideContracts["optyDistributor"].lastUserUpdate(sideContracts["vault"].address, ownerAddress),
            ).to.equal(0);
            expect(await sideContracts["vaultBooster"].odefiAccrued(ownerAddress)).to.gt(0);
            expect(
              await sideContracts["vaultBooster"].lastUserUpdate(sideContracts["vault"].address, ownerAddress),
            ).to.gt(0);
            break;
          }
          case "testUpdateUserStateInVaultCodes(address,address,address)": {
            await testingStrategyManager[action.action](
              strategyManager.address,
              sideContracts["vault"].address,
              ownerAddress,
            );

            let value = await sideContracts["optyDistributor"].optyUserStateInVault(
              sideContracts["vault"].address,
              ownerAddress,
            );
            expect(value.index).to.equal(0);
            expect(value.timestamp).to.equal(0);

            value = await sideContracts["vaultBooster"].odefiUserStateInVault(
              sideContracts["vault"].address,
              ownerAddress,
            );
            expect(value.index).to.gt(0);
            expect(value.timestamp).to.gt(0);

            break;
          }
          case "testUpdateRewardVaultRateAndIndexCodes(address,address)": {
            await testingStrategyManager[action.action](strategyManager.address, sideContracts["vault"].address);
            expect(
              await sideContracts["optyDistributor"].optyVaultRatePerSecondAndVaultToken(
                sideContracts["vault"].address,
              ),
            ).to.equal(0);
            expect(
              (await sideContracts["optyDistributor"].optyVaultState(sideContracts["vault"].address)).index,
            ).to.equal(0);
            expect(
              await sideContracts["optyDistributor"].optyVaultStartTimestamp(sideContracts["vault"].address),
            ).to.equal(0);

            expect(
              await sideContracts["vaultBooster"].odefiVaultRatePerSecondAndVaultToken(sideContracts["vault"].address),
            ).to.gt(0);
            expect((await sideContracts["vaultBooster"].odefiVaultState(sideContracts["vault"].address)).index).to.gt(
              0,
            );
            expect(await sideContracts["vaultBooster"].odefiVaultStartTimestamp(sideContracts["vault"].address)).to.gt(
              0,
            );
            break;
          }
        }
      }
    });
  }
});

describe("odefiVaultBooster=ZERO_ADDRESS", () => {
  const sideContracts: MOCK_CONTRACTS = {};
  let strategyManager: Contract;
  let testingStrategyManager: Contract;
  let owner: Signer;
  let ownerAddress: string;
  before(async () => {
    try {
      [owner] = await hre.ethers.getSigners();
      ownerAddress = await owner.getAddress();
      sideContracts["registry"] = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.REGISTRY, []);
      sideContracts["vault"] = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.OPTY, [
        sideContracts["registry"].address,
        100000000000000,
      ]);
      sideContracts["vault"].balanceOf.returns(100000000000000);
      sideContracts["optyDistributor"] = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.OPTY_DISTRIBUTOR, [
        sideContracts["registry"].address,
        sideContracts["vault"].address,
        1700000000,
      ]);
      sideContracts["vaultBooster"] = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.ODEFI_VAULT_BOOSTER, [
        sideContracts["registry"].address,
        sideContracts["vault"].address,
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
      sideContracts["registry"].getOPTYDistributor.returns(sideContracts["optyDistributor"].address);
      sideContracts["registry"].getODEFIVaultBooster.returns(ADDRESS_ZERO);
      await sideContracts["optyDistributor"].setOptyVaultRate(sideContracts["vault"].address, 1000);
    } catch (error) {
      console.log(error);
    }
  });
  for (let i = 0; i < scenario.standaloneStories.length; i++) {
    const story = scenario.standaloneStories[i];
    it(`${story.description}`, async () => {
      for (let i = 0; i < story.setActions.length; i++) {
        const action = story.setActions[i];
        switch (action.action) {
          case "testUpdateUserRewardsCodes(address,address,address)": {
            await testingStrategyManager[action.action](
              strategyManager.address,
              sideContracts["vault"].address,
              ownerAddress,
            );
            expect(await sideContracts["optyDistributor"].optyAccrued(ownerAddress)).to.gt(0);
            expect(
              await sideContracts["optyDistributor"].lastUserUpdate(sideContracts["vault"].address, ownerAddress),
            ).to.gt(0);
            expect(await sideContracts["vaultBooster"].odefiAccrued(ownerAddress)).to.equal(0);
            expect(
              await sideContracts["vaultBooster"].lastUserUpdate(sideContracts["vault"].address, ownerAddress),
            ).to.equal(0);
            break;
          }
          case "testUpdateUserStateInVaultCodes(address,address,address)": {
            await testingStrategyManager[action.action](
              strategyManager.address,
              sideContracts["vault"].address,
              ownerAddress,
            );

            let value = await sideContracts["optyDistributor"].optyUserStateInVault(
              sideContracts["vault"].address,
              ownerAddress,
            );
            expect(value.index).to.gt(0);
            expect(value.timestamp).to.gt(0);

            value = await sideContracts["vaultBooster"].odefiUserStateInVault(
              sideContracts["vault"].address,
              ownerAddress,
            );
            expect(value.index).to.equal(0);
            expect(value.timestamp).to.equal(0);

            break;
          }
          case "testUpdateRewardVaultRateAndIndexCodes(address,address)": {
            await testingStrategyManager[action.action](strategyManager.address, sideContracts["vault"].address);
            expect(
              await sideContracts["optyDistributor"].optyVaultRatePerSecondAndVaultToken(
                sideContracts["vault"].address,
              ),
            ).to.gt(0);
            expect((await sideContracts["optyDistributor"].optyVaultState(sideContracts["vault"].address)).index).to.gt(
              0,
            );
            expect(
              await sideContracts["optyDistributor"].optyVaultStartTimestamp(sideContracts["vault"].address),
            ).to.gt(0);

            expect(
              await sideContracts["vaultBooster"].odefiVaultRatePerSecondAndVaultToken(sideContracts["vault"].address),
            ).to.equal(0);
            expect(
              (await sideContracts["vaultBooster"].odefiVaultState(sideContracts["vault"].address)).index,
            ).to.equal(0);
            expect(
              await sideContracts["vaultBooster"].odefiVaultStartTimestamp(sideContracts["vault"].address),
            ).to.equal(0);
            break;
          }
        }
      }
    });
  }
});
