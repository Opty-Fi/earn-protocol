import chai, { expect, assert } from "chai";
import hre from "hardhat";
import { solidity } from "ethereum-waffle";
import { Contract, Signer, BigNumber, utils, ethers } from "ethers";
import { CONTRACTS } from "../../../helpers/type";
import { TOKENS, TESTING_DEPLOYMENT_ONCE, ADDRESS_ZERO, COMPOUND_ADAPTER_NAME } from "../../../helpers/constants";
import { TypedAdapterStrategies, TypedTokens } from "../../../helpers/data";
import { deployAdapter, deployAdapterPrerequisites } from "../../../helpers/contracts-deployments";
import { fundWalletToken, getBlockTimestamp } from "../../../helpers/contracts-actions";
import scenarios from "../scenarios/adapters.json";
import { TypedDefiPools } from "../../../helpers/data";
//  TODO: This file is temporarily being used until all the adapters testing doesn't adapt this file
import testDeFiAdaptersScenario from "../scenarios/compound-temp-defi-adapter.json";
import { deployContract, getDefaultFundAmount } from "../../../helpers/helpers";
import { getAddress } from "ethers/lib/utils";
import abis from "../../../helpers/data/abis.json";

type ARGUMENTS = {
  amount?: { [key: string]: string };
};

type TEST_DEFI_ADAPTER_ARGUMENTS = {
  mode?: string;
  maxDepositProtocolPct?: string;
  maxDepositPoolPct?: string;
  maxDepositAmount?: string;
};

chai.use(solidity);

