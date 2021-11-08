import chai, { expect, assert } from "chai";
import { solidity } from "ethereum-waffle";
import hre from "hardhat";
import { Contract, Signer, BigNumber, utils } from "ethers";
import { CONTRACTS } from "../../../helpers/type";
import { TESTING_DEPLOYMENT_ONCE, ADDRESS_ZERO } from "../../../helpers/constants/utils";
import { VAULT_TOKENS } from "../../../helpers/constants/tokens";
import { FULCRUM_ADAPTER_NAME } from "../../../helpers/constants/adapters";

import { TypedAdapterStrategies, TypedDefiPools } from "../../../helpers/data";
import { deployAdapter, deployAdapterPrerequisites } from "../../../helpers/contracts-deployments";
import { fundWalletToken, getBlockTimestamp } from "../../../helpers/contracts-actions";
import scenarios from "../scenarios/adapters.json";
import testDeFiAdaptersScenario from "../scenarios/fulcrum-test-defi-adapter.json";
import { deployContract, getDefaultFundAmountInDecimal } from "../../../helpers/helpers";
import { getAddress } from "ethers/lib/utils";
import { to_10powNumber_BN } from "../../../helpers/utils";
import { ERC20 } from "../../../typechain/ERC20";

chai.use(solidity);

type ARGUMENTS = {
  amount?: { [key: string]: string };
};

interface TEST_DEFI_ADAPTER_ARGUMENTS {
  maxDepositProtocolPct?: string | null;
  maxDepositPoolPct?: string | null;
  maxDepositAmount?: string | null;
  mode?: string | null;
}

