import chai, { expect, assert } from "chai";
import { solidity } from "ethereum-waffle";
import hre from "hardhat";
import { Contract, Signer, BigNumber, utils } from "ethers";
import { getAddress } from "ethers/lib/utils";
import Compound from "@compound-finance/compound-js";
import { CONTRACTS } from "../../../helpers/type";
import { TESTING_DEPLOYMENT_ONCE, ADDRESS_ZERO } from "../../../helpers/constants/utils";
import { VAULT_TOKENS } from "../../../helpers/constants/tokens";
import { CREAM_ADAPTER_NAME } from "../../../helpers/constants/adapters";
import { TypedAdapterStrategies, TypedTokens, TypedDefiPools, TypedTokenHolders } from "../../../helpers/data";
import { deployAdapter, deployAdapterPrerequisites } from "../../../helpers/contracts-deployments";
import {
  fundWalletToken,
  getBlockTimestamp,
  lpPausedStatus,
  executeComptrollerFunc,
} from "../../../helpers/contracts-actions";
import scenarios from "../scenarios/adapters.json";
//  TODO: This file is temporarily being used until all the adapters testing doesn't adapt this file
import testDeFiAdaptersScenario from "../scenarios/compound-temp-defi-adapter.json";
import { deployContract, getDefaultFundAmountInDecimal } from "../../../helpers/helpers";
import { to_10powNumber_BN } from "../../../helpers/utils";
import { ERC20 } from "../../../typechain/ERC20";

chai.use(solidity);

type ARGUMENTS = {
  amount?: { [key: string]: string };
};

type TEST_DEFI_ADAPTER_ARGUMENTS = {
  mode?: string;
  maxDepositProtocolPct?: string;
  maxDepositPoolPct?: string;
  maxDepositAmount?: string;
};

