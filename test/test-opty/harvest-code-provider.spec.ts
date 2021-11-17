import { expect } from "chai";
import hre from "hardhat";
import { Signer, Contract, BigNumber } from "ethers";
import { CONTRACTS } from "../../helpers/type";
import { TypedTokens } from "../../helpers/data";
import { deployContract, getDefaultFundAmountInDecimal } from "../../helpers/helpers";
import { fundWalletToken, getBlockTimestamp } from "../../helpers/contracts-actions";
import { TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants/utils";
import { REWARD_TOKENS, VAULT_TOKENS } from "../../helpers/constants/tokens";
import { TypedContracts } from "../../helpers/data";
import { deployAdapterPrerequisites } from "../../helpers/contracts-deployments";
import IUniswapV2Pair from "@uniswap/v2-periphery/build/IUniswapV2Pair.json";
import IUniswapV2Router02 from "@uniswap/v2-periphery/build/IUniswapV2Router02.json";
import scenario from "./scenarios/harvest-code-provider.json";
import { getAddress } from "ethers/lib/utils";

type ARGUMENTS = {
  token?: string;
};

describe(scenario.title, () => {
  let owner: Signer;
  let adapterPrerequisites: CONTRACTS;
  let testHarvestCodeProvider: Contract;
  const rewardTokenAdapterNames = Object.keys(REWARD_TOKENS);
  const underlyingTokenNames = Object.keys(VAULT_TOKENS);
  let isPair: boolean;
  before(async () => {
    [owner] = await hre.ethers.getSigners();
    adapterPrerequisites = await deployAdapterPrerequisites(hre, owner, TESTING_DEPLOYMENT_ONCE);
    testHarvestCodeProvider = await deployContract(hre, "TestHarvestCodeProvider", false, owner, []);
  });

  for (let i = 0; i < rewardTokenAdapterNames.length; i++) {
    const rewardTokenName = REWARD_TOKENS[rewardTokenAdapterNames[i]].tokenName as string;
    const rewardTokenAddress = REWARD_TOKENS[rewardTokenAdapterNames[i]].tokenAddress as string;
    for (let i = 0; i < underlyingTokenNames.length; i++) {
      const underlyingTokenName = underlyingTokenNames[i];
      const underlyingTokenAddress = VAULT_TOKENS[underlyingTokenNames[i]].address;
      describe(rewardTokenName + " --> " + underlyingTokenName, () => {
        for (let j = 0; j < scenario.stories.length; j++) {
          const story = scenario.stories[j];
          it(`${story.description}`, async function () {
            isPair = VAULT_TOKENS[underlyingTokenNames[i]].pair;
            const rewardTokenInstance = await hre.ethers.getContractAt("ERC20", rewardTokenAddress);
            const rewardTokenDecimals = await rewardTokenInstance.decimals();
            const defaultFundAmount = getDefaultFundAmountInDecimal(rewardTokenAddress, rewardTokenDecimals);
            const underlyingTokenInstance = await hre.ethers.getContractAt("ERC20", underlyingTokenAddress);
            const timestamp = (await getBlockTimestamp(hre)) * 2;
            const pairInstance = await hre.ethers.getContractAt(IUniswapV2Pair.abi, underlyingTokenAddress);
            const wethInstance = await hre.ethers.getContractAt("ERC20", TypedTokens.WETH);
            for (let i = 0; i < story.setActions.length; i++) {
              const action = story.setActions[i];
              switch (action.action) {
                case "fundTestHarvestCodeProviderContract": {
                  const { token } = action.args as ARGUMENTS;
                  if (token === "reward") {
                    await fundWalletToken(
                      hre,
                      rewardTokenAddress,
                      owner,
                      defaultFundAmount,
                      timestamp,
                      testHarvestCodeProvider.address,
                    );
                  } else if (token === "underlyingTokens") {
                    if (!isPair || getAddress(rewardTokenAddress) !== TypedTokens.SUSHI) {
                      this.skip();
                    } else {
                      const token0 = await pairInstance.token0();
                      const token1 = await pairInstance.token1();
                      const token0Instance = await hre.ethers.getContractAt("ERC20", token0);
                      const token1Instance = await hre.ethers.getContractAt("ERC20", token1);
                      const token0Decimals = await token0Instance.decimals();
                      const token1Decimals = await token1Instance.decimals();
                      await fundWalletToken(
                        hre,
                        token0,
                        owner,
                        getDefaultFundAmountInDecimal(token0, token0Decimals),
                        timestamp,
                        testHarvestCodeProvider.address,
                      );
                      await fundWalletToken(
                        hre,
                        token1,
                        owner,
                        getDefaultFundAmountInDecimal(token1, token1Decimals),
                        timestamp,
                        testHarvestCodeProvider.address,
                      );
                    }
                  } else if (token === "weth") {
                    await fundWalletToken(
                      hre,
                      TypedTokens.WETH,
                      owner,
                      getDefaultFundAmountInDecimal(TypedTokens.WETH, await wethInstance.decimals()),
                      timestamp,
                      testHarvestCodeProvider.address,
                    );
                  }
                  break;
                }
                case "testGetHarvestCodes(address,address,address,uint256)": {
                  if (
                    (getAddress(rewardTokenAddress) !== getAddress(TypedTokens.SUSHI) && !isPair) ||
                    (getAddress(rewardTokenAddress) === getAddress(TypedTokens.SUSHI) && isPair)
                  ) {
                    await testHarvestCodeProvider[action.action](
                      rewardTokenAddress,
                      underlyingTokenAddress,
                      adapterPrerequisites.harvestCodeProvider.address,
                      rewardTokenInstance.balanceOf(testHarvestCodeProvider.address),
                    );
                  } else {
                    this.skip();
                  }
                  break;
                }
                case "testGetAddLiquidityCodes(address,address,address)": {
                  if (getAddress(rewardTokenAddress) !== getAddress(TypedTokens.SUSHI)) {
                    this.skip();
                  } else {
                    const symbol = await pairInstance.symbol();
                    symbol === "SLP"
                      ? await testHarvestCodeProvider[action.action](
                          TypedContracts.SUSHISWAP_ROUTER,
                          underlyingTokenAddress,
                          adapterPrerequisites.harvestCodeProvider.address,
                        )
                      : await testHarvestCodeProvider[action.action](
                          TypedContracts.UNISWAPV2_ROUTER,
                          underlyingTokenAddress,
                          adapterPrerequisites.harvestCodeProvider.address,
                        );
                  }
                  break;
                }
              }
            }
            for (let i = 0; i < story.getActions.length; i++) {
              const action = story.getActions[i];
              switch (action.action) {
                case "balanceOf(address)": {
                  const { token }: ARGUMENTS = action.args;
                  if (token === "reward") {
                    const rewardBalance = await rewardTokenInstance.balanceOf(testHarvestCodeProvider.address);
                    expect(rewardBalance).to.be.eq(0);
                  } else if (token === "underlyingTokens") {
                    const token0 = await pairInstance.token0();
                    const token1 = await pairInstance.token1();
                    const token0Instance = await hre.ethers.getContractAt("ERC20", token0);
                    const token1Instance = await hre.ethers.getContractAt("ERC20", token1);
                    const token0balance = await token0Instance.balanceOf(testHarvestCodeProvider.address);
                    const token1balance = await token1Instance.balanceOf(testHarvestCodeProvider.address);
                    expect(true).to.satisfy(function () {
                      if (token0balance.eq(0) || token1balance.eq(0)) {
                        return true;
                      } else {
                        return false;
                      }
                    });
                  } else if (token === "underlyingToken") {
                    if (isPair) {
                      const token0 = await pairInstance.token0();
                      const token1 = await pairInstance.token1();
                      const token0Instance = await hre.ethers.getContractAt("ERC20", token0);
                      const token1Instance = await hre.ethers.getContractAt("ERC20", token1);
                      const token0balance = await token0Instance.balanceOf(testHarvestCodeProvider.address);
                      const token1balance = await token1Instance.balanceOf(testHarvestCodeProvider.address);
                      expect(token0balance).to.be.gt(0);
                      expect(token1balance).to.be.gt(0);
                    } else {
                      const underlyingTokenBalance = await underlyingTokenInstance.balanceOf(
                        testHarvestCodeProvider.address,
                      );
                      expect(underlyingTokenBalance).to.be.gt(0);
                    }
                  } else if (token === "pair") {
                    const pairTokenBalance = await pairInstance.balanceOf(testHarvestCodeProvider.address);
                    expect(pairTokenBalance).to.be.gt(0);
                  }
                  break;
                }
                case "getOptimalTokenAmount(address,address,uint256)": {
                  if (!isPair) {
                    const rewardTokenAmount = await rewardTokenInstance.balanceOf(testHarvestCodeProvider.address);
                    const expectedAmount = await adapterPrerequisites.harvestCodeProvider[action.action](
                      rewardTokenAddress,
                      underlyingTokenAddress,
                      rewardTokenAmount,
                    );
                    const uniswapRouterInstance = await hre.ethers.getContractAt(
                      IUniswapV2Router02.abi,
                      TypedContracts.UNISWAPV2_ROUTER,
                    );
                    let amounts;
                    if (getAddress(underlyingTokenAddress) === getAddress(TypedTokens.WETH)) {
                      amounts = await uniswapRouterInstance.getAmountsOut(rewardTokenAmount, [
                        TypedTokens[rewardTokenName],
                        TypedTokens.WETH,
                      ]);
                    } else {
                      amounts = await uniswapRouterInstance.getAmountsOut(rewardTokenAmount, [
                        TypedTokens[rewardTokenName],
                        TypedTokens.WETH,
                        TypedTokens[underlyingTokenName],
                      ]);
                    }
                    expect(amounts[amounts.length - 1]).to.be.eq(expectedAmount);
                  } else {
                    this.skip();
                  }
                  break;
                }
                case "rewardBalanceInUnderlyingTokens(address,address,uint256)": {
                  const rewardTokenAmount = await rewardTokenInstance.balanceOf(testHarvestCodeProvider.address);
                  let expectedAmount;
                  const uniswapRouterInstance = await hre.ethers.getContractAt(
                    IUniswapV2Router02.abi,
                    TypedContracts.UNISWAPV2_ROUTER,
                  );
                  let amounts;
                  let finalAmount;
                  if (getAddress(rewardTokenAddress) === getAddress(TypedTokens.SUSHI)) {
                    if (isPair && getAddress(rewardTokenAddress) === TypedTokens.SUSHI) {
                      expectedAmount = await adapterPrerequisites.harvestCodeProvider[action.action](
                        rewardTokenAddress,
                        underlyingTokenAddress,
                        rewardTokenAmount,
                      );
                      let amountsB;
                      const sushiswapRouterInstance = await hre.ethers.getContractAt(
                        IUniswapV2Router02.abi,
                        TypedContracts.SUSHISWAP_ROUTER,
                      );
                      const token0 = await pairInstance.token0();
                      const token1 = await pairInstance.token1();
                      if (getAddress(token0) === getAddress(TypedTokens.WETH)) {
                        amounts = await sushiswapRouterInstance.getAmountsOut(
                          rewardTokenAmount.div(BigNumber.from(2)),
                          [TypedTokens[rewardTokenName], TypedTokens.WETH],
                        );
                      } else {
                        amounts = await sushiswapRouterInstance.getAmountsOut(
                          rewardTokenAmount.div(BigNumber.from(2)),
                          [TypedTokens[rewardTokenName], TypedTokens.WETH, token0],
                        );
                      }
                      if (getAddress(token1) === getAddress(TypedTokens.WETH)) {
                        amountsB = await sushiswapRouterInstance.getAmountsOut(
                          rewardTokenAmount.div(BigNumber.from(2)),
                          [TypedTokens[rewardTokenName], TypedTokens.WETH],
                        );
                      } else {
                        amountsB = await sushiswapRouterInstance.getAmountsOut(
                          rewardTokenAmount.div(BigNumber.from(2)),
                          [TypedTokens[rewardTokenName], TypedTokens.WETH, token1],
                        );
                      }
                      const [reserve0, reserve1] = await pairInstance.getReserves();
                      const quoteAmount = await sushiswapRouterInstance.quote(
                        amounts[amounts.length - 1],
                        reserve0,
                        reserve1,
                      );
                      if (quoteAmount.gte(amountsB[amountsB.length - 1])) {
                        finalAmount = amountsB[amountsB.length - 1].mul(await pairInstance.totalSupply()).div(reserve1);
                      } else {
                        finalAmount = quoteAmount.mul(await pairInstance.totalSupply()).div(reserve1);
                      }
                      expect(finalAmount).to.be.eq(expectedAmount);
                    } else {
                      this.skip();
                    }
                  } else if (getAddress(rewardTokenAddress) === getAddress(TypedTokens.UNI)) {
                    if (isPair && getAddress(rewardTokenAddress) === TypedTokens.UNI) {
                      expectedAmount = await adapterPrerequisites.harvestCodeProvider[action.action](
                        rewardTokenAddress,
                        underlyingTokenAddress,
                        rewardTokenAmount,
                      );
                      let amountsB;
                      const token0 = await pairInstance.token0();
                      const token1 = await pairInstance.token1();
                      if (getAddress(token0) === getAddress(TypedTokens.WETH)) {
                        amounts = await uniswapRouterInstance.getAmountsOut(rewardTokenAmount.div(BigNumber.from(2)), [
                          TypedTokens[rewardTokenName],
                          TypedTokens.WETH,
                        ]);
                      } else {
                        amounts = await uniswapRouterInstance.getAmountsOut(rewardTokenAmount.div(BigNumber.from(2)), [
                          TypedTokens[rewardTokenName],
                          TypedTokens.WETH,
                          token0,
                        ]);
                      }
                      if (getAddress(token1) === getAddress(TypedTokens.WETH)) {
                        amountsB = await uniswapRouterInstance.getAmountsOut(rewardTokenAmount.div(BigNumber.from(2)), [
                          TypedTokens[rewardTokenName],
                          TypedTokens.WETH,
                        ]);
                      } else {
                        amountsB = await uniswapRouterInstance.getAmountsOut(rewardTokenAmount.div(BigNumber.from(2)), [
                          TypedTokens[rewardTokenName],
                          TypedTokens.WETH,
                          token1,
                        ]);
                      }
                      const [reserve0, reserve1] = await pairInstance.getReserves();
                      const quoteAmount = uniswapRouterInstance.quote(amounts[amounts.length - 1], reserve0, reserve1);
                      if (quoteAmount.gte(amountsB[amountsB.length - 1])) {
                        finalAmount = amountsB[amountsB.length - 1].mul(await pairInstance.totalSupply()).div(reserve1);
                      } else {
                        finalAmount = quoteAmount.mul(await pairInstance.totalSupply()).div(reserve1);
                      }
                      expect(finalAmount).to.be.eq(expectedAmount);
                    } else {
                      this.skip();
                    }
                  } else if (!isPair) {
                    expectedAmount = await adapterPrerequisites.harvestCodeProvider[action.action](
                      rewardTokenAddress,
                      underlyingTokenAddress,
                      rewardTokenAmount,
                    );
                    if (getAddress(underlyingTokenAddress) === getAddress(TypedTokens.WETH)) {
                      amounts = await uniswapRouterInstance.getAmountsOut(rewardTokenAmount, [
                        TypedTokens[rewardTokenName],
                        TypedTokens.WETH,
                      ]);
                    } else {
                      amounts = await uniswapRouterInstance.getAmountsOut(rewardTokenAmount, [
                        TypedTokens[rewardTokenName],
                        TypedTokens.WETH,
                        TypedTokens[underlyingTokenName],
                      ]);
                    }
                    expect(amounts[amounts.length - 1]).to.be.eq(expectedAmount);
                  } else {
                    this.skip();
                  }
                  break;
                }
                case "getWETHInToken(address,uint256)": {
                  if (!isPair) {
                    const wethAmount = await wethInstance.balanceOf(testHarvestCodeProvider.address);
                    const expectedAmount = await adapterPrerequisites.harvestCodeProvider[action.action](
                      underlyingTokenAddress,
                      wethAmount,
                    );
                    let finalAmount;
                    if (getAddress(underlyingTokenAddress) === getAddress(TypedTokens.WETH)) {
                      finalAmount = wethAmount;
                    } else {
                      const uniswapRouterInstance = await hre.ethers.getContractAt(
                        IUniswapV2Router02.abi,
                        TypedContracts.UNISWAPV2_ROUTER,
                      );
                      const amounts = await uniswapRouterInstance.getAmountsOut(wethAmount, [
                        TypedTokens.WETH,
                        TypedTokens[underlyingTokenName],
                      ]);
                      finalAmount = amounts[amounts.length - 1];
                    }
                    expect(finalAmount).to.be.eq(expectedAmount);
                  } else {
                    this.skip();
                  }
                  break;
                }
              }
            }
            for (let i = 0; i < story.cleanActions.length; i++) {
              const action = story.cleanActions[i];
              switch (action.action) {
                case "burnTokens": {
                  const { token }: ARGUMENTS = action.args;
                  if (token === "underlyingToken") {
                    await testHarvestCodeProvider.burnTokens(underlyingTokenAddress);
                    const underlyingTokenBalance = await underlyingTokenInstance.balanceOf(
                      testHarvestCodeProvider.address,
                    );
                    expect(underlyingTokenBalance).to.be.eq(0);
                  } else if (token === "pair") {
                    await testHarvestCodeProvider.burnTokens(underlyingTokenAddress);
                    const pairTokenBalance = await pairInstance.balanceOf(testHarvestCodeProvider.address);
                    expect(pairTokenBalance).to.be.eq(0);
                  } else if (token === "reward") {
                    await testHarvestCodeProvider.burnTokens(rewardTokenAddress);
                    const rewardTokenBalance = await rewardTokenInstance.balanceOf(testHarvestCodeProvider.address);
                    expect(rewardTokenBalance).to.be.eq(0);
                  } else if (token === "weth") {
                    await testHarvestCodeProvider.burnTokens(TypedTokens.WETH);
                    const wethBalance = await wethInstance.balanceOf(testHarvestCodeProvider.address);
                    expect(wethBalance).to.be.eq(0);
                  }
                  break;
                }
              }
            }
          });
        }
      });
    }
  }
});