describe("FulcrumAdapter", () => {
  const ADAPTER_NAME = "FulcrumAdapter";
  const strategies = TypedAdapterStrategies[ADAPTER_NAME];
  const MAX_AMOUNT = BigNumber.from("20000000000000000000");
  let adapterPrerequisites: CONTRACTS;
  let fulcrumAdapter: Contract;
  let ownerAddress: string;
  let users: { [key: string]: Signer };
  before(async () => {
    try {
      const [owner, admin, user1] = await hre.ethers.getSigners();
      users = { owner, admin, user1 };
      ownerAddress = await owner.getAddress();
      adapterPrerequisites = await deployAdapterPrerequisites(hre, owner, TESTING_DEPLOYMENT_ONCE);
      fulcrumAdapter = await deployAdapter(
        hre,
        owner,
        ADAPTER_NAME,
        adapterPrerequisites.registry.address,
        TESTING_DEPLOYMENT_ONCE,
      );
      assert.isDefined(adapterPrerequisites, "Adapter prerequisites not deployed");
      assert.isDefined(fulcrumAdapter, "Adapter not deployed");
    } catch (error) {
      console.log(error);
    }
  });

  for (let i = 0; i < strategies.length; i++) {
    describe(`${strategies[i].strategyName}`, async () => {
      const strategy = strategies[i];
      const token = VAULT_TOKENS[strategy.token].address;
      let lpToken: string;
      before(async () => {
        try {
          const timestamp = (await getBlockTimestamp(hre)) * 2;
          await fundWalletToken(hre, token, users["owner"], MAX_AMOUNT, timestamp);
          lpToken = await fulcrumAdapter.getLiquidityPoolToken(token, strategy.strategy[0].contract);
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
              case "getDepositSomeCodes(address,address[],address,uint256[])":
              case "getDepositAllCodes(address,address[],address)": {
                let codes;
                let depositAmount;
                if (action.action === "getDepositSomeCodes(address,address[],address,uint256[])") {
                  const { amount }: ARGUMENTS = action.args;
                  if (amount) {
                    codes = await fulcrumAdapter[action.action](ownerAddress, [token], strategy.strategy[0].contract, [
                      amount[strategy.token],
                    ]);
                    depositAmount = amount[strategy.token];
                  }
                } else {
                  codes = await fulcrumAdapter[action.action](ownerAddress, [token], strategy.strategy[0].contract);
                }
                for (let i = 0; i < codes.length; i++) {
                  if (i < 2) {
                    const inter = new utils.Interface(["function approve(address,uint256)"]);
                    const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                    expect(address).to.equal(token);
                    const value = inter.decodeFunctionData("approve", abiCode);
                    expect(value[0]).to.equal(strategy.strategy[0].contract);
                    if (action.action === "getDepositSomeCodes(address,address[],address,uint256[])") {
                      expect(value[1]).to.equal(i === 0 ? 0 : depositAmount);
                    }
                  } else {
                    const inter = new utils.Interface(["function mint(address,uint256)"]);
                    const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                    expect(address).to.equal(strategy.strategy[0].contract);
                    const value = inter.decodeFunctionData("mint", abiCode);
                    if (action.action === "getDepositSomeCodes(address,address[],address,uint256[])") {
                      expect(value[0]).to.equal(ownerAddress);
                      expect(value[1]).to.equal(depositAmount);
                    }
                  }
                }
                break;
              }
              case "getWithdrawAllCodes(address,address[],address)":
              case "getWithdrawSomeCodes(address,address[],address,uint256)": {
                let codes;
                let withdrawAmount;
                if (action.action === "getWithdrawSomeCodes(address,address[],address,uint256)") {
                  const { amount }: ARGUMENTS = action.args;
                  if (amount) {
                    codes = await fulcrumAdapter[action.action](
                      ownerAddress,
                      [token],
                      strategy.strategy[0].contract,
                      amount[strategy.token],
                    );
                    withdrawAmount = amount[strategy.token];
                  }
                } else {
                  codes = await fulcrumAdapter[action.action](ownerAddress, [token], strategy.strategy[0].contract);
                }

                for (let i = 0; i < codes.length; i++) {
                  const inter = new utils.Interface(["function burn(address,uint256)"]);
                  const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                  expect(address).to.be.equal(lpToken);
                  const value = inter.decodeFunctionData("burn", abiCode);
                  if (action.action === "getWithdrawSomeCodes(address,address[],address,uint256)") {
                    expect(value[0]).to.equal(ownerAddress);
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
  describe(`${testDeFiAdaptersScenario.title} - FulcrumAdapter`, () => {
    let testDeFiAdapter: Contract;

    before(async () => {
      testDeFiAdapter = await deployContract(hre, "TestDeFiAdapter", false, users["owner"], []);
    });
    const pools = Object.keys(TypedDefiPools[FULCRUM_ADAPTER_NAME]);
    for (const pool of pools) {
      const underlyingTokenAddress = getAddress(TypedDefiPools[FULCRUM_ADAPTER_NAME][pool].tokens[0]);
      if (TypedDefiPools[FULCRUM_ADAPTER_NAME][pool].tokens.length == 1) {
        for (const story of testDeFiAdaptersScenario.stories) {
          it(`${pool} - ${story.description}`, async function () {
            let limit: BigNumber = BigNumber.from(0);
            const timestamp = (await getBlockTimestamp(hre)) * 2;
            const liquidityPool = TypedDefiPools[FULCRUM_ADAPTER_NAME][pool].pool;
            const ERC20Instance = <ERC20>await hre.ethers.getContractAt("ERC20", underlyingTokenAddress);
            const decimals = await ERC20Instance.decimals();
            let defaultFundAmount: BigNumber = getDefaultFundAmountInDecimal(underlyingTokenAddress, decimals);
            const LpERC20Instance = await hre.ethers.getContractAt("IFulcrum", liquidityPool);
            const getCode = await LpERC20Instance.provider.getCode(LpERC20Instance.address);
            if (getCode === "0x") {
              this.skip();
            }
            const poolValue = await fulcrumAdapter.getPoolValue(liquidityPool, ADDRESS_ZERO);
            // @reason iLEND and iYFI are no longer active and we shouldn't test them
            if (poolValue == 0) {
              this.skip();
            }
            const adapterAddress = fulcrumAdapter.address;
            let underlyingBalanceBefore: BigNumber = BigNumber.from(0);
            for (const action of story.setActions) {
              switch (action.action) {
                case "setMaxDepositProtocolMode(uint8)": {
                  const { mode }: TEST_DEFI_ADAPTER_ARGUMENTS = action.args!;
                  const existingMode = await fulcrumAdapter.maxDepositProtocolMode();
                  if (mode) {
                    if (existingMode != mode) {
                      await expect(fulcrumAdapter[action.action](mode))
                        .to.emit(fulcrumAdapter, "LogMaxDepositProtocolMode")
                        .withArgs(+mode, ownerAddress);
                    }
                  }
                  break;
                }
                case "setMaxDepositProtocolPct(uint256)": {
                  const existingPoolPct: BigNumber = await fulcrumAdapter.maxDepositPoolPct(liquidityPool);
                  if (!existingPoolPct.eq(BigNumber.from(0))) {
                    await fulcrumAdapter.setMaxDepositPoolPct(liquidityPool, 0);
                    expect(await fulcrumAdapter.maxDepositPoolPct(liquidityPool)).to.be.eq(0);
                  }
                  const { maxDepositProtocolPct }: TEST_DEFI_ADAPTER_ARGUMENTS = action.args!;
                  if (maxDepositProtocolPct) {
                    const existingProtocolPct: BigNumber = await fulcrumAdapter.maxDepositProtocolPct();
                    if (!existingProtocolPct.eq(BigNumber.from(maxDepositProtocolPct))) {
                      await expect(fulcrumAdapter[action.action](maxDepositProtocolPct))
                        .to.emit(fulcrumAdapter, "LogMaxDepositProtocolPct")
                        .withArgs(+maxDepositProtocolPct, ownerAddress);
                      expect(await fulcrumAdapter.maxDepositProtocolPct()).to.equal(+maxDepositProtocolPct);
                    }
                    limit = poolValue.mul(BigNumber.from(maxDepositProtocolPct)).div(BigNumber.from(10000));
                    defaultFundAmount = defaultFundAmount.lte(limit) ? defaultFundAmount : limit;
                  }
                  break;
                }
                case "setMaxDepositPoolPct(address,uint256)": {
                  const { maxDepositPoolPct }: TEST_DEFI_ADAPTER_ARGUMENTS = action.args!;
                  const existingPoolPct: BigNumber = await fulcrumAdapter.maxDepositPoolPct(liquidityPool);
                  if (maxDepositPoolPct) {
                    if (!existingPoolPct.eq(BigNumber.from(maxDepositPoolPct))) {
                      await expect(fulcrumAdapter[action.action](liquidityPool, maxDepositPoolPct))
                        .to.emit(fulcrumAdapter, "LogMaxDepositPoolPct")
                        .withArgs(maxDepositPoolPct, ownerAddress);
                      expect(await fulcrumAdapter.maxDepositPoolPct(liquidityPool)).to.equal(maxDepositPoolPct);
                    }
                    limit = poolValue.mul(BigNumber.from(maxDepositPoolPct)).div(BigNumber.from(10000));
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
                  const existingDepositAmount: BigNumber = await fulcrumAdapter.maxDepositAmount(
                    liquidityPool,
                    underlyingTokenAddress,
                  );
                  if (!existingDepositAmount.eq(amount)) {
                    await expect(fulcrumAdapter[action.action](liquidityPool, underlyingTokenAddress, amount))
                      .to.emit(fulcrumAdapter, "LogMaxDepositAmount")
                      .withArgs(amount, ownerAddress);
                    expect(+(await fulcrumAdapter.maxDepositAmount(liquidityPool, underlyingTokenAddress))).to.equal(
                      +amount,
                    );
                  }
                  limit = amount;
                  break;
                }
                case "fundTestDeFiAdapterContract": {
                  const underlyingBalance: BigNumber = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                  if (underlyingBalance.lt(defaultFundAmount)) {
                    defaultFundAmount = await fundWalletToken(
                      hre,
                      underlyingTokenAddress,
                      users["owner"],
                      defaultFundAmount,
                      timestamp,
                      testDeFiAdapter.address,
                    );
                    expect(+defaultFundAmount).to.be.gte(+(await ERC20Instance.balanceOf(testDeFiAdapter.address)));
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
                  const lpTokenBalance = await fulcrumAdapter.getLiquidityPoolTokenBalance(
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
              }
            }
            for (const action of story.getActions) {
              switch (action.action) {
                case "getLiquidityPoolTokenBalance(address,address,address)": {
                  const expectedValue = action.expectedValue;
                  const expectedLpBalanceFromPool = await LpERC20Instance.balanceOf(testDeFiAdapter.address);
                  const lpTokenBalance = await fulcrumAdapter[action.action](
                    testDeFiAdapter.address,
                    underlyingTokenAddress,
                    liquidityPool,
                  );
                  expect(+lpTokenBalance).to.be.eq(+expectedLpBalanceFromPool);
                  const existingMode = await fulcrumAdapter.maxDepositProtocolMode();

                  if (existingMode == 0) {
                    const existingDepositAmount: BigNumber = await fulcrumAdapter.maxDepositAmount(
                      liquidityPool,
                      underlyingTokenAddress,
                    );
                    if (existingDepositAmount.eq(0)) {
                      expect(+lpTokenBalance).to.be.eq(0);
                    } else {
                      expect(+lpTokenBalance).to.be.gt(0);
                    }
                  } else {
                    const existingPoolPct: BigNumber = await fulcrumAdapter.maxDepositPoolPct(liquidityPool);
                    const existingProtocolPct: BigNumber = await fulcrumAdapter.maxDepositProtocolPct();
                    if (existingPoolPct.eq(0) && existingProtocolPct.eq(0)) {
                      expect(+lpTokenBalance).to.be.eq(0);
                    } else if (!existingPoolPct.eq(0) || !existingProtocolPct.eq(0)) {
                      expectedValue == "=0" ? expect(+lpTokenBalance).to.be.eq(0) : expect(+lpTokenBalance).to.be.gt(0);
                    }
                  }
                  break;
                }
                case "balanceOf(address)": {
                  const expectedValue = action.expectedValue;
                  const underlyingBalanceAfter: BigNumber = await ERC20Instance.balanceOf(testDeFiAdapter.address);
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
                case "getUnderlyingTokens(address,address)": {
                  expect([
                    getAddress((await fulcrumAdapter[action.action](liquidityPool, ADDRESS_ZERO))[0]),
                  ]).to.have.members([getAddress(await LpERC20Instance.loanTokenAddress())]);
                  break;
                }
                case "calculateAmountInLPToken(address,address,uint256)": {
                  const _depositAmount: BigNumber = defaultFundAmount;
                  expect(
                    await fulcrumAdapter[action.action](underlyingTokenAddress, liquidityPool, _depositAmount),
                  ).to.be.eq(
                    _depositAmount
                      .mul(to_10powNumber_BN(await LpERC20Instance.decimals()))
                      .div(await LpERC20Instance.tokenPrice()),
                  );
                  break;
                }
                case "getPoolValue(address,address)": {
                  expect(await fulcrumAdapter[action.action](liquidityPool, ADDRESS_ZERO)).to.be.eq(
                    await LpERC20Instance.marketLiquidity(),
                  );
                  break;
                }
                case "getLiquidityPoolToken(address,address)": {
                  expect(getAddress(await fulcrumAdapter[action.action](ADDRESS_ZERO, liquidityPool))).to.be.eq(
                    getAddress(liquidityPool),
                  );
                  break;
                }
                case "getSomeAmountInToken(address,address,uint256)": {
                  const _lpTokenDecimals = await LpERC20Instance.decimals();
                  const _lpTokenAmount: BigNumber = defaultFundAmount.mul(
                    BigNumber.from(BigNumber.from(10).pow(_lpTokenDecimals)),
                  );
                  if (_lpTokenAmount.gt(0)) {
                    expect(await fulcrumAdapter[action.action](ADDRESS_ZERO, liquidityPool, _lpTokenAmount)).to.be.eq(
                      _lpTokenAmount
                        .mul(await LpERC20Instance.tokenPrice())
                        .div(to_10powNumber_BN(await LpERC20Instance.decimals())),
                    );
                  }
                  break;
                }
                case "calculateRedeemableLPTokenAmount(address,address,address,uint256)": {
                  const _lpTokenBalance: BigNumber = await fulcrumAdapter.getLiquidityPoolTokenBalance(
                    testDeFiAdapter.address,
                    underlyingTokenAddress,
                    liquidityPool,
                  );
                  const _balanceInToken: BigNumber = await fulcrumAdapter.getAllAmountInToken(
                    testDeFiAdapter.address,
                    underlyingTokenAddress,
                    liquidityPool,
                  );
                  const _testRedeemAmount: BigNumber = _lpTokenBalance;
                  const expectedRedeemableLpTokenAmt = _lpTokenBalance
                    .mul(_testRedeemAmount)
                    .div(_balanceInToken)
                    .add(BigNumber.from(1));
                  expect(
                    await fulcrumAdapter[action.action](
                      testDeFiAdapter.address,
                      underlyingTokenAddress,
                      liquidityPool,
                      _testRedeemAmount,
                    ),
                  ).to.be.eq(expectedRedeemableLpTokenAmt);
                  break;
                }
                case "isRedeemableAmountSufficient(address,address,address,uint256)": {
                  const expectedValue = action.expectedValue;
                  const _amountInUnderlyingToken: BigNumber = await fulcrumAdapter.getAllAmountInToken(
                    testDeFiAdapter.address,
                    underlyingTokenAddress,
                    liquidityPool,
                  );
                  if (expectedValue == ">") {
                    expect(
                      await fulcrumAdapter[action.action](
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                        _amountInUnderlyingToken.add(BigNumber.from(10)),
                      ),
                    ).to.be.eq(false);
                  } else if (expectedValue == "<") {
                    expect(
                      await fulcrumAdapter[action.action](
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                        _amountInUnderlyingToken.gt(0)
                          ? _amountInUnderlyingToken.sub(BigNumber.from(10))
                          : BigNumber.from(0),
                      ),
                    ).to.be.eq(true);
                  }
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
                case "setMaxDepositProtocolPct(uint256)": {
                  const existingProtocolPct: BigNumber = await fulcrumAdapter.maxDepositProtocolPct();
                  if (!existingProtocolPct.eq(BigNumber.from(0))) {
                    await fulcrumAdapter.setMaxDepositProtocolPct(0);
                  }
                  break;
                }
              }
            }
            for (const action of story.getActions) {
              switch (action.action) {
                case "getLiquidityPoolTokenBalance(address,address,address)": {
                  const lpTokenBalance = await fulcrumAdapter[action.action](
                    testDeFiAdapter.address,
                    underlyingTokenAddress,
                    liquidityPool,
                  );
                  expect(lpTokenBalance).to.be.eq(0);
                  break;
                }
                case "balanceOf(address": {
                  const underlyingBalance: BigNumber = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                  expect(underlyingBalance).to.be.gt(0);
                  break;
                }
              }
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
              expect(await fulcrumAdapter[action.action](ADDRESS_ZERO)).to.be.eq(false);
              break;
            }
          }
        }
        for (const action of story.getActions) {
          switch (action.action) {
            case "getRewardToken(address)": {
              expect(await fulcrumAdapter[action.action](ADDRESS_ZERO)).to.be.eq(ADDRESS_ZERO);
              break;
            }
          }
        }
      });
    }
  });
});
