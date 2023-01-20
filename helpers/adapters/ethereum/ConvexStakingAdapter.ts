import { BigNumber, Contract } from "ethers";
import { ethers } from "@weiroll/weiroll.js/node_modules/ethers";
import { Planner as weirollPlanner, Contract as weirollContract } from "@weiroll/weiroll.js";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { ReturnValue } from "../../type";
import { AdapterInterface } from "../AdapterInterface";
import { JsonRpcProvider } from "@ethersproject/providers";
import { IConvexStake__factory } from "../../../typechain";
import { getAddress } from "ethers/lib/utils";

export class ConvexStakingAdapter implements AdapterInterface {
  vaultHelperInstance;
  optyFiOracleAddress;
  swapHelperInstance;

  constructor(_optyFiOracleAddress: string, vaultHelperContract: Contract, swapHelper: Contract) {
    this.vaultHelperInstance = weirollContract.createContract(
      new ethers.Contract(vaultHelperContract.address, vaultHelperContract.interface),
    );
    this.optyFiOracleAddress = _optyFiOracleAddress;
    this.swapHelperInstance = weirollContract.createContract(
      new ethers.Contract(swapHelper.address, swapHelper.interface),
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
    const stakingVault = weirollContract.createContract(new ethers.Contract(pool, IConvexStake__factory.abi));
    planner.add(stakingVault["stake(uint256)"](inputTokenAmount));
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
    const abi = [
      {
        inputs: [
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "claim",
            type: "bool",
          },
        ],
        name: "withdraw",
        outputs: [
          {
            internalType: "bool",
            name: "",
            type: "bool",
          },
        ],
        stateMutability: "nonpayable",
        type: "function",
      },
    ];
    const stakingVault = weirollContract.createContract(new ethers.Contract(pool, abi));
    planner.add(stakingVault["withdraw(uint256,bool)"](outputTokenAmount, true));
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
    // TODO : consider unclaimed and claimed Reward token
    return outputTokenAmount;
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
    return inputTokenAmount;
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
    planner: weirollPlanner,
    _vaultInstance: Contract,
    _inputToken: string,
    pool: string,
    _outputToken: string,
  ): weirollPlanner {
    const abi = [
      {
        inputs: [],
        name: "getReward",
        outputs: [
          {
            internalType: "bool",
            name: "",
            type: "bool",
          },
        ],
        stateMutability: "nonpayable",
        type: "function",
      },
    ];
    const stakingVault = weirollContract.createContract(new ethers.Contract(pool, abi));
    planner.add(stakingVault["getReward"]());
    return planner;
  }

  getHarvestRewardsPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    vaultUnderlyingToken: string,
  ): weirollPlanner {
    // harvest CRV
    // harvest CVX
    const rewardAmountCRV = planner.add(
      this.vaultHelperInstance["getERC20Balance(address,address)"](
        EthereumTokens.REWARD_TOKENS.CRV,
        vaultInstance.address,
      ).staticcall(),
    );
    const rewardAmountCVX = planner.add(
      this.vaultHelperInstance["getERC20Balance(address,address)"](
        EthereumTokens.REWARD_TOKENS.CVX,
        vaultInstance.address,
      ).staticcall(),
    );
    const outputAmountForCRV = planner.add(
      this.vaultHelperInstance["getTokenOutPrice_OptyFiOracle(address,address,address,uint256)"](
        this.optyFiOracleAddress,
        EthereumTokens.REWARD_TOKENS.CRV,
        vaultUnderlyingToken,
        rewardAmountCRV,
      ).staticcall(),
    );
    const minimumOutputAmountForCRV = planner.add(
      this.vaultHelperInstance["getMinimumExpectedTokenOutPrice(uint256,uint256)"](outputAmountForCRV, 100),
    );

    const outputAmountForCVX = planner.add(
      this.vaultHelperInstance["getTokenOutPrice_OptyFiOracle(address,address,address,uint256)"](
        this.optyFiOracleAddress,
        EthereumTokens.REWARD_TOKENS.CVX,
        vaultUnderlyingToken,
        rewardAmountCVX,
      ).staticcall(),
    );
    const minimumOutputAmountForCVX = planner.add(
      this.vaultHelperInstance["getMinimumExpectedTokenOutPrice(uint256,uint256)"](outputAmountForCVX, 100),
    );
    let univ3PathCRV;
    let univ3PathCVX;
    switch (getAddress(vaultUnderlyingToken)) {
      case getAddress(EthereumTokens.PLAIN_TOKENS.USDT): {
        univ3PathCRV = ethers.utils.solidityPack(
          ["address", "uint24", "address"],
          [EthereumTokens.REWARD_TOKENS.CRV, 3000, EthereumTokens.PLAIN_TOKENS.USDT],
        );
        univ3PathCVX = ethers.utils.solidityPack(
          ["address", "uint24", "address", "uint24", "address"],
          [
            EthereumTokens.REWARD_TOKENS.CVX,
            10000,
            EthereumTokens.PLAIN_TOKENS.USDC,
            100,
            EthereumTokens.PLAIN_TOKENS.USDT,
          ],
        );
        break;
      }
      case getAddress(EthereumTokens.PLAIN_TOKENS.USDC): {
        univ3PathCRV = ethers.utils.solidityPack(
          ["address", "uint24", "address"],
          [EthereumTokens.REWARD_TOKENS.CRV, 10000, EthereumTokens.PLAIN_TOKENS.USDC],
        );
        univ3PathCVX = ethers.utils.solidityPack(
          ["address", "uint24", "address"],
          [EthereumTokens.REWARD_TOKENS.CVX, 10000, EthereumTokens.PLAIN_TOKENS.USDC],
        );
        break;
      }
      case getAddress(EthereumTokens.WRAPPED_TOKENS.THREE_CRV): {
        univ3PathCRV = ethers.utils.solidityPack(
          ["address", "uint24", "address", "uint24", "address", "uint24", "address"],
          [
            EthereumTokens.REWARD_TOKENS.CRV,
            3000,
            EthereumTokens.WRAPPED_TOKENS.WETH,
            500,
            EthereumTokens.PLAIN_TOKENS.USDC,
            3000,
            EthereumTokens.WRAPPED_TOKENS.THREE_CRV,
          ],
        );
        univ3PathCVX = ethers.utils.solidityPack(
          ["address", "uint24", "address", "uint24", "address"],
          [
            EthereumTokens.REWARD_TOKENS.CVX,
            10000,
            EthereumTokens.PLAIN_TOKENS.USDC,
            3000,
            EthereumTokens.WRAPPED_TOKENS.THREE_CRV,
          ],
        );
        break;
      }
      case getAddress(EthereumTokens.BTC_TOKENS.WBTC): {
        univ3PathCRV = ethers.utils.solidityPack(
          ["address", "uint24", "address", "uint24", "address"],
          [
            EthereumTokens.REWARD_TOKENS.CRV,
            3000,
            EthereumTokens.PLAIN_TOKENS.USDT,
            3000,
            EthereumTokens.BTC_TOKENS.WBTC,
          ],
        );
        univ3PathCVX = ethers.utils.solidityPack(
          ["address", "uint24", "address", "uint24", "address"],
          [
            EthereumTokens.REWARD_TOKENS.CVX,
            10000,
            EthereumTokens.WRAPPED_TOKENS.WETH,
            500,
            EthereumTokens.BTC_TOKENS.WBTC,
          ],
        );
        break;
      }
      case getAddress(EthereumTokens.WRAPPED_TOKENS.WETH): {
        univ3PathCRV = ethers.utils.solidityPack(
          ["address", "uint24", "address"],
          [EthereumTokens.REWARD_TOKENS.CRV, 3000, EthereumTokens.WRAPPED_TOKENS.WETH],
        );
        univ3PathCVX = ethers.utils.solidityPack(
          ["address", "uint24", "address"],
          [EthereumTokens.REWARD_TOKENS.CVX, 10000, EthereumTokens.WRAPPED_TOKENS.WETH],
        );
        break;
      }
    }

    planner.add(
      this.swapHelperInstance["exactInput_UniswapV3(bytes,uint256,uint256,uint256)"](
        univ3PathCRV,
        ethers.constants.MaxUint256,
        rewardAmountCRV,
        minimumOutputAmountForCRV,
      ),
    );
    planner.add(
      this.swapHelperInstance["exactInput_UniswapV3(bytes,uint256,uint256,uint256)"](
        univ3PathCVX,
        ethers.constants.MaxUint256,
        rewardAmountCVX,
        minimumOutputAmountForCVX,
      ),
    );
    return planner;
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
    _isSwap: boolean,
    _provider: JsonRpcProvider,
  ): Promise<BigNumber> {
    // TODO : consider unclaimed and claimed Reward token
    return outputTokenAmount;
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
    return inputTokenAmount;
  }
}
