import { BigNumber, Contract } from "ethers";
import { ethers } from "@weiroll/weiroll.js/node_modules/ethers";
import { Planner as weirollPlanner, Contract as weirollContract } from "@weiroll/weiroll.js";
import Compound from "@optyfi/defi-legos/ethereum/compound/index";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import UniswapV2 from "@optyfi/defi-legos/ethereum/uniswapV2/index";
import { ReturnValue } from "../../type";
import { ERC20__factory, ICompound__factory, IWETH9__factory } from "../../../typechain";
import { getAddress, parseEther } from "ethers/lib/utils";
import { AdapterInterface } from "../AdapterInterface";
import { JsonRpcProvider } from "@ethersproject/providers";

export class CompoundAdapter implements AdapterInterface {
  vaultHelperMainnetInstance;
  optyFiOracleAddress;

  constructor(vaultHelperMainnetContract: Contract, _optyFiOracleAddress: string) {
    this.vaultHelperMainnetInstance = weirollContract.createContract(
      new ethers.Contract(vaultHelperMainnetContract.address, vaultHelperMainnetContract.interface),
    );
    this.optyFiOracleAddress = _optyFiOracleAddress;
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
    const poolInstance = weirollContract.createContract(new ethers.Contract(pool, ICompound__factory.abi));
    if (getAddress(inputToken) === getAddress(EthereumTokens.WRAPPED_TOKENS.WETH)) {
      planner.add(this.vaultHelperMainnetInstance["depositETH_Compound(address,uint256)"](pool, inputTokenAmount));
    } else {
      planner.add(poolInstance["mint(uint256)"](inputTokenAmount));
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
    const poolInstance = weirollContract.createContract(new ethers.Contract(pool, ICompound__factory.abi));
    if (getAddress(inputToken) === getAddress(EthereumTokens.WRAPPED_TOKENS.WETH)) {
      planner.add(this.vaultHelperMainnetInstance["withdrawETH_Compound(address,uint256)"](pool, outputTokenAmount));
    } else {
      planner.add(poolInstance["redeem(uint256)"](outputTokenAmount));
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
    const amountUT = planner.add(
      this.vaultHelperMainnetInstance["calculateAmountInToken_Compound(address,uint256)"](
        pool,
        outputTokenAmount,
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
    const amountLP = planner.add(
      this.vaultHelperMainnetInstance["calculateAmountInLPToken_Compound(address,uint256)"](
        pool,
        inputTokenAmount,
      ).staticcall(),
    );
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
    const outputTokenInstance = weirollContract.createContract(new ethers.Contract(outputToken, ERC20__factory.abi));
    const amountLP = planner.add(outputTokenInstance["balanceOf(address)"](vaultInstance.address).staticcall());
    return amountLP as ReturnValue;
  }

  getClaimRewardsPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    _outputToken: string,
  ): weirollPlanner {
    const comptrollerContract = new ethers.Contract(Compound.comptroller.address, comptrollerAbi);
    const comptrollerInstance = weirollContract.createContract(comptrollerContract);
    planner.add(
      comptrollerInstance["claimComp(address[],address[],bool,bool)"](
        [vaultInstance.address],
        [pool],
        false,
        true,
      ).staticcall(),
    );
    return planner;
  }

  getHarvestRewardsPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    vaultUnderlyingToken: string,
  ): weirollPlanner {
    const uniswapV2RouterContract = new ethers.Contract(UniswapV2.router02.address, UniswapV2.router02.abi);
    const uniswapV2RouterInstance = weirollContract.createContract(uniswapV2RouterContract);
    const rewardContract = new ethers.Contract(EthereumTokens.REWARD_TOKENS.COMP, ERC20__factory.abi);
    const rewardInstance = weirollContract.createContract(rewardContract);
    const rewardAmount = planner.add(rewardInstance["balanceOf(address)"](vaultInstance.address).staticcall());
    const minumumOutputAmount = planner.add(
      this.vaultHelperMainnetInstance[
        "getMinimumExpectedTokenOutPrice_OptyFiOracle(address,address,address,uint256,uint256)"
      ](this.optyFiOracleAddress, rewardInstance.address, vaultUnderlyingToken, rewardAmount, 100).staticcall(),
    );
    switch (getAddress(vaultUnderlyingToken)) {
      case getAddress(EthereumTokens.PLAIN_TOKENS.USDC): {
        planner.add(
          uniswapV2RouterInstance["swapExactTokensForTokens(uint256,uint256,address[],address,uint256)"](
            rewardAmount,
            minumumOutputAmount,
            [EthereumTokens.REWARD_TOKENS.COMP, EthereumTokens.WRAPPED_TOKENS.WETH, EthereumTokens.PLAIN_TOKENS.USDC],
            vaultInstance.address,
            ethers.constants.MaxUint256,
          ),
        );
        break;
      }
      case getAddress(EthereumTokens.WRAPPED_TOKENS.WETH): {
        planner.add(
          uniswapV2RouterInstance["swapExactTokensForTokens(uint256,uint256,address[],address,uint256)"](
            rewardAmount,
            minumumOutputAmount,
            [EthereumTokens.REWARD_TOKENS.COMP, EthereumTokens.WRAPPED_TOKENS.WETH],
            vaultInstance.address,
            ethers.constants.MaxUint256,
          ),
        );
        break;
      }
      case getAddress(EthereumTokens.PLAIN_TOKENS.DAI): {
        planner.add(
          uniswapV2RouterInstance["swapExactTokensForTokens(uint256,uint256,address[],address,uint256)"](
            rewardAmount,
            minumumOutputAmount,
            [EthereumTokens.REWARD_TOKENS.COMP, EthereumTokens.WRAPPED_TOKENS.WETH, EthereumTokens.PLAIN_TOKENS.DAI],
            vaultInstance.address,
            ethers.constants.MaxUint256,
          ),
        );
        break;
      }
      case getAddress(EthereumTokens.PLAIN_TOKENS.USDT): {
        planner.add(
          uniswapV2RouterInstance["swapExactTokensForTokens(uint256,uint256,address[],address,uint256)"](
            rewardAmount,
            minumumOutputAmount,
            [EthereumTokens.REWARD_TOKENS.COMP, EthereumTokens.WRAPPED_TOKENS.WETH, EthereumTokens.PLAIN_TOKENS.USDT],
            vaultInstance.address,
            ethers.constants.MaxUint256,
          ),
        );
        break;
      }
      case getAddress(EthereumTokens.BTC_TOKENS.WBTC): {
        planner.add(
          uniswapV2RouterInstance["swapExactTokensForTokens(uint256,uint256,address[],address,uint256)"](
            rewardAmount,
            minumumOutputAmount,
            [EthereumTokens.REWARD_TOKENS.COMP, EthereumTokens.WRAPPED_TOKENS.WETH, EthereumTokens.BTC_TOKENS.WBTC],
            vaultInstance.address,
            ethers.constants.MaxUint256,
          ),
        );
        break;
      }
      default: {
        throw new Error(`not implemented for ${vaultUnderlyingToken}`);
      }
    }
    return planner;
  }

  async getOutputTokenBalance(
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
    _isSwap: boolean,
    _provider: JsonRpcProvider,
  ): Promise<BigNumber> {
    const outputTokenInstance = new ethers.Contract(
      outputToken,
      ERC20__factory.abi,
      <ethers.providers.JsonRpcProvider>_provider,
    );
    return await outputTokenInstance["balanceOf(address)"](vaultInstance.address);
  }

  async getValueInInputToken(
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
    outputTokenAmount: BigNumber,
    isSwap: boolean,
    _provider: JsonRpcProvider,
  ): Promise<BigNumber> {
    const cTokenInstance = new ethers.Contract(
      pool,
      ICompound__factory.abi,
      <ethers.providers.JsonRpcProvider>_provider,
    );
    const exchangeRateStored = await cTokenInstance.exchangeRateStored();
    return outputTokenAmount.mul(exchangeRateStored).div(parseEther("1"));
  }

  async getValueInOutputToken(
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
    inputTokenAmount: BigNumber,
    _isSwap: boolean,
    _provider: JsonRpcProvider,
  ): Promise<BigNumber> {
    const cTokenInstance = new ethers.Contract(
      pool,
      ICompound__factory.abi,
      <ethers.providers.JsonRpcProvider>_provider,
    );
    const exchangeRateStored = await cTokenInstance.exchangeRateStored();
    return inputTokenAmount.mul(parseEther("1")).div(exchangeRateStored);
  }
}

const comptrollerAbi = [
  {
    constant: false,
    inputs: [
      {
        internalType: "address[]",
        name: "holders",
        type: "address[]",
      },
      {
        internalType: "contract CToken[]",
        name: "cTokens",
        type: "address[]",
      },
      {
        internalType: "bool",
        name: "borrowers",
        type: "bool",
      },
      {
        internalType: "bool",
        name: "suppliers",
        type: "bool",
      },
    ],
    name: "claimComp",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "getCompAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
];