describe(`${COMPOUND_ADAPTER_NAME} Unit test`, () => {
  const strategies = TypedAdapterStrategies[COMPOUND_ADAPTER_NAME];
  const MAX_AMOUNT = BigNumber.from("20000000000000000000");
  let adapterPrerequisites: CONTRACTS;
  let compoundAdapter: Contract;
  let ownerAddress: string;
  let users: { [key: string]: Signer };
  before(async () => {
    try {
      const [owner, admin, user1] = await hre.ethers.getSigners();
      users = { owner, admin, user1 };
      ownerAddress = await owner.getAddress();
      adapterPrerequisites = await deployAdapterPrerequisites(hre, owner, TESTING_DEPLOYMENT_ONCE);
      assert.isDefined(adapterPrerequisites, "Adapter pre-requisites contracts not deployed");
      compoundAdapter = await deployAdapter(
        hre,
        owner,
        COMPOUND_ADAPTER_NAME,
        adapterPrerequisites["registry"].address,
        TESTING_DEPLOYMENT_ONCE,
      );
      assert.isDefined(compoundAdapter, "Adapter not deployed");
    } catch (error) {
      console.log(error);
    }
  });

  for (let i = 0; i < strategies.length; i++) {
    describe(`test getCodes() for ${strategies[i].strategyName}`, async () => {
      const strategy = strategies[i];
      const token = TOKENS[strategy.token];
      let lpToken: string;
      before(async () => {
        try {
          const timestamp = (await getBlockTimestamp(hre)) * 2;
          await fundWalletToken(hre, token, users["owner"], MAX_AMOUNT, timestamp);
          lpToken = await compoundAdapter.getLiquidityPoolToken(token, strategy.strategy[0].contract);
        } catch (error) {
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
                    codes = await compoundAdapter[action.action](
                      ownerAddress,
                      token,
                      strategy.strategy[0].contract,
                      amount[strategy.token],
                    );
                    depositAmount = amount[strategy.token];
                  }
                } else {
                  codes = await compoundAdapter[action.action](ownerAddress, token, strategy.strategy[0].contract);
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
                    codes = await compoundAdapter[action.action](
                      ownerAddress,
                      token,
                      strategy.strategy[0].contract,
                      amount[strategy.token],
                    );
                    withdrawAmount = amount[strategy.token];
                  }
                } else {
                  codes = await compoundAdapter[action.action](ownerAddress, token, strategy.strategy[0].contract);
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
  describe(`CompoundAdapter pools test`, async () => {
    let testDeFiAdapter: Contract;

    before(async () => {
      testDeFiAdapter = await deployContract(hre, "TestDeFiAdapter", TESTING_DEPLOYMENT_ONCE, users["owner"], []);
    });

    // TODO: In future it can be leverage across all the adapters
    const pools = Object.keys(TypedDefiPools[COMPOUND_ADAPTER_NAME]);
    describe(`Test-${COMPOUND_ADAPTER_NAME}`, () => {
      for (const pool of pools) {
        //  @reason: ETH: This is an exception as input is not considered in ETH rather it is replaced with WETH.
        const underlyingTokenAddress =
          getAddress(TypedDefiPools[COMPOUND_ADAPTER_NAME][pool].tokens[0]) == getAddress(TypedTokens.ETH)
            ? getAddress(TypedTokens.WETH)
            : getAddress(TypedDefiPools[COMPOUND_ADAPTER_NAME][pool].tokens[0]);
        if (TypedDefiPools[COMPOUND_ADAPTER_NAME][pool].tokens.length == 1) {
          for (let i = 0; i < testDeFiAdaptersScenario.stories.length; i++) {
            it(`${pool} - ${testDeFiAdaptersScenario.stories[i].description}`, async function () {
              const lpPauseStatus = await lpPausedStatus(getAddress(TypedDefiPools[COMPOUND_ADAPTER_NAME][pool].pool));
              if (!lpPauseStatus) {
                const story = testDeFiAdaptersScenario.stories[i];
                let defaultFundAmount: BigNumber = getDefaultFundAmount(underlyingTokenAddress);
                let limit: BigNumber = ethers.BigNumber.from(0);
                const timestamp = (await getBlockTimestamp(hre)) * 2;
                const liquidityPool = TypedDefiPools[COMPOUND_ADAPTER_NAME][pool].pool;
                const ERC20Instance = await hre.ethers.getContractAt("ERC20", underlyingTokenAddress);
                const LpERC20Instance = await hre.ethers.getContractAt("ERC20", liquidityPool);
                const rewardTokenAddress = await compoundAdapter.getRewardToken(ADDRESS_ZERO);
                let RewardTokenERC20Instance: Contract;
                if (!(rewardTokenAddress == ADDRESS_ZERO)) {
                  RewardTokenERC20Instance = await hre.ethers.getContractAt("ERC20", rewardTokenAddress);
                }
                //  @reason: Some LpToken contracts (like cLink's contract) are not detectable as Contract with the blockNumber being used in Hardhat config.
                //  However, it works fine if existing blockNumber is removed with the latest blockNumber.
                const getCode = await LpERC20Instance.provider.getCode(LpERC20Instance.address);
                if (getCode === "0x") {
                  this.skip();
                }
                let underlyingBalanceBefore: BigNumber = ethers.BigNumber.from(0);
                let rewardTokenBalanceBefore: BigNumber = ethers.BigNumber.from(0);
                const decimals = await ERC20Instance.decimals();
                const adapterAddress = compoundAdapter.address;

                const poolValue: BigNumber = await compoundAdapter.getPoolValue(liquidityPool, underlyingTokenAddress);
                //  @reason: Exception when PoolValue comes `0` with existing blockNumber in hardhat config. Eg: TUSD token. However, it works fine with
                //  the latest blockNumber for TUSD
                if (+poolValue == 0) {
                  this.skip();
                }

                for (const action of story.setActions) {
                  switch (action.action) {
                    case "setMaxDepositProtocolMode(uint8)": {
                      const { mode }: any = action.args!;
                      const existingMode = await compoundAdapter.maxDepositProtocolMode();
                      if (existingMode != mode) {
                        await expect(compoundAdapter[action.action](mode))
                          .to.emit(compoundAdapter, "LogMaxDepositProtocolMode")
                          .withArgs(+mode, ownerAddress);
                        expect(await compoundAdapter.maxDepositProtocolMode()).to.equal(+mode);
                      }
                      break;
                    }
                    case "setMaxDepositProtocolPct(uint256)": {
                      const existingPoolPct: BigNumber = await compoundAdapter.maxDepositPoolPct(liquidityPool);
                      if (!existingPoolPct.eq(BigNumber.from(0))) {
                        await compoundAdapter.setMaxDepositPoolPct(liquidityPool, 0);
                        expect(await compoundAdapter.maxDepositPoolPct(liquidityPool)).to.be.eq(0);
                      }
                      const { maxDepositProtocolPct }: any = action.args!;
                      const existingProtocolPct: BigNumber = await compoundAdapter.maxDepositProtocolPct();
                      if (!existingProtocolPct.eq(BigNumber.from(maxDepositProtocolPct))) {
                        await expect(compoundAdapter[action.action](maxDepositProtocolPct))
                          .to.emit(compoundAdapter, "LogMaxDepositProtocolPct")
                          .withArgs(+maxDepositProtocolPct, ownerAddress);
                        expect(await compoundAdapter.maxDepositProtocolPct()).to.equal(+maxDepositProtocolPct);
                      }
                      limit = poolValue.mul(BigNumber.from(maxDepositProtocolPct)).div(BigNumber.from(10000));
                      defaultFundAmount = defaultFundAmount.lte(limit) ? defaultFundAmount : limit;
                      defaultFundAmount = defaultFundAmount.mul(BigNumber.from(10).pow(decimals));
                      break;
                    }
                    case "setMaxDepositPoolPct(address,uint256)": {
                      const { maxDepositPoolPct }: TEST_DEFI_ADAPTER_ARGUMENTS = action.args!;
                      const existingPoolPct: BigNumber = await compoundAdapter.maxDepositPoolPct(liquidityPool);
                      if (!existingPoolPct.eq(BigNumber.from(maxDepositPoolPct))) {
                        await expect(compoundAdapter[action.action](liquidityPool, maxDepositPoolPct))
                          .to.emit(compoundAdapter, "LogMaxDepositPoolPct")
                          .withArgs(maxDepositPoolPct, ownerAddress);
                        expect(await compoundAdapter.maxDepositPoolPct(liquidityPool)).to.equal(maxDepositPoolPct);
                      }
                      limit = poolValue.mul(BigNumber.from(maxDepositPoolPct)).div(BigNumber.from(10000));
                      defaultFundAmount = defaultFundAmount.lte(limit) ? defaultFundAmount : limit;
                      defaultFundAmount = defaultFundAmount.mul(BigNumber.from(10).pow(decimals));
                      break;
                    }
                    case "setMaxDepositAmount(address,address,uint256)": {
                      let { maxDepositAmount }: any = action.args;
                      maxDepositAmount = BigNumber.from(maxDepositAmount).mul(BigNumber.from(10).pow(decimals));
                      const existingDepositAmount: BigNumber = await compoundAdapter.maxDepositAmount(
                        liquidityPool,
                        underlyingTokenAddress,
                      );
                      if (!existingDepositAmount.eq(BigNumber.from(maxDepositAmount))) {
                        await expect(
                          compoundAdapter[action.action](liquidityPool, underlyingTokenAddress, maxDepositAmount),
                        )
                          .to.emit(compoundAdapter, "LogMaxDepositAmount")
                          .withArgs(maxDepositAmount, ownerAddress);
                        expect(
                          +(await compoundAdapter.maxDepositAmount(liquidityPool, underlyingTokenAddress)),
                        ).to.equal(+maxDepositAmount);
                      }
                      limit = BigNumber.from(maxDepositAmount);
                      defaultFundAmount = defaultFundAmount.mul(BigNumber.from(10).pow(decimals));
                      break;
                    }
                    case "fundTestDeFiAdapterContract": {
                      let underlyingBalance: BigNumber = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      if (underlyingBalance.lt(defaultFundAmount)) {
                        await fundWalletToken(
                          hre,
                          underlyingTokenAddress,
                          users["owner"],
                          defaultFundAmount,
                          timestamp,
                          testDeFiAdapter.address,
                        );
                        underlyingBalance = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                        expect(+underlyingBalance).to.be.gte(+defaultFundAmount);
                      }
                      break;
                    }
                    case "fundTestDefiContractWithRewardToken()": {
                      if (!(rewardTokenAddress == ADDRESS_ZERO)) {
                        let compUnderlyingBalance: BigNumber = await RewardTokenERC20Instance!.balanceOf(
                          testDeFiAdapter.address,
                        );
                        if (+compUnderlyingBalance.lte(+0)) {
                          await fundWalletToken(
                            hre,
                            RewardTokenERC20Instance!.address,
                            users["owner"],
                            getDefaultFundAmount(rewardTokenAddress).mul(BigNumber.from(10).pow(18)),
                            timestamp,
                            testDeFiAdapter.address,
                          );
                          compUnderlyingBalance = await RewardTokenERC20Instance!.balanceOf(testDeFiAdapter.address);
                          expect(+compUnderlyingBalance).to.be.gt(+0);
                        }
                      }
                      break;
                    }
                    case "testGetDepositAllCodes(address,address,address)": {
                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      await testDeFiAdapter[action.action](underlyingTokenAddress, liquidityPool, adapterAddress);
                      break;
                    }
                    case "testGetDepositSomeCodes(address,address,address,uint256)": {
                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      await testDeFiAdapter[action.action](
                        underlyingTokenAddress,
                        liquidityPool,
                        adapterAddress,
                        underlyingBalanceBefore,
                      );
                      break;
                    }
                    case "testGetWithdrawAllCodes(address,address,address)": {
                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      await testDeFiAdapter[action.action](underlyingTokenAddress, liquidityPool, adapterAddress);
                      break;
                    }
                    case "testGetWithdrawSomeCodes(address,address,address,uint256)": {
                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      const lpTokenBalance = await compoundAdapter.getLiquidityPoolTokenBalance(
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      await testDeFiAdapter[action.action](
                        underlyingTokenAddress,
                        liquidityPool,
                        adapterAddress,
                        lpTokenBalance,
                      );
                      break;
                    }
                    case "testGetHarvestAllCodes(address,address,address)": {
                      //  TODO: This condition has to be added in the contract (OPTY-339)
                      if (getAddress(underlyingTokenAddress) == getAddress(TypedTokens.COMP)) {
                        this.skip();
                      }
                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      rewardTokenBalanceBefore = await RewardTokenERC20Instance!.balanceOf(testDeFiAdapter.address);
                      await testDeFiAdapter[action.action](liquidityPool, underlyingTokenAddress, adapterAddress);
                      break;
                    }
                    case "testGetHarvestSomeCodes(address,address,address,uint256)": {
                      //  TODO: This condition has to be added in the contract (OPTY-339)
                      if (getAddress(underlyingTokenAddress) == getAddress(TypedTokens.COMP)) {
                        this.skip();
                      }
                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      rewardTokenBalanceBefore = await RewardTokenERC20Instance!.balanceOf(testDeFiAdapter.address);
                      await testDeFiAdapter[action.action](
                        liquidityPool,
                        underlyingTokenAddress,
                        adapterAddress,
                        rewardTokenBalanceBefore,
                      );
                      break;
                    }
                  }
                }
                for (const action of story.getActions) {
                  switch (action.action) {
                    case "getLiquidityPoolTokenBalance(address,address,address)": {
                      const expectedLpBalanceFromPool = await LpERC20Instance.balanceOf(testDeFiAdapter.address);
                      expect(
                        await compoundAdapter[action.action](
                          testDeFiAdapter.address,
                          underlyingTokenAddress,
                          liquidityPool,
                        ),
                      ).to.be.eq(+expectedLpBalanceFromPool);
                      break;
                    }
                    case "balanceOf(address)": {
                      const expectedValue = action.expectedValue;
                      const underlyingBalanceAfter: BigNumber = await ERC20Instance[action.action](
                        testDeFiAdapter.address,
                      );
                      if (underlyingBalanceBefore.lt(limit)) {
                        expectedValue == ">0"
                          ? expect(+underlyingBalanceAfter).to.be.gt(+underlyingBalanceBefore)
                          : expect(underlyingBalanceAfter).to.be.eq(0);
                      } else {
                        expectedValue == ">0"
                          ? expect(+underlyingBalanceAfter).to.be.gt(+underlyingBalanceBefore)
                          : expect(underlyingBalanceAfter).to.be.eq(underlyingBalanceBefore.sub(limit));
                      }
                      break;
                    }
                    case "getRewardTokenBalance(address)": {
                      const rewardTokenBalanceAfter: BigNumber = await RewardTokenERC20Instance!.balanceOf(
                        testDeFiAdapter.address,
                      );
                      const expectedValue = action.expectedValue;
                      expectedValue == ">0"
                        ? expect(+rewardTokenBalanceAfter).to.be.gt(+rewardTokenBalanceBefore)
                        : expectedValue == "=0"
                        ? expect(+rewardTokenBalanceAfter).to.be.eq(0)
                        : expect(+rewardTokenBalanceAfter).to.be.lt(+rewardTokenBalanceBefore);
                      break;
                    }
                  }
                }
                for (const action of story.cleanActions) {
                  switch (action.action) {
                    case "testGetWithdrawAllCodes(address,address,address)": {
                      await testDeFiAdapter[action.action](underlyingTokenAddress, liquidityPool, adapterAddress);
                      break;
                    }
                  }
                }
                for (const action of story.getActions) {
                  switch (action.action) {
                    case "getLiquidityPoolTokenBalance(address,address,address)": {
                      // const lpTokenBalance =
                      expect(
                        await compoundAdapter[action.action](
                          testDeFiAdapter.address,
                          underlyingTokenAddress,
                          liquidityPool,
                        ),
                      ).to.be.eq(0);
                      break;
                    }
                    case "balanceOf(address)": {
                      expect(await ERC20Instance.balanceOf(testDeFiAdapter.address)).to.be.gt(0);
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
    });
  });
});

//  Function to check if cToken Pool is paused or not.
//  @dev: SAI,REP = Mint is paused
//  @dev: WBTC has mint paused for latest blockNumbers, However WBTC2 works fine with the latest blockNumber
async function lpPausedStatus(pool: string): Promise<boolean> {
  const compoundController = await hre.ethers.getContractAt(
    abis.compoundComptroller.abi,
    abis.compoundComptroller.address,
  );
  const lpPauseStatus = await compoundController["mintGuardianPaused(address)"](pool);
  return lpPauseStatus;
}
