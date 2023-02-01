import { BigNumber, Contract } from "ethers";
import { ethers } from "@weiroll/weiroll.js/node_modules/ethers";
import { Planner as weirollPlanner, Contract as weirollContract } from "@weiroll/weiroll.js";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { ReturnValue } from "../../type";
import { ICurveSwap__factory } from "../../../typechain";
import { getAddress } from "ethers/lib/utils";
import { AdapterInterface } from "../AdapterInterface";
import { JsonRpcProvider } from "@ethersproject/providers";

export class CurveAdapter implements AdapterInterface {
  vaultHelperInstance;
  curveHelperInstance;

  constructor(vaultHelperContract: Contract, curveHelper: Contract) {
    this.vaultHelperInstance = weirollContract.createContract(
      new ethers.Contract(vaultHelperContract.address, vaultHelperContract.interface),
    );
    this.curveHelperInstance = weirollContract.createContract(
      new ethers.Contract(curveHelper.address, curveHelper.interface),
    );
  }

  getDepositPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
    isSwap: boolean,
    inputTokenAmount: ReturnValue,
  ): weirollPlanner {
    const tokenIndex = this.getTokenIndex(inputToken, poolRegistry[getAddress(pool)].underlyingTokens).toNumber();
    switch (poolRegistry[pool].underlyingTokens.length) {
      case 2: {
        switch (tokenIndex) {
          case 0: {
            const mintAmount = planner.add(
              this.curveHelperInstance["getMintAmount_two_coin_zero_index_Curve(address,uint256,bool)"](
                pool,
                inputTokenAmount,
                true,
              ).staticcall(),
            );
            const minimumMintAmount = planner.add(
              this.vaultHelperInstance["getMinimumExpectedTokenOutPrice(uint256,uint256)"](mintAmount, 5).staticcall(),
            );
            planner.add(
              this.curveHelperInstance[
                "addLiquidity_two_coin_zero_index_Curve(address,address,address,uint256,uint256)"
              ](inputToken, pool, outputToken, inputTokenAmount, minimumMintAmount),
            );
            break;
          }
          case 1: {
            const mintAmount = planner.add(
              this.curveHelperInstance["getMintAmount_two_coin_one_index_Curve(address,uint256,bool)"](
                pool,
                inputTokenAmount,
                true,
              ).staticcall(),
            );
            const minimumMintAmount = planner.add(
              this.vaultHelperInstance["getMinimumExpectedTokenOutPrice(uint256,uint256)"](mintAmount, 5).staticcall(),
            );
            planner.add(
              this.curveHelperInstance[
                "addLiquidity_two_coin_one_index_Curve(address,address,address,uint256,uint256)"
              ](inputToken, pool, outputToken, inputTokenAmount, minimumMintAmount),
            );
            break;
          }
          default:
            throw new Error(`invalid index for ${inputToken} of ${pool}`);
        }
        break;
      }
      case 3: {
        switch (tokenIndex) {
          case 0: {
            const mintAmount = planner.add(
              this.curveHelperInstance["getMintAmount_three_coin_zero_index_Curve(address,uint256,bool)"](
                pool,
                inputTokenAmount,
                true,
              ).staticcall(),
            );
            const minimumMintAmount = planner.add(
              this.vaultHelperInstance["getMinimumExpectedTokenOutPrice(uint256,uint256)"](mintAmount, 5).staticcall(),
            );
            planner.add(
              this.curveHelperInstance[
                "addLiquidity_three_coin_zero_index_Curve(address,address,address,uint256,uint256)"
              ](inputToken, pool, outputToken, inputTokenAmount, minimumMintAmount),
            );
            break;
          }
          case 1: {
            const mintAmount = planner.add(
              this.curveHelperInstance["getMintAmount_three_coin_one_index_Curve(address,uint256,bool)"](
                pool,
                inputTokenAmount,
                true,
              ).staticcall(),
            );
            const minimumMintAmount = planner.add(
              this.vaultHelperInstance["getMinimumExpectedTokenOutPrice(uint256,uint256)"](mintAmount, 5).staticcall(),
            );
            planner.add(
              this.curveHelperInstance[
                "addLiquidity_three_coin_one_index_Curve(address,address,address,uint256,uint256)"
              ](inputToken, pool, outputToken, inputTokenAmount, minimumMintAmount),
            );
            break;
          }
          case 2: {
            const mintAmount = planner.add(
              this.curveHelperInstance["getMintAmount_three_coin_two_index_Curve(address,uint256,bool)"](
                pool,
                inputTokenAmount,
                true,
              ).staticcall(),
            );
            const minimumMintAmount = planner.add(
              this.vaultHelperInstance["getMinimumExpectedTokenOutPrice(uint256,uint256)"](mintAmount, 5).staticcall(),
            );
            planner.add(
              this.curveHelperInstance[
                "addLiquidity_three_coin_two_index_Curve(address,address,address,uint256,uint256)"
              ](inputToken, pool, outputToken, inputTokenAmount, minimumMintAmount),
            );
            break;
          }
          default:
            throw new Error(`invalid index for ${inputToken} of ${pool}`);
        }
        break;
      }
      case 4: {
        switch (tokenIndex) {
          case 0: {
            const mintAmount = planner.add(
              this.curveHelperInstance["getMintAmount_four_coin_zero_index_Curve(address,uint256,bool)"](
                pool,
                inputTokenAmount,
                true,
              ).staticcall(),
            );
            const minimumMintAmount = planner.add(
              this.vaultHelperInstance["getMinimumExpectedTokenOutPrice(uint256,uint256)"](mintAmount, 5).staticcall(),
            );
            planner.add(
              this.curveHelperInstance[
                "addLiquidity_four_coin_zero_index_Curve(address,address,address,uint256,uint256)"
              ](inputToken, pool, outputToken, inputTokenAmount, minimumMintAmount),
            );
            break;
          }
          case 1: {
            const mintAmount = planner.add(
              this.curveHelperInstance["getMintAmount_four_coin_one_index_Curve(address,uint256,bool)"](
                pool,
                inputTokenAmount,
                true,
              ).staticcall(),
            );
            const minimumMintAmount = planner.add(
              this.vaultHelperInstance["getMinimumExpectedTokenOutPrice(uint256,uint256)"](mintAmount, 5).staticcall(),
            );
            planner.add(
              this.curveHelperInstance[
                "addLiquidity_four_coin_one_index_Curve(address,address,address,uint256,uint256)"
              ](inputToken, pool, outputToken, inputTokenAmount, minimumMintAmount),
            );
            break;
          }
          case 2: {
            const mintAmount = planner.add(
              this.curveHelperInstance["getMintAmount_four_coin_two_index_Curve(address,uint256,bool)"](
                pool,
                inputTokenAmount,
                true,
              ).staticcall(),
            );
            const minimumMintAmount = planner.add(
              this.vaultHelperInstance["getMinimumExpectedTokenOutPrice(uint256,uint256)"](mintAmount, 5).staticcall(),
            );
            planner.add(
              this.curveHelperInstance[
                "addLiquidity_four_coin_two_index_Curve(address,address,address,uint256,uint256)"
              ](inputToken, pool, outputToken, inputTokenAmount, minimumMintAmount),
            );
            break;
          }
          case 3: {
            const mintAmount = planner.add(
              this.curveHelperInstance["getMintAmount_four_coin_three_index_Curve(address,uint256,bool)"](
                pool,
                inputTokenAmount,
                true,
              ).staticcall(),
            );
            const minimumMintAmount = planner.add(
              this.vaultHelperInstance["getMinimumExpectedTokenOutPrice(uint256,uint256)"](mintAmount, 5).staticcall(),
            );
            planner.add(
              this.curveHelperInstance[
                "addLiquidity_four_coin_three_index_Curve(address,address,address,uint256,uint256)"
              ](inputToken, pool, outputToken, inputTokenAmount, minimumMintAmount),
            );
            break;
          }
          default:
            throw new Error(`invalid index for ${inputToken} of ${pool}`);
        }
        break;
      }
      default:
        throw new Error(`${pool} not found in registry`);
    }
    return planner;
  }

  getWithdrawPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
    isSwap: boolean,
    outputTokenAmount: ReturnValue,
  ): weirollPlanner {
    const poolInstance = weirollContract.createContract(new ethers.Contract(pool, ICurveSwap__factory.abi));
    const tokenIndex = this.getTokenIndex(inputToken, poolRegistry[pool].underlyingTokens);
    const withdrawAmount = planner.add(
      this.curveHelperInstance["getCalc_withdraw_one_coin(address,uint256,int128)"](
        pool,
        outputTokenAmount,
        tokenIndex,
      ).staticcall(),
    );
    const minimumWithdrawAmount = planner.add(
      this.vaultHelperInstance["getMinimumExpectedTokenOutPrice(uint256,uint256)"](withdrawAmount, 300).staticcall(),
    );
    if (getAddress(inputToken) === getAddress(EthereumTokens.WRAPPED_TOKENS.WETH)) {
      planner.add(
        this.curveHelperInstance["withdrawETH(address,address,uint256,uint256,int128)"](
          pool,
          outputToken,
          outputTokenAmount,
          minimumWithdrawAmount,
          tokenIndex,
        ),
      );
    } else {
      planner.add(
        poolInstance["remove_liquidity_one_coin(uint256,int128,uint256)"](
          outputTokenAmount,
          tokenIndex,
          minimumWithdrawAmount,
        ),
      );
    }
    return planner;
  }

  getAmountInInputTokenPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
    isSwap: boolean,
    outputTokenAmount: ReturnValue,
  ): ReturnValue {
    const tokenIndex = this.getTokenIndex(inputToken, poolRegistry[pool].underlyingTokens);
    const amountUT = planner.add(
      this.curveHelperInstance["getCalc_withdraw_one_coin(address,uint256,int128)"](
        pool,
        outputTokenAmount,
        tokenIndex,
      ).staticcall(),
    );
    return amountUT as ReturnValue;
  }

  getAmountInOutputTokenPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
    isSwap: boolean,
    inputTokenAmount: ReturnValue,
  ): ReturnValue {
    const tokenIndex = this.getTokenIndex(inputToken, poolRegistry[pool].underlyingTokens).toNumber();
    let amountLP;
    switch (poolRegistry[pool].underlyingTokens.length) {
      case 2: {
        switch (tokenIndex) {
          case 0: {
            amountLP = planner.add(
              this.curveHelperInstance["getMintAmount_two_coin_zero_index_Curve(address,uint256,bool)"](
                pool,
                inputTokenAmount,
                true,
              ).staticcall(),
            );
            break;
          }
          case 1: {
            amountLP = planner.add(
              this.curveHelperInstance["getMintAmount_two_coin_one_index_Curve(address,uint256,bool)"](
                pool,
                inputTokenAmount,
                true,
              ).staticcall(),
            );
            break;
          }
          default:
            throw new Error(`invalid index for ${inputToken} of ${pool}`);
        }
        break;
      }
      case 3: {
        switch (tokenIndex) {
          case 0: {
            amountLP = planner.add(
              this.curveHelperInstance["getMintAmount_three_coin_zero_index_Curve(address,uint256,bool)"](
                pool,
                inputTokenAmount,
                true,
              ).staticcall(),
            );
            break;
          }
          case 1: {
            amountLP = planner.add(
              this.curveHelperInstance["getMintAmount_three_coin_one_index_Curve(address,uint256,bool)"](
                pool,
                inputTokenAmount,
                true,
              ).staticcall(),
            );
            break;
          }
          case 2: {
            amountLP = planner.add(
              this.curveHelperInstance["getMintAmount_three_coin_two_index_Curve(address,uint256,bool)"](
                pool,
                inputTokenAmount,
                true,
              ).staticcall(),
            );
            break;
          }
          default:
            throw new Error(`invalid index for ${inputToken} of ${pool}`);
        }
        break;
      }
      case 4: {
        switch (tokenIndex) {
          case 0: {
            amountLP = planner.add(
              this.curveHelperInstance["getMintAmount_four_coin_zero_index_Curve(address,uint256,bool)"](
                pool,
                inputTokenAmount,
                true,
              ).staticcall(),
            );
            break;
          }
          case 1: {
            amountLP = planner.add(
              this.curveHelperInstance["getMintAmount_four_coin_one_index_Curve(address,uint256,bool)"](
                pool,
                inputTokenAmount,
                true,
              ).staticcall(),
            );
            break;
          }
          case 2: {
            amountLP = planner.add(
              this.curveHelperInstance["getMintAmount_four_coin_two_index_Curve(address,uint256,bool)"](
                pool,
                inputTokenAmount,
                true,
              ).staticcall(),
            );
            break;
          }
          case 3: {
            amountLP = planner.add(
              this.curveHelperInstance["getMintAmount_four_coin_three_index_Curve(address,uint256,bool)"](
                pool,
                inputTokenAmount,
                true,
              ).staticcall(),
            );
            break;
          }
          default:
            throw new Error(`invalid index for ${inputToken} of ${pool}`);
        }
        break;
      }
      default:
        throw new Error(`${pool} not found in registry`);
    }
    return amountLP as ReturnValue;
  }

  getOutputTokenBalancePlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
    _isSwap: boolean,
  ): ReturnValue {
    const amountLP = planner.add(
      this.vaultHelperInstance["getERC20Balance(address,address)"](outputToken, vaultInstance.address).staticcall(),
    );
    return amountLP as ReturnValue;
  }

  getClaimRewardsPlan(
    _planner: weirollPlanner,
    _vaultInstance: Contract,
    _inputToken: string,
    _pool: string,
    _outputToken: string,
  ): weirollPlanner {
    throw new Error("not implemented");
  }

  getHarvestRewardsPlan(
    _planner: weirollPlanner,
    _vaultInstance: Contract,
    _vaultUnderlyingToken: string,
  ): weirollPlanner {
    throw new Error(`not implemented for ${_vaultUnderlyingToken}`);
  }

  async getOutputTokenBalance(
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
    _isSwap: boolean,
    provider: JsonRpcProvider,
  ): Promise<BigNumber> {
    const vaultHelperMainnet = new ethers.Contract(
      this.vaultHelperInstance.address,
      this.vaultHelperInstance.interface,
      <ethers.providers.JsonRpcProvider>provider,
    );
    return await vaultHelperMainnet["getERC20Balance(address,address)"](outputToken, vaultInstance.address);
  }

  async getValueInInputToken(
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
    outputTokenAmount: BigNumber,
    isSwap: boolean,
    provider: JsonRpcProvider,
  ): Promise<BigNumber> {
    const poolInstance = new ethers.Contract(pool, ICurveSwap__factory.abi, <ethers.providers.JsonRpcProvider>provider);
    if (outputTokenAmount.gt(0)) {
      return await poolInstance["calc_withdraw_one_coin(uint256,int128)"](
        outputTokenAmount,
        this.getTokenIndex(inputToken, poolRegistry[pool].underlyingTokens),
      );
    }
    return BigNumber.from("0");
  }

  async getValueInOutputToken(
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
    inputTokenAmount: BigNumber,
    _isSwap: boolean,
    provider: JsonRpcProvider,
  ): Promise<BigNumber> {
    const curveHelper = new ethers.Contract(
      this.curveHelperInstance.address,
      this.curveHelperInstance.interface,
      <ethers.providers.JsonRpcProvider>provider,
    );
    const tokenIndex = this.getTokenIndex(inputToken, poolRegistry[pool].underlyingTokens).toNumber();
    switch (poolRegistry[pool].underlyingTokens.length) {
      case 2: {
        switch (tokenIndex) {
          case 0: {
            return await curveHelper["getMintAmount_two_coin_zero_index_Curve(address,uint256,bool)"](
              pool,
              inputTokenAmount,
              true,
            );
          }
          case 1: {
            return await curveHelper["getMintAmount_two_coin_one_index_Curve(address,uint256,bool)"](
              pool,
              inputTokenAmount,
              true,
            );
          }
          default:
            throw new Error(`invalid index for ${inputToken} of ${pool}`);
        }
        break;
      }
      case 3: {
        switch (tokenIndex) {
          case 0: {
            return await curveHelper["getMintAmount_three_coin_zero_index_Curve(address,uint256,bool)"](
              pool,
              inputTokenAmount,
              true,
            );
          }
          case 1: {
            return await curveHelper["getMintAmount_three_coin_one_index_Curve(address,uint256,bool)"](
              pool,
              inputTokenAmount,
              true,
            );
          }
          case 2: {
            return await curveHelper["getMintAmount_three_coin_two_index_Curve(address,uint256,bool)"](
              pool,
              inputTokenAmount,
              true,
            );
          }
          default:
            throw new Error(`invalid index for ${inputToken} of ${pool}`);
        }
        break;
      }
      case 4: {
        switch (tokenIndex) {
          case 0: {
            return await curveHelper["getMintAmount_four_coin_zero_index_Curve(address,uint256,bool)"](
              pool,
              inputTokenAmount,
              true,
            );
          }
          case 1: {
            return await curveHelper["getMintAmount_four_coin_one_index_Curve(address,uint256,bool)"](
              pool,
              inputTokenAmount,
              true,
            );
          }
          case 2: {
            return await curveHelper["getMintAmount_four_coin_two_index_Curve(address,uint256,bool)"](
              pool,
              inputTokenAmount,
              true,
            );
          }
          case 3: {
            return await curveHelper["getMintAmount_four_coin_three_index_Curve(address,uint256,bool)"](
              pool,
              inputTokenAmount,
              true,
            );
          }
          default:
            throw new Error(`invalid index for ${inputToken} of ${pool}`);
        }
        break;
      }
      default:
        throw new Error(`${pool} not found in registry`);
    }
  }

  private getTokenIndex(token: string, underlyingTokens: string[]): BigNumber {
    for (const [index, underlyingToken] of underlyingTokens.entries()) {
      if (getAddress(token) === getAddress(underlyingToken)) {
        return BigNumber.from(index);
      }
    }
    throw new Error("no token index found");
  }
}

const poolRegistry: { [key: string]: { underlyingTokens: string[] } } = {
  "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7": {
    underlyingTokens: [
      "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    ],
  },
  "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B": {
    underlyingTokens: ["0x853d955aCEf822Db058eb8505911ED77F175b99e", "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490"],
  },
  "0x5a6A4D54456819380173272A5E8E9B9904BdF41B": {
    underlyingTokens: ["0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3", "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490"],
  },
  "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022": {
    underlyingTokens: ["0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84"],
  },
};