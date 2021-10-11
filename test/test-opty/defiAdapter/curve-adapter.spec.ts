import chai, { expect, assert } from "chai";
import hre from "hardhat";
import { solidity } from "ethereum-waffle";
import { Contract, Signer, BigNumber, utils, ethers } from "ethers";
import { getAddress } from "ethers/lib/utils";
import { CONTRACTS } from "../../../helpers/type";
import {
  TOKENS,
  TESTING_DEPLOYMENT_ONCE,
  ADDRESS_ZERO,
  CURVE_DEPOSIT_POOL_ADAPTER_NAME,
  CURVE_SWAP_POOL_ADAPTER_NAME,
} from "../../../helpers/constants";
import { TypedAdapterStrategies, TypedDefiPools, TypedTokens } from "../../../helpers/data";
import { deployAdapter, deployAdapterPrerequisites } from "../../../helpers/contracts-deployments";
import { fundWalletToken, getBlockTimestamp } from "../../../helpers/contracts-actions";
import scenarios from "../scenarios/adapters.json";
import testDeFiAdapterScenario from "../scenarios/test-defi-adapter.json";
import { deployContract, getDefaultFundAmountInDecimal } from "../../../helpers/helpers";
import { ERC20 } from "../../../typechain/ERC20";

chai.use(solidity);

type ARGUMENTS = {
  amount?: { [key: string]: string };
};

