import { BigNumber, Contract } from "ethers";
import { Planner as weirollPlanner } from "@weiroll/weiroll.js";
import { JsonRpcProvider } from "@ethersproject/providers";
import { ReturnValue } from "../type";

export interface AdapterInterface {
  getDepositPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
    isSwap: boolean,
    inputTokenAmount: ReturnValue,
  ): weirollPlanner;

  getWithdrawPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
    isSwap: boolean,
    outputTokenAmount: ReturnValue,
  ): weirollPlanner;

  getAmountInInputTokenPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
    isSwap: boolean,
    outputTokenAmount: ReturnValue,
  ): ReturnValue;

  getAmountInOutputTokenPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
    isSwap: boolean,
    inputTokenAmount: ReturnValue,
  ): ReturnValue;

  getOutputTokenBalancePlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
    isSwap: boolean,
  ): ReturnValue;

  getClaimRewardsPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
  ): weirollPlanner;

  getHarvestRewardsPlan(planner: weirollPlanner, vaultInstance: Contract, vaultUnderlyingToken: string): weirollPlanner;

  getOutputTokenBalance(
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
    _isSwap: boolean,
    _provider: JsonRpcProvider,
  ): Promise<BigNumber>;

  getValueInInputToken(
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
    outputTokenAmount: BigNumber,
    isSwap: boolean,
    provider: JsonRpcProvider,
  ): Promise<BigNumber>;

  getValueInOutputToken(
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
    inputTokenAmount: BigNumber,
    isSwap: boolean,
    provider: JsonRpcProvider,
  ): Promise<BigNumber>;
}
