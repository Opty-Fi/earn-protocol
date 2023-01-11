import { BigNumber, Contract } from "ethers";
import { ethers } from "@weiroll/weiroll.js/node_modules/ethers";
import { Planner as weirollPlanner, Contract as weirollContract } from "@weiroll/weiroll.js";
import Aave from "@optyfi/defi-legos/ethereum/aave/index";
import { getAddress } from "ethers/lib/utils";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { ReturnValue } from "../../type";
import { AdapterInterface } from "../AdapterInterface";
import { JsonRpcProvider } from "@ethersproject/providers";
export class AaveV1Adapter implements AdapterInterface {
  vaultHelperInstance;
  aaveV1HelperInstance;

  constructor(vaultHelperContract: Contract, aaveV1HelperInstance: Contract) {
    this.vaultHelperInstance = weirollContract.createContract(
      new ethers.Contract(vaultHelperContract.address, vaultHelperContract.interface),
    );
    this.aaveV1HelperInstance = weirollContract.createContract(
      new ethers.Contract(aaveV1HelperInstance.address, aaveV1HelperInstance.interface),
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
    const lendingPoolContract = new ethers.Contract(Aave.LendingPool.address, Aave.LendingPool.abi);
    const lendingPoolInstance = weirollContract.createContract(lendingPoolContract);
    if (getAddress(inputToken) === getAddress(EthereumTokens.WRAPPED_TOKENS.WETH)) {
      planner.add(
        this.aaveV1HelperInstance["depositETH_AaveV1(address,address,uint256)"](
          lendingPoolContract.address,
          outputToken,
          inputTokenAmount,
        ),
      );
    } else {
      planner.add(lendingPoolInstance["deposit(address,uint256,uint16)"](inputToken, inputTokenAmount, "0"));
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
    const lpTokenContract = new ethers.Contract(outputToken, Aave.ATokenAbi);
    const lpTokenInstance = weirollContract.createContract(lpTokenContract);
    if (getAddress(inputToken) === getAddress(EthereumTokens.WRAPPED_TOKENS.WETH)) {
      planner.add(this.aaveV1HelperInstance["withdrawETH_AaveV1(address,uint256)"](outputToken, outputTokenAmount));
    } else {
      planner.add(lpTokenInstance["redeem(uint256)"](outputTokenAmount));
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
    const vaultHelper = new ethers.Contract(
      this.vaultHelperInstance.address,
      this.vaultHelperInstance.interface,
      <ethers.providers.JsonRpcProvider>provider,
    );
    return await vaultHelper["getERC20Balance(address,address)"](outputToken, vaultInstance.address);
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