type TEST_DEFI_ADAPTER_ARGUMENTS = {
  maxDepositProtocolPct?: number;
  maxDepositPoolPct?: number;
  maxDepositAmount?: number;
  mode?: number;
};
const curveAdapters: CONTRACTS = {};
describe("CurveAdapters Unit test", () => {
  const MAX_AMOUNT: { [key: string]: BigNumber } = {
    DAI: BigNumber.from("1000000000000000000000"),
    USDC: BigNumber.from("1000000000"),
  };
  let adapterPrerequisites: CONTRACTS;
  let ownerAddress: string;
  let users: { [key: string]: Signer };
  before(async () => {
    try {
      const [owner, admin, user1] = await hre.ethers.getSigners();
      users = { owner, admin, user1 };
      ownerAddress = await owner.getAddress();
      adapterPrerequisites = await deployAdapterPrerequisites(hre, owner, TESTING_DEPLOYMENT_ONCE);
      assert.isDefined(adapterPrerequisites, "Adapter pre-requisites contracts not deployed");
      curveAdapters[CURVE_DEPOSIT_POOL_ADAPTER_NAME] = await deployAdapter(
        hre,
        owner,
        CURVE_DEPOSIT_POOL_ADAPTER_NAME,
        adapterPrerequisites["registry"].address,
        TESTING_DEPLOYMENT_ONCE,
      );
      assert.isDefined(curveAdapters[CURVE_DEPOSIT_POOL_ADAPTER_NAME], "CurveDepositPoolAdapter not deployed");
      curveAdapters[CURVE_SWAP_POOL_ADAPTER_NAME] = await deployAdapter(
        hre,
        owner,
        CURVE_SWAP_POOL_ADAPTER_NAME,
        adapterPrerequisites["registry"].address,
        TESTING_DEPLOYMENT_ONCE,
      );
      assert.isDefined(curveAdapters[CURVE_SWAP_POOL_ADAPTER_NAME], "CurveSwapPoolAdapter not deployed");
    } catch (error) {
      console.log(error);
    }
  });

  for (const curveAdapterName of [CURVE_DEPOSIT_POOL_ADAPTER_NAME, CURVE_SWAP_POOL_ADAPTER_NAME]) {
    const strategies = TypedAdapterStrategies[curveAdapterName];
    for (let i = 0; i < strategies.length; i++) {
      describe(`${curveAdapterName} - test getCodes() for ${strategies[i].strategyName}`, async () => {
        const strategy = strategies[i];
        let lpToken: string;
        let nCoins: string[];
        const depositAmount: string[] = [];
        before(async () => {
          try {
            const timestamp = (await getBlockTimestamp(hre)) * 2;
            nCoins = await curveAdapters[curveAdapterName].getUnderlyingTokens(
              strategy.strategy[0].contract,
              ADDRESS_ZERO,
            );
            for (let i = 0; i < nCoins.length; i++) {
              if (nCoins[i] === TOKENS["DAI"]) {
                await fundWalletToken(hre, nCoins[i], users["owner"], MAX_AMOUNT["DAI"], timestamp);
                depositAmount.push(MAX_AMOUNT["DAI"].div(BigNumber.from("2")).toString());
              } else if (nCoins[i] === TOKENS["USDC"]) {
                await fundWalletToken(hre, nCoins[i], users["owner"], MAX_AMOUNT["USDC"], timestamp);
                depositAmount.push(MAX_AMOUNT["USDC"].div(BigNumber.from("2")).toString());
              } else {
                depositAmount.push("0");
              }
            }
            lpToken = await curveAdapters[curveAdapterName].getLiquidityPoolToken(
              ADDRESS_ZERO,
              strategy.strategy[0].contract,
            );
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
                  if (action.action === "getDepositSomeCodes(address,address,address,uint256)") {
                    const { amount }: ARGUMENTS = action.args;
                    if (amount) {
                      codes = await curveAdapters[curveAdapterName][action.action](
                        ADDRESS_ZERO,
                        nCoins[0], // DAI
                        strategy.strategy[0].contract,
                        depositAmount[0],
                      );
                    }
                  } else {
                    codes = await curveAdapters[curveAdapterName][action.action](
                      ownerAddress,
                      nCoins[0],
                      strategy.strategy[0].contract,
                    );
                  }
                  if (codes.length > 0) {
                    for (let i = 0; i < codes.length - 1; i = i + 2) {
                      const tokenIndex = i / 2;
                      if (parseInt(depositAmount[tokenIndex]) > 0) {
                        const inter = new utils.Interface(["function approve(address,uint256)"]);
                        const checkApproval = (code: string, amount: string) => {
                          if (code !== "0x") {
                            const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], code);
                            expect(address).to.equal(nCoins[tokenIndex]);
                            const value = inter.decodeFunctionData("approve", abiCode);
                            expect(value[0]).to.equal(strategy.strategy[0].contract);
                            if (action.action === "getDepositSomeCodes(address,address,address,uint256)") {
                              expect(value[1]).to.equal(amount);
                            }
                          }
                        };
                        checkApproval(codes[i], "0");
                        checkApproval(codes[i + 1], depositAmount[tokenIndex]);
                      }
                    }
                    const inter = new utils.Interface([`function add_liquidity(uint256[${nCoins.length}],uint256)`]);
                    const [address, abiCode] = utils.defaultAbiCoder.decode(
                      ["address", "bytes"],
                      codes[codes.length - 1],
                    );
                    expect(address).to.equal(strategy.strategy[0].contract);
                    const value = inter.decodeFunctionData("add_liquidity", abiCode);
                    if (action.action === "getDepositSomeCodes(address,address,address,uint256)") {
                      expect(value[0].length).to.equal(depositAmount.length);
                      expect(value[0][0]).to.equal(depositAmount[0]);
                    }
                    expect(value[1]).to.equal(0);
                  }

                  break;
                }
                case "getWithdrawAllCodes(address,address,address)":
                case "getWithdrawSomeCodes(address,address,address,uint256)": {
                  let codes;
                  const withdrawalAmount = BigNumber.from("1000000000");
                  if (action.action === "getWithdrawSomeCodes(address,address,address,uint256)") {
                    const { amount }: ARGUMENTS = action.args;
                    if (amount) {
                      codes = await curveAdapters[curveAdapterName][action.action](
                        ADDRESS_ZERO,
                        nCoins[0],
                        strategy.strategy[0].contract,
                        withdrawalAmount,
                      );
                    }
                  } else {
                    codes = await curveAdapters[curveAdapterName][action.action](
                      ownerAddress,
                      nCoins[0],
                      strategy.strategy[0].contract,
                    );
                  }

                  for (let i = 0; i < codes.length; i++) {
                    if (i < 2) {
                      const inter = new utils.Interface(["function approve(address,uint256)"]);
                      const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                      expect(address).to.equal(lpToken);
                      const value = inter.decodeFunctionData("approve", abiCode);
                      expect(value[0]).to.equal(strategy.strategy[0].contract);
                      if (action.action === "getWithdrawSomeCodes(address,address,address,uint256)") {
                        expect(value[1]).to.equal(i == 0 ? 0 : withdrawalAmount);
                      }
                    } else {
                      const inter = new utils.Interface([`function remove_liquidity_one_coin(uint256,int128,uint256)`]);
                      const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                      expect(address).to.equal(strategy.strategy[0].contract);
                      const value = inter.decodeFunctionData("remove_liquidity_one_coin", abiCode);
                      if (action.action === "getWithdrawSomeCodes(address,address,address,uint256)") {
                        expect(value[0]).to.equal(withdrawalAmount);
                      }
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
  }

  describe("CurveAdapters pools test", () => {
    let testDeFiAdapter: Contract;

    before(async () => {
      testDeFiAdapter = await deployContract(hre, "TestDeFiAdapter", false, users["owner"], []);
    });

    for (const curveAdapterName of [CURVE_DEPOSIT_POOL_ADAPTER_NAME, CURVE_SWAP_POOL_ADAPTER_NAME]) {
      describe(`Test-${curveAdapterName}`, () => {
        const pools = Object.keys(TypedDefiPools[curveAdapterName]);
        for (const pool of pools) {
          const underlyingTokenAddress = getAddress(TypedDefiPools[curveAdapterName][pool].tokens[0]);
          // TODO: Get USDK,LINKUSD,SBTC from DEX
          if (
            TypedDefiPools[curveAdapterName][pool].tokens.length == 1 &&
            getAddress(underlyingTokenAddress) != getAddress(TypedTokens.USDK) &&
            getAddress(underlyingTokenAddress) != getAddress(TypedTokens.LINKUSD) &&
            getAddress(underlyingTokenAddress) != getAddress(TypedTokens.SBTC) &&
            getAddress(underlyingTokenAddress) != getAddress(TypedTokens.HBTC) &&
            getAddress(underlyingTokenAddress) != getAddress(TypedTokens.THREE_CRV)
          ) {
            for (const story of testDeFiAdapterScenario.stories) {
              it(`${pool} - ${story.description}`, async () => {
                const ERC20Instance = <ERC20>await hre.ethers.getContractAt("ERC20", underlyingTokenAddress);
                const decimals = await ERC20Instance.decimals();
                let defaultFundAmount: BigNumber = getDefaultFundAmountInDecimal(underlyingTokenAddress, decimals);
                let limit: BigNumber;
                const timestamp = (await getBlockTimestamp(hre)) * 2;
                const liquidityPool = TypedDefiPools[curveAdapterName][pool].pool;
                const lpToken = await curveAdapters[curveAdapterName].getLiquidityPoolToken(
                  underlyingTokenAddress,
                  liquidityPool,
                );
                const LpERC20Instance = await hre.ethers.getContractAt("ERC20", lpToken);
                const adapterAddress = curveAdapters[curveAdapterName].address;
                let underlyingBalanceBefore: BigNumber = ethers.BigNumber.from(0);
                let limitInUnderlyingToken: BigNumber = ethers.BigNumber.from(0);
                for (const action of story.setActions) {
                  switch (action.action) {
                    case "setMaxDepositProtocolMode(uint8)": {
                      const { mode } = action.args as TEST_DEFI_ADAPTER_ARGUMENTS;
                      const existingMode = await curveAdapters[curveAdapterName].maxDepositProtocolMode();
                      if (existingMode != mode) {
                        await expect(curveAdapters[curveAdapterName][action.action](mode))
                          .to.emit(curveAdapters[curveAdapterName], "LogMaxDepositProtocolMode")
                          .withArgs(mode, ownerAddress);
                      }
                      break;
                    }
                    case "setMaxDepositProtocolPct(uint256)": {
                      const existingPoolPct: BigNumber = await curveAdapters[curveAdapterName].maxDepositPoolPct(
                        liquidityPool,
                      );
                      if (!existingPoolPct.eq(BigNumber.from(0))) {
                        await curveAdapters[curveAdapterName].setMaxDepositPoolPct(liquidityPool, 0);
                      }
                      const { maxDepositProtocolPct } = action.args as TEST_DEFI_ADAPTER_ARGUMENTS;
                      const existingProtocolPct: BigNumber = await curveAdapters[
                        curveAdapterName
                      ].maxDepositProtocolPct();
                      if (!existingProtocolPct.eq(BigNumber.from(maxDepositProtocolPct))) {
                        await expect(curveAdapters[curveAdapterName][action.action](maxDepositProtocolPct))
                          .to.emit(curveAdapters[curveAdapterName], "LogMaxDepositProtocolPct")
                          .withArgs(maxDepositProtocolPct, ownerAddress);
                      }
                      // Note: The pool value for curve pools will be in USD or BTC
                      const poolValue: BigNumber = await curveAdapters[curveAdapterName].getPoolValue(
                        liquidityPool,
                        underlyingTokenAddress,
                      );
                      limit = poolValue.mul(BigNumber.from(maxDepositProtocolPct)).div(BigNumber.from(10000));
                      limitInUnderlyingToken = limit.div(BigNumber.from(10).pow(BigNumber.from(18).sub(decimals)));
                      defaultFundAmount = defaultFundAmount.lte(limitInUnderlyingToken)
                        ? defaultFundAmount
                        : limitInUnderlyingToken;
                      break;
                    }
                    case "setMaxDepositPoolPct(address,uint256)": {
                      const { maxDepositPoolPct } = action.args as TEST_DEFI_ADAPTER_ARGUMENTS;
                      const existingPoolPct: BigNumber = await curveAdapters[curveAdapterName].maxDepositPoolPct(
                        liquidityPool,
                      );
                      if (!existingPoolPct.eq(BigNumber.from(maxDepositPoolPct))) {
                        await expect(curveAdapters[curveAdapterName][action.action](liquidityPool, maxDepositPoolPct))
                          .to.emit(curveAdapters[curveAdapterName], "LogMaxDepositPoolPct")
                          .withArgs(maxDepositPoolPct, ownerAddress);
                      }
                      // Note: The pool value for curve pools will be in USD or BTC
                      const poolValue: BigNumber = await curveAdapters[curveAdapterName].getPoolValue(
                        liquidityPool,
                        underlyingTokenAddress,
                      );
                      limit = poolValue.mul(BigNumber.from(maxDepositPoolPct)).div(BigNumber.from(10000));
                      limitInUnderlyingToken = limit.div(BigNumber.from(10).pow(BigNumber.from(18).sub(decimals)));
                      defaultFundAmount = defaultFundAmount.lte(limitInUnderlyingToken)
                        ? defaultFundAmount
                        : limitInUnderlyingToken;
                      break;
                    }
                    case "setMaxDepositAmount(address,address,uint256)": {
                      // Note: for curve maxDepositAmount will be in USD or BTC
                      const { maxDepositAmount } = action.args as TEST_DEFI_ADAPTER_ARGUMENTS;
                      const existingDepositAmount: BigNumber = await curveAdapters[curveAdapterName].maxDepositAmount(
                        liquidityPool,
                      );
                      if (
                        !existingDepositAmount.eq(
                          BigNumber.from(maxDepositAmount).mul(BigNumber.from(10).pow(BigNumber.from(18))),
                        )
                      ) {
                        await expect(
                          curveAdapters[curveAdapterName][action.action](
                            liquidityPool,
                            underlyingTokenAddress,
                            BigNumber.from(maxDepositAmount).mul(BigNumber.from(10).pow(BigNumber.from(18))),
                          ),
                        )
                          .to.emit(curveAdapters[curveAdapterName], "LogMaxDepositAmount")
                          .withArgs(
                            BigNumber.from(maxDepositAmount).mul(BigNumber.from(10).pow(BigNumber.from(18))),
                            ownerAddress,
                          );
                      }
                      const updatedDepositAmount: BigNumber = await curveAdapters[curveAdapterName].maxDepositAmount(
                        liquidityPool,
                      );
                      limitInUnderlyingToken = BigNumber.from(updatedDepositAmount).div(
                        BigNumber.from(10).pow(BigNumber.from(18).sub(decimals)),
                      );
                      defaultFundAmount = defaultFundAmount.lte(limitInUnderlyingToken)
                        ? defaultFundAmount
                        : limitInUnderlyingToken;
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
                      const lpTokenBalance = await curveAdapters[curveAdapterName].getLiquidityPoolTokenBalance(
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
                      const lpTokenBalance = await curveAdapters[curveAdapterName][action.action](
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      expect(+lpTokenBalance).to.be.eq(+expectedLpBalanceFromPool);
                      const existingMode = await curveAdapters[curveAdapterName].maxDepositProtocolMode();
                      if (existingMode == 0) {
                        const existingDepositAmount: BigNumber = await curveAdapters[curveAdapterName].maxDepositAmount(
                          liquidityPool,
                        );
                        if (existingDepositAmount.eq(0)) {
                          expect(lpTokenBalance).to.be.eq(0);
                        } else {
                          expect(lpTokenBalance).to.be.gt(0);
                        }
                      } else {
                        const existingPoolPct: BigNumber = await curveAdapters[curveAdapterName].maxDepositPoolPct(
                          liquidityPool,
                        );
                        const existingProtocolPct: BigNumber = await curveAdapters[
                          curveAdapterName
                        ].maxDepositProtocolPct();
                        if (existingPoolPct.eq(0) && existingProtocolPct.eq(0)) {
                          expect(lpTokenBalance).to.be.eq(0);
                        } else if (!existingPoolPct.eq(0) || !existingProtocolPct.eq(0)) {
                          expectedValue == "=0"
                            ? expect(lpTokenBalance).to.be.eq(0)
                            : expect(lpTokenBalance).to.be.gt(0);
                        }
                      }
                      break;
                    }
                    case "balanceOf(address)": {
                      const expectedValue = action.expectedValue;
                      const underlyingBalanceAfter: BigNumber = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      if (underlyingBalanceBefore.lt(limitInUnderlyingToken)) {
                        expectedValue == ">0"
                          ? expect(+underlyingBalanceAfter).to.be.gt(+underlyingBalanceBefore)
                          : expect(underlyingBalanceAfter).to.be.eq(0);
                      } else {
                        expect(underlyingBalanceAfter.div(BigNumber.from(10).pow(BigNumber.from(decimals)))).to.be.eq(
                          underlyingBalanceBefore
                            .sub(limitInUnderlyingToken)
                            .div(BigNumber.from(10).pow(BigNumber.from(decimals))),
                        );
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
                  }
                }
                for (const action of story.getActions) {
                  switch (action.action) {
                    case "getLiquidityPoolTokenBalance(address,address,address)": {
                      const lpTokenBalance = await curveAdapters[curveAdapterName][action.action](
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
              });
            }
          }
        }
      });
    }
  });
});
