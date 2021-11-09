import chai, { expect, assert } from "chai";
import { solidity } from "ethereum-waffle";
import hre from "hardhat";
import { Contract, Signer, BigNumber, utils } from "ethers";
import { getAddress } from "ethers/lib/utils";
import { CONTRACTS } from "../../../helpers/type";
import { TESTING_DEPLOYMENT_ONCE, ADDRESS_ZERO } from "../../../helpers/constants/utils";
import { VAULT_TOKENS } from "../../../helpers/constants/tokens";
import { TESTING_CONTRACTS } from "../../../helpers/constants/test-contracts-name";
import { DFORCE_ADAPTER_NAME } from "../../../helpers/constants/adapters";
import { TypedAdapterStrategies, TypedTokens, TypedDefiPools, TypedTokenHolders } from "../../../helpers/data";
import { deployAdapter, deployAdapterPrerequisites } from "../../../helpers/contracts-deployments";
import { fundWalletToken, getBlockTimestamp } from "../../../helpers/contracts-actions";
import scenarios from "../scenarios/adapters.json";
//  TODO: This file is temporarily being used until all the adapters testing doesn't adapt this file
import testDeFiAdaptersScenario from "../scenarios/dforce-temp-defi-adapter.json";
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

describe(`${DFORCE_ADAPTER_NAME} Unit test`, () => {
  const strategies = TypedAdapterStrategies[DFORCE_ADAPTER_NAME];
  const MAX_AMOUNT = BigNumber.from("20000000000000000000");
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
        DFORCE_ADAPTER_NAME,
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
                    const inter = new utils.Interface(["function mint(address,uint256)"]);
                    const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                    expect(address).to.equal(strategy.strategy[0].contract);
                    const value = inter.decodeFunctionData("mint", abiCode);
                    expect(value[0]).to.equal(ownerAddress);
                    if (action.action === "getDepositSomeCodes(address,address,address,uint256)") {
                      expect(value[1]).to.equal(depositAmount);
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
                  const inter = new utils.Interface(["function redeem(address,uint256)"]);
                  const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                  expect(address).to.be.equal(lpToken);
                  const value = inter.decodeFunctionData("redeem", abiCode);
                  expect(value[0]).to.be.equal(ownerAddress);
                  if (action.action === "getWithdrawSomeCodes(address,address,address,uint256)") {
                    expect(value[1]).to.be.equal(withdrawAmount);
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

  describe(`DForce pools test`, async () => {
    let testDeFiAdapter: Contract;
    let dummyContract: Contract;
    before(async () => {
      testDeFiAdapter = await deployContract(
        hre,
        TESTING_CONTRACTS.TESTING_DEFI_ADAPTER,
        TESTING_DEPLOYMENT_ONCE,
        users["owner"],
        [],
      );
      dummyContract = await deployContract(
        hre,
        TESTING_CONTRACTS.TEST_DUMMY_EMPTY_CONTRACT,
        TESTING_DEPLOYMENT_ONCE,
        users["owner"],
        [],
      );
    });

    const pools = Object.keys(TypedDefiPools[DFORCE_ADAPTER_NAME]);

    describe(`Test-${DFORCE_ADAPTER_NAME}`, () => {
      for (const pool of pools) {
        const poolDetail = TypedDefiPools[DFORCE_ADAPTER_NAME][pool];
        const liquidityPool = poolDetail.pool;

        const underlyingTokenAddress =
          getAddress(poolDetail.tokens[0]) == getAddress(TypedTokens.ETH)
            ? getAddress(TypedTokens.WETH)
            : getAddress(TypedDefiPools[DFORCE_ADAPTER_NAME][pool].tokens[0]);

        if (TypedDefiPools[DFORCE_ADAPTER_NAME][pool].tokens.length == 1) {
          let lpContract: Contract;
          let lpStakingContract: Contract;
          let stopReward = false;
          before(async () => {
            lpContract = await hre.ethers.getContractAt("IDForceDeposit", liquidityPool);
            const stakingAddress = await adapter.liquidityPoolToStakingVault(liquidityPool);
            if (stakingAddress !== ADDRESS_ZERO) {
              lpStakingContract = await hre.ethers.getContractAt("IDForceStake", stakingAddress);
              const lockedDetails = lpStakingContract ? await lpStakingContract.lockedDetails() : "0";
              const currentTimestamp = await getBlockTimestamp(hre);
              if (lockedDetails[1].toString() < currentTimestamp.toString()) {
                stopReward = true;
              }
            }
          });
          for (let i = 0; i < testDeFiAdaptersScenario.stories.length; i++) {
            it(`${pool} - ${testDeFiAdaptersScenario.stories[i].description}`, async function () {
              const story = testDeFiAdaptersScenario.stories[i];

              const ERC20Instance = <ERC20>await hre.ethers.getContractAt("ERC20", underlyingTokenAddress);
              const LpERC20Instance = await hre.ethers.getContractAt("ERC20", liquidityPool);
              const getLPERC20Code = await LpERC20Instance.provider.getCode(LpERC20Instance.address);
              const getERC20Code = await ERC20Instance.provider.getCode(ERC20Instance.address);
              const getLPCode = await lpContract.provider.getCode(lpContract.address);
              let isTestingStakingFunction = false;
              let isTestingClaimRewardFunction = false;
              let poolValue: BigNumber = BigNumber.from("0");
              if (getLPCode !== "0x") {
                poolValue = await adapter.getPoolValue(liquidityPool, underlyingTokenAddress);
              }
              if (getLPERC20Code !== "0x" && getERC20Code !== "0x" && getLPCode !== "0x" && +poolValue > 0) {
                const rewardTokenAddress = pool !== "tusd" ? await adapter.getRewardToken(liquidityPool) : ADDRESS_ZERO;
                let RewardTokenERC20Instance: Contract;
                if (!(rewardTokenAddress == ADDRESS_ZERO)) {
                  RewardTokenERC20Instance = await hre.ethers.getContractAt("ERC20", rewardTokenAddress);
                }
                const decimals = await ERC20Instance.decimals();

                let limit: BigNumber = hre.ethers.BigNumber.from(0);
                let defaultFundAmount: BigNumber = getDefaultFundAmountInDecimal(underlyingTokenAddress, decimals);
                let underlyingBalanceBefore: BigNumber = hre.ethers.BigNumber.from(0);
                let rewardTokenBalanceBefore: BigNumber = hre.ethers.BigNumber.from(0);
                let lpTokenBalanceBefore: BigNumber = hre.ethers.BigNumber.from(0);
                let stakingTokenBalanceBefore: BigNumber = hre.ethers.BigNumber.from(0);
                const timestamp = (await getBlockTimestamp(hre)) * 2;

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

                        poolValue = await adapter.getPoolValue(liquidityPool, underlyingTokenAddress);
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
                        poolValue = await adapter.getPoolValue(liquidityPool, underlyingTokenAddress);
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
                        let rewardUnderlyingBalance: BigNumber = await RewardTokenERC20Instance!.balanceOf(
                          testDeFiAdapter.address,
                        );
                        if (+rewardUnderlyingBalance.lte(+0)) {
                          await fundWalletToken(
                            hre,
                            RewardTokenERC20Instance!.address,
                            users["owner"],
                            getDefaultFundAmountInDecimal(rewardTokenAddress, "18"),
                            timestamp,
                            testDeFiAdapter.address,
                          );
                          rewardUnderlyingBalance = await RewardTokenERC20Instance!.balanceOf(testDeFiAdapter.address);
                          expect(+rewardUnderlyingBalance).to.be.gt(+0);
                        }
                      }
                      break;
                    }
                    case "testGetDepositAllCodes(address,address,address)": {
                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      lpTokenBalanceBefore = await LpERC20Instance.balanceOf(testDeFiAdapter.address);

                      await testDeFiAdapter[action.action](underlyingTokenAddress, liquidityPool, adapter.address);

                      break;
                    }
                    case "testGetDepositSomeCodes(address,address,address,uint256)": {
                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      lpTokenBalanceBefore = await LpERC20Instance.balanceOf(testDeFiAdapter.address);
                      await testDeFiAdapter[action.action](
                        underlyingTokenAddress,
                        liquidityPool,
                        adapter.address,
                        underlyingBalanceBefore,
                      );

                      break;
                    }
                    case "testGetWithdrawAllCodes(address,address,address)": {
                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      lpTokenBalanceBefore = await LpERC20Instance.balanceOf(testDeFiAdapter.address);

                      await testDeFiAdapter[action.action](underlyingTokenAddress, liquidityPool, adapter.address);
                      break;
                    }
                    case "testGetWithdrawSomeCodes(address,address,address,uint256)": {
                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      lpTokenBalanceBefore = await LpERC20Instance.balanceOf(testDeFiAdapter.address);

                      await testDeFiAdapter[action.action](
                        underlyingTokenAddress,
                        liquidityPool,
                        adapter.address,
                        lpTokenBalanceBefore,
                      );

                      break;
                    }
                    case "testGetHarvestAllCodes(address,address,address)": {
                      //  TODO: This condition has to be added in the contract (OPTY-339)
                      if (
                        getAddress(underlyingTokenAddress) === getAddress(rewardTokenAddress) ||
                        rewardTokenAddress === ADDRESS_ZERO ||
                        TypedTokenHolders[pool.toUpperCase()]
                      ) {
                        this.skip();
                      }

                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      rewardTokenBalanceBefore = await RewardTokenERC20Instance!.balanceOf(testDeFiAdapter.address);
                      await testDeFiAdapter[action.action](liquidityPool, underlyingTokenAddress, adapter.address);
                      break;
                    }
                    case "testGetHarvestSomeCodes(address,address,address,uint256)": {
                      //  TODO: This condition has to be added in the contract (OPTY-339)
                      if (
                        getAddress(underlyingTokenAddress) === getAddress(rewardTokenAddress) ||
                        rewardTokenAddress === ADDRESS_ZERO ||
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
                      break;
                    }
                    case "testGetClaimRewardTokenCode(address,address)": {
                      if (lpStakingContract) {
                        rewardTokenBalanceBefore = await RewardTokenERC20Instance!.balanceOf(testDeFiAdapter.address);
                        await testDeFiAdapter[action.action](liquidityPool, adapter.address);
                        isTestingClaimRewardFunction = true;
                      }
                      break;
                    }
                    case "testGetStakeAllCodes(address,address,address)": {
                      if (lpStakingContract) {
                        stakingTokenBalanceBefore = await lpStakingContract.balanceOf(testDeFiAdapter.address);
                        await testDeFiAdapter[action.action](liquidityPool, underlyingTokenAddress, adapter.address);
                      }
                      isTestingStakingFunction = true;
                      break;
                    }
                    case "testGetStakeSomeCodes(address,uint256,address)": {
                      if (lpStakingContract) {
                        stakingTokenBalanceBefore = await lpStakingContract.balanceOf(testDeFiAdapter.address);
                        const balanceFromPool = await LpERC20Instance.balanceOf(testDeFiAdapter.address);
                        await testDeFiAdapter[action.action](liquidityPool, balanceFromPool, adapter.address);
                      }
                      isTestingStakingFunction = true;
                      break;
                    }
                    case "testGetUnstakeAllCodes(address,address)": {
                      if (lpStakingContract) {
                        await testDeFiAdapter[action.action](liquidityPool, adapter.address);
                      }
                      break;
                    }
                    case "testGetUnstakeSomeCodes(address,uint256,address)": {
                      if (lpStakingContract) {
                        const stakingBalance = await lpStakingContract.balanceOf(testDeFiAdapter.address);
                        await testDeFiAdapter[action.action](liquidityPool, stakingBalance, adapter.address);
                      }

                      break;
                    }
                    case "testGetUnstakeAndWithdrawAllCodes(address,address,address)": {
                      if (lpStakingContract) {
                        await testDeFiAdapter[action.action](liquidityPool, underlyingTokenAddress, adapter.address);
                      }
                      break;
                    }
                    case "testGetUnstakeAndWithdrawSomeCodes(address,address,uint256,address)": {
                      if (lpStakingContract) {
                        const stakingBalance = await lpStakingContract.balanceOf(testDeFiAdapter.address);
                        await testDeFiAdapter[action.action](
                          liquidityPool,
                          underlyingTokenAddress,
                          stakingBalance,
                          adapter.address,
                        );
                      }
                      break;
                    }
                  }
                }
                for (const action of story.getActions) {
                  switch (action.action) {
                    case "getUnclaimedRewardTokenAmount(address,address,address)": {
                      if (lpStakingContract) {
                        const expectedUnclaimedRewardTokenAmount = await lpStakingContract.earned(
                          testDeFiAdapter.address,
                        );
                        expect(
                          await adapter[action.action](testDeFiAdapter.address, liquidityPool, ADDRESS_ZERO),
                        ).to.be.eq(expectedUnclaimedRewardTokenAmount);
                      } else {
                        await expect(
                          adapter[action.action](testDeFiAdapter.address, liquidityPool, ADDRESS_ZERO),
                        ).to.be.revertedWith("function call to a non-contract account");
                      }

                      break;
                    }
                    case "calculateAmountInLPToken(address,address,uint256)": {
                      const _depositAmount: BigNumber = getDefaultFundAmountInDecimal(underlyingTokenAddress, decimals);
                      const _amountInLPToken = await adapter[action.action](
                        underlyingTokenAddress,
                        liquidityPool,
                        _depositAmount,
                      );
                      const exchangeRateStored = await lpContract.getExchangeRate();
                      const expectedAmountInLPToken = _depositAmount
                        .mul(to_10powNumber_BN(decimals))
                        .div(BigNumber.from(exchangeRateStored));
                      expect(_amountInLPToken).to.be.eq(expectedAmountInLPToken);
                      break;
                    }
                    case "getPoolValue(address,address)": {
                      const _poolValue = await adapter[action.action](liquidityPool, ADDRESS_ZERO);
                      const expectedPoolValue = await lpContract.getLiquidity();
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
                        const exchangeRateStored = await lpContract.getExchangeRate();
                        const expectedAmountInUnderlyingToken = _lpTokenAmount
                          .mul(exchangeRateStored)
                          .div(to_10powNumber_BN(decimals));
                        expect(_amountInUnderlyingToken).to.be.eq(expectedAmountInUnderlyingToken);
                      }
                      break;
                    }
                    case "getUnderlyingTokens(address,address)": {
                      const _underlyingAddressFromAdapter = await adapter[action.action](liquidityPool, ADDRESS_ZERO);
                      expect([getAddress(_underlyingAddressFromAdapter[0])]).to.have.members([
                        getAddress(await lpContract.token()),
                      ]);
                      break;
                    }
                    case "getLiquidityPoolTokenBalance(address,address,address)": {
                      const expectedValue = action.expectedValue;
                      const expectedLpBalanceFromPool = await LpERC20Instance.balanceOf(testDeFiAdapter.address);
                      const lpTokenBalanceAfter = await adapter[action.action](
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );

                      expect(+lpTokenBalanceAfter).to.be.eq(+expectedLpBalanceFromPool);
                      if (!lpStakingContract && isTestingStakingFunction) {
                        expect(+lpTokenBalanceAfter).to.be.gte(+lpTokenBalanceBefore);
                      } else {
                        const existingMode = await adapter.maxDepositProtocolMode();
                        if (existingMode == 0) {
                          const existingDepositAmount: BigNumber = await adapter.maxDepositAmount(
                            liquidityPool,
                            underlyingTokenAddress,
                          );
                          if (existingDepositAmount.eq(0)) {
                            expect(+lpTokenBalanceAfter).to.be.eq(0);
                          } else {
                            expect(+lpTokenBalanceAfter).to.be.gt(+lpTokenBalanceBefore);
                          }
                        } else {
                          const existingPoolPct: BigNumber = await adapter.maxDepositPoolPct(liquidityPool);
                          const existingProtocolPct: BigNumber = await adapter.maxDepositProtocolPct();
                          if (existingPoolPct.eq(0) && existingProtocolPct.eq(0)) {
                            expect(+lpTokenBalanceAfter).to.be.eq(0);
                          } else if (!existingPoolPct.eq(0) || !existingProtocolPct.eq(0)) {
                            expectedValue == "=0"
                              ? expect(+lpTokenBalanceAfter).to.be.eq(0)
                              : expectedValue == "<"
                              ? expect(+lpTokenBalanceAfter).to.be.lte(+lpTokenBalanceBefore)
                              : expect(+lpTokenBalanceAfter).to.be.gt(+lpTokenBalanceBefore);
                          }
                        }
                      }

                      break;
                    }
                    case "balanceOf(address)": {
                      const expectedValue = action.expectedValue;
                      const underlyingBalanceAfter: BigNumber = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      if (!lpStakingContract && isTestingStakingFunction) {
                        expect(+underlyingBalanceAfter).to.be.lte(+underlyingBalanceBefore);
                      } else {
                        if (underlyingBalanceBefore.lt(limit)) {
                          expectedValue == ">"
                            ? expect(+underlyingBalanceAfter).to.be.gt(+underlyingBalanceBefore)
                            : expect(+underlyingBalanceAfter).to.be.eq(0);
                        } else {
                          expectedValue == ">"
                            ? expect(+underlyingBalanceAfter).to.be.gt(+underlyingBalanceBefore)
                            : expect(+underlyingBalanceAfter).to.be.lte(+underlyingBalanceBefore.sub(limit));
                        }
                      }
                      break;
                    }
                    case "getRewardTokenBalance(address)": {
                      const rewardTokenBalanceAfter: BigNumber = lpStakingContract
                        ? await RewardTokenERC20Instance!.balanceOf(testDeFiAdapter.address)
                        : BigNumber.from("0");

                      if (
                        (!lpStakingContract && isTestingStakingFunction) ||
                        (stopReward && isTestingClaimRewardFunction)
                      ) {
                        expect(+rewardTokenBalanceAfter).to.be.eq(+rewardTokenBalanceBefore);
                      } else {
                        const expectedValue = action.expectedValue;

                        expectedValue == ">"
                          ? expect(+rewardTokenBalanceAfter).to.be.gt(+rewardTokenBalanceBefore)
                          : expectedValue == "=0"
                          ? expect(+rewardTokenBalanceAfter).to.be.eq(0)
                          : expect(+rewardTokenBalanceAfter).to.be.lte(+rewardTokenBalanceBefore);
                      }

                      break;
                    }
                    case "getLiquidityPoolTokenBalanceStake(address,address)": {
                      const expectedValue = action.expectedValue;
                      if (lpStakingContract) {
                        const expectedStakingBalanceFromPool: BigNumber = await lpStakingContract.balanceOf(
                          testDeFiAdapter.address,
                        );
                        const stakingTokenBalanceAfter: BigNumber = await adapter[action.action](
                          testDeFiAdapter.address,
                          liquidityPool,
                        );

                        expect(+stakingTokenBalanceAfter).to.be.eq(+expectedStakingBalanceFromPool);

                        expectedValue == ">"
                          ? expect(+stakingTokenBalanceAfter).to.be.gt(+stakingTokenBalanceBefore)
                          : expectedValue == "=0"
                          ? expect(+stakingTokenBalanceAfter).to.be.eq(0)
                          : expect(+stakingTokenBalanceAfter).to.be.lte(+stakingTokenBalanceBefore);
                      } else {
                        await expect(adapter[action.action](testDeFiAdapter.address, liquidityPool)).to.be.revertedWith(
                          "function call to a non-contract account",
                        );
                      }

                      break;
                    }
                    case "getAllAmountInToken(address,address,address)": {
                      const _amountInUnderlyingToken = await adapter[action.action](
                        testDeFiAdapter.address,
                        ADDRESS_ZERO,
                        liquidityPool,
                      );

                      const expectedAmountInUnderlyingToken: BigNumber = await lpContract.getTokenBalance(
                        testDeFiAdapter.address,
                      );

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

                      break;
                    }
                    case "isRedeemableAmountSufficientStake(address,address,address,uint256)": {
                      const expectedValue = action.expectedValue;

                      if (lpStakingContract) {
                        const _amountInUnderlyingToken: BigNumber = await adapter.getAllAmountInTokenStake(
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
                      } else {
                        await expect(
                          adapter[action.action](
                            testDeFiAdapter.address,
                            underlyingTokenAddress,
                            liquidityPool,
                            BigNumber.from(0),
                          ),
                        ).to.be.revertedWith("function call to a non-contract account");
                      }

                      break;
                    }
                    case "calculateRedeemableLPTokenAmountStake(address,address,address,uint256)": {
                      if (lpStakingContract) {
                        const _lpTokenBalance: BigNumber = await adapter.getLiquidityPoolTokenBalanceStake(
                          testDeFiAdapter.address,
                          liquidityPool,
                        );
                        const _balanceInToken: BigNumber = await adapter.getAllAmountInTokenStake(
                          testDeFiAdapter.address,
                          underlyingTokenAddress,
                          liquidityPool,
                        );
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
                      } else {
                        await expect(
                          adapter[action.action](
                            testDeFiAdapter.address,
                            underlyingTokenAddress,
                            liquidityPool,
                            BigNumber.from("0"),
                          ),
                        ).to.be.revertedWith("function call to a non-contract account");
                      }

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
                    case "testGetUnstakeAllCodes(address,address)": {
                      if (lpStakingContract) {
                        await testDeFiAdapter[action.action](liquidityPool, adapter.address);
                      }

                      break;
                    }
                  }
                }
                if (story.cleanActions.length > 0) {
                  for (const action of story.getActions) {
                    switch (action.action) {
                      case "getStakingTokenBalance(address)": {
                        if (lpStakingContract) {
                          const stakingTokenBalance: BigNumber = await lpStakingContract.balanceOf(
                            testDeFiAdapter.address,
                          );
                          expect(stakingTokenBalance).to.be.eq(0);
                        }

                        break;
                      }
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
                      case "getRewardToken(address)": {
                        if (lpStakingContract) {
                          expect(await adapter[action.action](liquidityPool)).to.be.eq(await lpStakingContract.df());
                        }
                        break;
                      }
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
      for (let i = 0; i < testDeFiAdaptersScenario?.adapterStandloneStories.length; i++) {
        it(`${testDeFiAdaptersScenario?.adapterStandloneStories[i].description}`, async function () {
          const story = testDeFiAdaptersScenario.adapterStandloneStories[i];
          for (const action of story.setActions) {
            switch (action.action) {
              case "canStake(address)": {
                const _canStake = await adapter[action.action](ADDRESS_ZERO);
                expect(_canStake).to.be.eq(true);
                break;
              }
              case "setLiquidityPoolToStakingVault(address,address)": {
                if (action.expect == "success") {
                  await adapter[action.action](dummyContract.address, dummyContract.address);
                } else {
                  //  TODO: Add test scenario if operator is trying to set ZERO/EOA ADDRESS as reward token address
                  await expect(
                    adapter
                      .connect(users[action.executer])
                      [action.action](dummyContract.address, dummyContract.address),
                  ).to.be.revertedWith(action.message);
                }
                break;
              }
            }
          }
          for (const action of story.getActions) {
            switch (action.action) {
              case "liquidityPoolToStakingVault(address)": {
                const stakingVaultAddress = await adapter[action.action](dummyContract.address);
                expect(getAddress(stakingVaultAddress)).to.be.eq(getAddress(dummyContract.address));
                break;
              }
            }
          }
        });
      }
    });
  });
});