describe(`${CREAM_ADAPTER_NAME} Unit Test`, () => {
  const strategies = TypedAdapterStrategies[CREAM_ADAPTER_NAME];
  const MAX_AMOUNT = BigNumber.from("20000000");
  let adapterPrerequisites: CONTRACTS;
  let adapter: Contract;
  let ownerAddress: string;
  let users: { [key: string]: Signer };
  before(async () => {
    try {
      const [owner, admin, user1] = await hre.ethers.getSigners();
      users = { owner, admin, user1 };
      ownerAddress = await owner.getAddress();
      adapterPrerequisites = await deployAdapterPrerequisites(hre, owner, TESTING_DEPLOYMENT_ONCE);
      assert.isDefined(adapterPrerequisites, "Adapter pre-requisites contracts not deployed");
      adapter = await deployAdapter(
        hre,
        owner,
        CREAM_ADAPTER_NAME,
        adapterPrerequisites["registry"].address,
        TESTING_DEPLOYMENT_ONCE,
      );
      assert.isDefined(adapter, "Adapter not deployed");
    } catch (error: any) {
      console.log(error);
    }
  });

  for (let i = 0; i < strategies.length; i++) {
    describe(`test getCodes() for ${strategies[i].strategyName}`, async () => {
      const strategy = strategies[i];
      const token = VAULT_TOKENS[strategy.token].address;
      let lpToken: string;
      before(async () => {
        try {
          const timestamp = (await getBlockTimestamp(hre)) * 2;
          await fundWalletToken(hre, token, users["owner"], MAX_AMOUNT, timestamp);
          lpToken = await adapter.getLiquidityPoolToken(token, strategy.strategy[0].contract);
        } catch (error: any) {
          console.error(error);
        }
      });

      for (let i = 0; i < scenarios.stories.length; i++) {
        it(scenarios.stories[i].description, async () => {
          const story = scenarios.stories[i];
          for (let i = 0; i < story.actions.length; i++) {
            const action = story.actions[i];
            switch (action.action) {
              case "getDepositSomeCodes(address,address,address,uint256)":
              case "getDepositAllCodes(address,address,address)": {
                let codes;
                let depositAmount;
                if (action.action === "getDepositSomeCodes(address,address,address,uint256)") {
                  const { amount }: ARGUMENTS = action.args;
                  if (amount) {
                    codes = await adapter[action.action](
                      ownerAddress,
                      token,
                      strategy.strategy[0].contract,
                      amount[strategy.token],
                    );
                    depositAmount = amount[strategy.token];
                  }
                } else {
                  codes = await adapter[action.action](ownerAddress, token, strategy.strategy[0].contract);
                }
                for (let i = 0; i < codes.length; i++) {
                  if (i < 2) {
                    const inter = new utils.Interface(["function approve(address,uint256)"]);
                    const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                    expect(address).to.equal(token);
                    const value = inter.decodeFunctionData("approve", abiCode);
                    expect(value[0]).to.equal(strategy.strategy[0].contract);
                    if (action.action === "getDepositSomeCodes(address,address,address,uint256)") {
                      expect(value[1]).to.equal(i === 0 ? 0 : depositAmount);
                    }
                  } else {
                    const inter = new utils.Interface(["function mint(uint256)"]);
                    const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                    expect(address).to.equal(strategy.strategy[0].contract);
                    const value = inter.decodeFunctionData("mint", abiCode);
                    if (action.action === "getDepositSomeCodes(address,address,address,uint256)") {
                      expect(value[0]).to.equal(depositAmount);
                    }
                  }
                }
                break;
              }
              case "getWithdrawAllCodes(address,address,address)":
              case "getWithdrawSomeCodes(address,address,address,uint256)": {
                let codes;
                let withdrawAmount;
                if (action.action === "getWithdrawSomeCodes(address,address,address,uint256)") {
                  const { amount }: ARGUMENTS = action.args;
                  if (amount) {
                    codes = await adapter[action.action](
                      ownerAddress,
                      token,
                      strategy.strategy[0].contract,
                      amount[strategy.token],
                    );
                    withdrawAmount = amount[strategy.token];
                  }
                } else {
                  codes = await adapter[action.action](ownerAddress, token, strategy.strategy[0].contract);
                }

                for (let i = 0; i < codes.length; i++) {
                  const inter = new utils.Interface(["function redeem(uint256)"]);
                  const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                  expect(address).to.be.equal(lpToken);
                  const value = inter.decodeFunctionData("redeem", abiCode);
                  if (action.action === "getWithdrawSomeCodes(address,address,address,uint256)") {
                    expect(value[0]).to.be.equal(withdrawAmount);
                  }
                }
                break;
              }
            }
          }
        }).timeout(150000);
      }
    });
  }

  describe(`CreamAdapter pools test`, async () => {
    let testDeFiAdapter: Contract;

    before(async () => {
      testDeFiAdapter = await deployContract(hre, "TestDeFiAdapter", TESTING_DEPLOYMENT_ONCE, users["owner"], []);
    });

    const pools = Object.keys(TypedDefiPools[CREAM_ADAPTER_NAME]);

    describe(`Test-${CREAM_ADAPTER_NAME}`, () => {
      for (const pool of pools) {
        const poolDetail = TypedDefiPools[CREAM_ADAPTER_NAME][pool];
        const liquidityPool = poolDetail.pool;
        const underlyingTokenAddress =
          getAddress(poolDetail.tokens[0]) == getAddress(TypedTokens.ETH)
            ? getAddress(TypedTokens.WETH)
            : getAddress(TypedDefiPools[CREAM_ADAPTER_NAME][pool].tokens[0]);

        if (TypedDefiPools[CREAM_ADAPTER_NAME][pool].tokens.length == 1) {
          for (let i = 0; i < testDeFiAdaptersScenario.stories.length; i++) {
            it(`${pool} - ${testDeFiAdaptersScenario.stories[i].description}`, async function () {
              const story = testDeFiAdaptersScenario.stories[i];
              const lpContract = await hre.ethers.getContractAt(Compound.util.getAbi("cErc20"), liquidityPool);

              const ERC20Instance = <ERC20>await hre.ethers.getContractAt("ERC20", underlyingTokenAddress);
              const LpERC20Instance = await hre.ethers.getContractAt("ERC20", liquidityPool);
              const getLPERC20Code = await LpERC20Instance.provider.getCode(LpERC20Instance.address);
              const getERC20Code = await ERC20Instance.provider.getCode(ERC20Instance.address);
              const getLPCode = await lpContract.provider.getCode(lpContract.address);
              let poolValue: BigNumber = BigNumber.from("0");
              if (getLPCode !== "0x") {
                poolValue = await adapter.getPoolValue(liquidityPool, underlyingTokenAddress);
              }
              if (getLPERC20Code !== "0x" && getERC20Code !== "0x" && getLPCode !== "0x" && +poolValue > 0) {
                const compTroller = await lpContract.comptroller();
                const rewardTokenAddress = await adapter.getRewardToken(liquidityPool);
                let RewardTokenERC20Instance: Contract;
                if (!(rewardTokenAddress == ADDRESS_ZERO)) {
                  RewardTokenERC20Instance = await hre.ethers.getContractAt("ERC20", rewardTokenAddress);
                }
                const compRate = await executeComptrollerFunc(
                  hre,
                  compTroller,
                  "function compRate() returns (uint256)",
                  [],
                );

                const lpPauseStatus = await lpPausedStatus(hre, getAddress(liquidityPool), compTroller);

                const decimals = await ERC20Instance.decimals();

                let limit: BigNumber = hre.ethers.BigNumber.from(0);
                let defaultFundAmount: BigNumber = getDefaultFundAmountInDecimal(underlyingTokenAddress, decimals);
                let underlyingBalanceBefore: BigNumber = hre.ethers.BigNumber.from(0);
                let rewardTokenBalanceBefore: BigNumber = hre.ethers.BigNumber.from(0);
                let isTestingRewardTokenDistribution: boolean = false;
                const timestamp = (await getBlockTimestamp(hre)) * 2;
                let availableToHarvestToken: BigNumber = hre.ethers.BigNumber.from(0);
                let isTestingHarvest = false;

                for (const action of story.setActions) {
                  switch (action.action) {
                    case "setMaxDepositProtocolMode(uint8)": {
                      const { mode }: TEST_DEFI_ADAPTER_ARGUMENTS = action.args!;
                      if (mode) {
                        const existingMode = await adapter.maxDepositProtocolMode();
                        if (existingMode != mode) {
                          await expect(adapter[action.action](mode))
                            .to.emit(adapter, "LogMaxDepositProtocolMode")
                            .withArgs(+mode, ownerAddress);
                        }
                      }
                      break;
                    }
                    case "setMaxDepositProtocolPct(uint256)": {
                      const existingPoolPct: BigNumber = await adapter.maxDepositPoolPct(liquidityPool);
                      if (!existingPoolPct.eq(BigNumber.from(0))) {
                        await adapter.setMaxDepositPoolPct(liquidityPool, 0);
                        const maxDepositPoolPctSetToZero = await adapter.maxDepositPoolPct(liquidityPool);
                        expect(+maxDepositPoolPctSetToZero).to.be.eq(0);
                      }
                      const { maxDepositProtocolPct }: TEST_DEFI_ADAPTER_ARGUMENTS = action.args!;
                      if (maxDepositProtocolPct) {
                        const convertedProtocolPct = BigNumber.from(maxDepositProtocolPct);
                        const existingProtocolPct: BigNumber = await adapter.maxDepositProtocolPct();
                        if (!existingProtocolPct.eq(convertedProtocolPct)) {
                          await expect(adapter[action.action](maxDepositProtocolPct))
                            .to.emit(adapter, "LogMaxDepositProtocolPct")
                            .withArgs(convertedProtocolPct, ownerAddress);
                        }
                        limit = poolValue.mul(convertedProtocolPct).div(BigNumber.from(10000));
                        defaultFundAmount = defaultFundAmount.lte(limit) ? defaultFundAmount : limit;
                      }
                      break;
                    }
                    case "setMaxDepositPoolPct(address,uint256)": {
                      const { maxDepositPoolPct }: TEST_DEFI_ADAPTER_ARGUMENTS = action.args!;
                      if (maxDepositPoolPct) {
                        const convertedPoolPct = BigNumber.from(maxDepositPoolPct);
                        const existingPoolPct: BigNumber = await adapter.maxDepositPoolPct(liquidityPool);
                        if (!existingPoolPct.eq(BigNumber.from(maxDepositPoolPct))) {
                          await expect(adapter[action.action](liquidityPool, convertedPoolPct))
                            .to.emit(adapter, "LogMaxDepositPoolPct")
                            .withArgs(convertedPoolPct, ownerAddress);
                        }
                        limit = poolValue.mul(convertedPoolPct).div(BigNumber.from(10000));
                        defaultFundAmount = defaultFundAmount.lte(limit) ? defaultFundAmount : limit;
                      }
                      break;
                    }
                    case "setMaxDepositAmount(address,address,uint256)": {
                      const { maxDepositAmount }: TEST_DEFI_ADAPTER_ARGUMENTS = action.args!;
                      let amount = BigNumber.from("0");
                      if (maxDepositAmount === ">") {
                        amount = defaultFundAmount.mul(BigNumber.from("10"));
                      } else if (maxDepositAmount === "<") {
                        amount = defaultFundAmount.div(BigNumber.from("10"));
                      }
                      const existingDepositAmount: BigNumber = await adapter.maxDepositAmount(
                        liquidityPool,
                        underlyingTokenAddress,
                      );
                      if (!existingDepositAmount.eq(amount)) {
                        await expect(adapter[action.action](liquidityPool, underlyingTokenAddress, amount))
                          .to.emit(adapter, "LogMaxDepositAmount")
                          .withArgs(amount, ownerAddress);
                      }
                      limit = amount;
                      break;
                    }
                    case "fundTestDeFiAdapterContract": {
                      const underlyingBalance: BigNumber = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      if (underlyingBalance.lt(defaultFundAmount)) {
                        await fundWalletToken(
                          hre,
                          underlyingTokenAddress,
                          users["owner"],
                          defaultFundAmount,
                          timestamp,
                          testDeFiAdapter.address,
                        );
                        defaultFundAmount = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      }
                      break;
                    }
                    case "fundTestDefiContractWithRewardToken()": {
                      if (
                        getAddress(underlyingTokenAddress) === getAddress(rewardTokenAddress) ||
                        TypedTokenHolders[pool.toUpperCase()]
                      ) {
                        this.skip();
                      }
                      if (!(rewardTokenAddress == ADDRESS_ZERO)) {
                        let compUnderlyingBalance: BigNumber = await RewardTokenERC20Instance!.balanceOf(
                          testDeFiAdapter.address,
                        );
                        if (+compUnderlyingBalance.lte(+0)) {
                          await fundWalletToken(
                            hre,
                            RewardTokenERC20Instance!.address,
                            users["owner"],
                            getDefaultFundAmountInDecimal(rewardTokenAddress, "18"),
                            timestamp,
                            testDeFiAdapter.address,
                          );
                          compUnderlyingBalance = await RewardTokenERC20Instance!.balanceOf(testDeFiAdapter.address);
                          expect(+compUnderlyingBalance).to.be.gt(+0);
                        }
                        availableToHarvestToken = await adapterPrerequisites.harvestCodeProvider.getOptimalTokenAmount(
                          rewardTokenAddress,
                          underlyingTokenAddress,
                          compUnderlyingBalance,
                        );
                      }
                      break;
                    }
                    case "testGetDepositAllCodes(address,address,address)": {
                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      if (lpPauseStatus && +limit !== 0) {
                        await expect(
                          testDeFiAdapter[action.action](underlyingTokenAddress, liquidityPool, adapter.address),
                        ).to.be.revertedWith("depositAll");
                      } else {
                        await testDeFiAdapter[action.action](underlyingTokenAddress, liquidityPool, adapter.address);
                      }
                      break;
                    }
                    case "testGetDepositSomeCodes(address,address,address,uint256)": {
                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      if (lpPauseStatus && +limit !== 0) {
                        await expect(
                          testDeFiAdapter[action.action](
                            underlyingTokenAddress,
                            liquidityPool,
                            adapter.address,
                            underlyingBalanceBefore,
                          ),
                        ).to.be.revertedWith("depositSome");
                      } else {
                        await testDeFiAdapter[action.action](
                          underlyingTokenAddress,
                          liquidityPool,
                          adapter.address,
                          underlyingBalanceBefore,
                        );
                      }
                      break;
                    }
                    case "testGetWithdrawAllCodes(address,address,address)": {
                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      await testDeFiAdapter[action.action](underlyingTokenAddress, liquidityPool, adapter.address);
                      break;
                    }
                    case "testGetWithdrawSomeCodes(address,address,address,uint256)": {
                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      const lpTokenBalance = await adapter.getLiquidityPoolTokenBalance(
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      await testDeFiAdapter[action.action](
                        underlyingTokenAddress,
                        liquidityPool,
                        adapter.address,
                        lpTokenBalance,
                      );

                      break;
                    }
                    case "testGetHarvestAllCodes(address,address,address)": {
                      //  TODO: This condition has to be added in the contract (OPTY-339)
                      if (
                        getAddress(underlyingTokenAddress) === getAddress(rewardTokenAddress) ||
                        TypedTokenHolders[pool.toUpperCase()]
                      ) {
                        this.skip();
                      }

                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      rewardTokenBalanceBefore = await RewardTokenERC20Instance!.balanceOf(testDeFiAdapter.address);
                      await testDeFiAdapter[action.action](liquidityPool, underlyingTokenAddress, adapter.address);
                      isTestingHarvest = true;
                      break;
                    }
                    case "testGetHarvestSomeCodes(address,address,address,uint256)": {
                      //  TODO: This condition has to be added in the contract (OPTY-339)
                      if (
                        getAddress(underlyingTokenAddress) === getAddress(rewardTokenAddress) ||
                        TypedTokenHolders[pool.toUpperCase()]
                      ) {
                        this.skip();
                      }
                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      rewardTokenBalanceBefore = await RewardTokenERC20Instance!.balanceOf(testDeFiAdapter.address);
                      await testDeFiAdapter[action.action](
                        liquidityPool,
                        underlyingTokenAddress,
                        adapter.address,
                        rewardTokenBalanceBefore,
                      );
                      isTestingHarvest = true;
                      break;
                    }
                    case "getUnclaimedRewardTokenAmount(address,address,address)": {
                      const unclaimedRewardTokenAmount = await adapter[action.action](
                        testDeFiAdapter.address,
                        liquidityPool,
                        ADDRESS_ZERO,
                      );
                      const expectedUnclaimedRewardTokenAmount = await executeComptrollerFunc(
                        hre,
                        compTroller,
                        "function compAccrued(address) returns (uint256)",
                        [testDeFiAdapter.address],
                      );
                      expect(unclaimedRewardTokenAmount).to.be.eq(expectedUnclaimedRewardTokenAmount);
                      break;
                    }
                    case "testGetClaimRewardTokenCode(address,address)": {
                      rewardTokenBalanceBefore = await RewardTokenERC20Instance!.balanceOf(testDeFiAdapter.address);
                      await testDeFiAdapter[action.action](liquidityPool, adapter.address);
                      isTestingRewardTokenDistribution = true;
                      break;
                    }
                  }
                }
                for (const action of story.getActions) {
                  switch (action.action) {
                    case "calculateAmountInLPToken(address,address,uint256)": {
                      const _depositAmount: BigNumber = getDefaultFundAmountInDecimal(underlyingTokenAddress, decimals);
                      const _amountInLPToken = await adapter[action.action](
                        underlyingTokenAddress,
                        liquidityPool,
                        _depositAmount,
                      );
                      const exchangeRateStored = await lpContract.exchangeRateStored();
                      const expectedAmountInLPToken = _depositAmount
                        .mul(to_10powNumber_BN(18))
                        .div(BigNumber.from(exchangeRateStored));
                      expect(_amountInLPToken).to.be.eq(expectedAmountInLPToken);
                      break;
                    }
                    case "getPoolValue(address,address)": {
                      const _poolValue = await adapter[action.action](liquidityPool, ADDRESS_ZERO);
                      const expectedPoolValue = await lpContract.getCash();
                      expect(_poolValue).to.be.eq(expectedPoolValue);
                      break;
                    }
                    case "getLiquidityPoolToken(address,address)": {
                      const _liquidityPool = await adapter[action.action](ADDRESS_ZERO, liquidityPool);
                      expect(getAddress(_liquidityPool)).to.be.eq(getAddress(liquidityPool));
                      break;
                    }
                    case "getSomeAmountInToken(address,address,uint256)": {
                      const _lpTokenAmount = getDefaultFundAmountInDecimal(liquidityPool, decimals);
                      if (+_lpTokenAmount > 0) {
                        const _amountInUnderlyingToken = await adapter[action.action](
                          ADDRESS_ZERO,
                          liquidityPool,
                          _lpTokenAmount,
                        );
                        const exchangeRateStored = await lpContract.exchangeRateStored();
                        const expectedAmountInUnderlyingToken = _lpTokenAmount
                          .mul(exchangeRateStored)
                          .div(to_10powNumber_BN(18));
                        expect(_amountInUnderlyingToken).to.be.eq(expectedAmountInUnderlyingToken);
                      }
                      break;
                    }
                    case "getUnderlyingTokens(address,address)": {
                      const _underlyingAddressFromAdapter = await adapter[action.action](liquidityPool, ADDRESS_ZERO);
                      let _underlyingAddressFromPoolContract: string;
                      //  @reason Underlying is considered WETH in case of lp = CETH and as CETH doesn't have underlying()
                      //  function because CETH has ETH as underlying.
                      if (getAddress(underlyingTokenAddress) == getAddress(TypedTokens.WETH)) {
                        _underlyingAddressFromPoolContract = TypedTokens.WETH;
                      } else {
                        _underlyingAddressFromPoolContract = await lpContract.underlying();
                      }
                      expect([getAddress(_underlyingAddressFromAdapter[0])]).to.have.members([
                        getAddress(_underlyingAddressFromPoolContract),
                      ]);
                      break;
                    }
                    case "getLiquidityPoolTokenBalance(address,address,address)": {
                      const expectedValue = action.expectedValue;
                      const expectedLpBalanceFromPool = await LpERC20Instance.balanceOf(testDeFiAdapter.address);
                      const lpTokenBalance = await adapter[action.action](
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      expect(+lpTokenBalance).to.be.eq(+expectedLpBalanceFromPool);
                      const existingMode = await adapter.maxDepositProtocolMode();
                      if (lpPauseStatus) {
                        expect(+lpTokenBalance).to.be.eq(0);
                      } else {
                        if (existingMode == 0) {
                          const existingDepositAmount: BigNumber = await adapter.maxDepositAmount(
                            liquidityPool,
                            underlyingTokenAddress,
                          );
                          if (existingDepositAmount.eq(0)) {
                            expect(+lpTokenBalance).to.be.eq(0);
                          } else {
                            expect(+lpTokenBalance).to.be.gt(0);
                          }
                        } else {
                          const existingPoolPct: BigNumber = await adapter.maxDepositPoolPct(liquidityPool);
                          const existingProtocolPct: BigNumber = await adapter.maxDepositProtocolPct();
                          if (existingPoolPct.eq(0) && existingProtocolPct.eq(0)) {
                            expect(+lpTokenBalance).to.be.eq(0);
                          } else if (!existingPoolPct.eq(0) || !existingProtocolPct.eq(0)) {
                            expectedValue == "=0"
                              ? expect(+lpTokenBalance).to.be.eq(0)
                              : expect(+lpTokenBalance).to.be.gt(0);
                          }
                        }
                      }

                      break;
                    }
                    case "balanceOf(address)": {
                      const expectedValue = action.expectedValue;
                      const underlyingBalanceAfter: BigNumber = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      if (lpPauseStatus || (isTestingHarvest && +availableToHarvestToken === 0)) {
                        expect(+underlyingBalanceAfter).to.be.gte(+underlyingBalanceBefore);
                      } else {
                        if (underlyingBalanceBefore.lt(limit)) {
                          expectedValue == ">0"
                            ? expect(+underlyingBalanceAfter).to.be.gt(+underlyingBalanceBefore)
                            : expect(+underlyingBalanceAfter).to.be.eq(0);
                        } else {
                          expectedValue == ">0"
                            ? expect(+underlyingBalanceAfter).to.be.gt(+underlyingBalanceBefore)
                            : expect(+underlyingBalanceAfter).to.be.eq(+underlyingBalanceBefore.sub(limit));
                        }
                      }
                      break;
                    }
                    case "getRewardTokenBalance(address)": {
                      const rewardTokenBalanceAfter: BigNumber = await RewardTokenERC20Instance!.balanceOf(
                        testDeFiAdapter.address,
                      );
                      const expectedValue = action.expectedValue;

                      if (
                        (+compRate === 0 && isTestingRewardTokenDistribution) ||
                        (isTestingHarvest && +availableToHarvestToken === 0)
                      ) {
                        expect(+rewardTokenBalanceAfter).to.be.eq(+rewardTokenBalanceBefore);
                      } else {
                        expectedValue == ">0"
                          ? expect(+rewardTokenBalanceAfter).to.be.gt(+rewardTokenBalanceBefore)
                          : expectedValue == "=0"
                          ? expect(+rewardTokenBalanceAfter).to.be.eq(0)
                          : expect(+rewardTokenBalanceAfter).to.be.lt(+rewardTokenBalanceBefore);
                      }
                      break;
                    }
                    case "getAllAmountInToken(address,address,address)": {
                      const _amountInUnderlyingToken = await adapter[action.action](
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      const _lpTokenBalance = await adapter.getLiquidityPoolTokenBalance(
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      let expectedAmountInUnderlyingToken: BigNumber = await adapter.getSomeAmountInToken(
                        underlyingTokenAddress,
                        liquidityPool,
                        _lpTokenBalance,
                      );
                      const _unclaimedReward: BigNumber = await adapter.getUnclaimedRewardTokenAmount(
                        testDeFiAdapter.address,
                        liquidityPool,
                        underlyingTokenAddress,
                      );
                      if (+_unclaimedReward > 0) {
                        expectedAmountInUnderlyingToken = expectedAmountInUnderlyingToken.add(
                          await adapterPrerequisites["harvestCodeProvider"].rewardBalanceInUnderlyingTokens(
                            rewardTokenAddress,
                            underlyingTokenAddress,
                            _unclaimedReward,
                          ),
                        );
                      }
                      expect(+_amountInUnderlyingToken).to.be.eq(+expectedAmountInUnderlyingToken);
                      break;
                    }
                    case "isRedeemableAmountSufficient(address,address,address,uint256)": {
                      const expectedValue = action.expectedValue;
                      const _amountInUnderlyingToken: BigNumber = await adapter.getAllAmountInToken(
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      if (expectedValue == ">") {
                        const _isRedeemableAmountSufficient = await adapter[action.action](
                          testDeFiAdapter.address,
                          underlyingTokenAddress,
                          liquidityPool,
                          _amountInUnderlyingToken.add(BigNumber.from(10)),
                        );
                        expect(_isRedeemableAmountSufficient).to.be.eq(false);
                      } else if (expectedValue == "<") {
                        const _isRedeemableAmountSufficient = await adapter[action.action](
                          testDeFiAdapter.address,
                          underlyingTokenAddress,
                          liquidityPool,
                          +_amountInUnderlyingToken > 0
                            ? _amountInUnderlyingToken.sub(BigNumber.from(10))
                            : BigNumber.from(0),
                        );
                        expect(_isRedeemableAmountSufficient).to.be.eq(true);
                      }
                      break;
                    }
                    case "calculateRedeemableLPTokenAmount(address,address,address,uint256)": {
                      const _lpTokenBalance: BigNumber = await adapter.getLiquidityPoolTokenBalance(
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      const _balanceInToken: BigNumber = await adapter.getAllAmountInToken(
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );

                      if (lpPauseStatus) {
                        expect(+_lpTokenBalance).to.eq(0);
                        expect(+_balanceInToken).to.eq(0);
                      } else {
                        const _testRedeemAmount: BigNumber = _lpTokenBalance;

                        const _redeemableLpTokenAmt = await adapter[action.action](
                          testDeFiAdapter.address,
                          underlyingTokenAddress,
                          liquidityPool,
                          _testRedeemAmount,
                        );
                        const expectedRedeemableLpTokenAmt = _lpTokenBalance
                          .mul(_testRedeemAmount)
                          .div(_balanceInToken)
                          .add(BigNumber.from(1));
                        expect(_redeemableLpTokenAmt).to.be.eq(expectedRedeemableLpTokenAmt);
                      }

                      break;
                    }
                    case "getRewardToken(address)": {
                      expect(getAddress(await adapter[action.action](liquidityPool))).to.be.eq(
                        await executeComptrollerFunc(
                          hre,
                          compTroller,
                          "function getCompAddress() returns (address)",
                          [],
                        ),
                      );
                      break;
                    }
                  }
                }
                for (const action of story.cleanActions) {
                  switch (action.action) {
                    case "testGetWithdrawAllCodes(address,address,address)": {
                      await testDeFiAdapter[action.action](underlyingTokenAddress, liquidityPool, adapter.address);
                      break;
                    }
                  }
                }
                for (const action of story.getActions) {
                  switch (action.action) {
                    case "getLiquidityPoolTokenBalance(address,address,address)": {
                      const lpTokenBalance = await adapter[action.action](
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      expect(lpTokenBalance).to.be.eq(0);
                      break;
                    }
                    case "balanceOf(address)": {
                      const underlyingBalance: BigNumber = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      expect(underlyingBalance).to.be.gt(0);
                      break;
                    }
                  }
                }
              } else {
                return this.skip();
              }
            });
          }
        }
      }
      for (let i = 0; i < testDeFiAdaptersScenario?.adapterStandaloneStories.length; i++) {
        it(`${testDeFiAdaptersScenario?.adapterStandaloneStories[i].description}`, async function () {
          const story = testDeFiAdaptersScenario.adapterStandaloneStories[i];
          for (const action of story.setActions) {
            switch (action.action) {
              case "canStake(address)": {
                const _canStake = await adapter[action.action](ADDRESS_ZERO);
                expect(_canStake).to.be.eq(false);
                break;
              }
            }
          }
        });
      }
    });
  });
});
