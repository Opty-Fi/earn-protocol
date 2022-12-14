import { Contract } from "ethers";
import { Planner as weirollPlanner } from "@weiroll/weiroll.js";
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
}
