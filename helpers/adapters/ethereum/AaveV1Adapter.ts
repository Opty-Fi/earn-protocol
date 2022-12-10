import { Contract } from "ethers";
import { ethers } from "@weiroll/weiroll.js/node_modules/ethers";
import { Planner as weirollPlanner, Contract as weirollContract } from "@weiroll/weiroll.js";
import Aave from "@optyfi/defi-legos/ethereum/aave/index";
import { ReturnValue } from "../../type";

export class AaveV1Adapter {
  getDepositPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputTokenInstance: Contract,
    poolInstance: Contract,
    outputTokenInstance: Contract,
    inputTokenAmount: ReturnValue,
  ): weirollPlanner {
    // TODO handle ETH deposit
    const lendingPoolContract = new ethers.Contract("0x398eC7346DcD622eDc5ae82352F02bE94C62d119", Aave.LendingPool.abi);
    const lendingPoolInstance = weirollContract.createContract(lendingPoolContract);
    planner.add(
      lendingPoolInstance["deposit(address,uint256,uint16)"](inputTokenInstance.address, inputTokenAmount, "0"),
    );
    return planner;
  }

  getWithdrawPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputTokenInstance: Contract,
    poolInstance: Contract,
    outputTokenInstance: Contract,
    outputTokenAmount: ReturnValue,
  ): weirollPlanner {
    // TODO handle ETH withdraw
    const lpTokenContract = new ethers.Contract(outputTokenInstance.address, Aave.ATokenAbi);
    const lpTokenInstance = weirollContract.createContract(lpTokenContract);
    planner.add(lpTokenInstance["redeem(uint256)"](outputTokenAmount));
    return planner;
  }

  getAmountInInputTokenPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputTokenInstance: Contract,
    poolInstance: Contract,
    outputTokenInstance: Contract,
    outputTokenAmount: ReturnValue,
    _amountInInputTokenContractInstance: Contract,
    _amountInInputTokenMethod: string,
  ): ReturnValue {
    return outputTokenAmount;
  }

  getAmountInOutputTokenPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputTokenInstance: Contract,
    poolInstance: Contract,
    outputTokenInstance: Contract,
    inputTokenAmount: ReturnValue,
    _amountInOutputTokenContractInstance: Contract,
    _amountInOutputTokenMethod: string,
  ): ReturnValue {
    return inputTokenAmount;
  }

  getOutputTokenBalancePlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputTokenInstance: Contract,
    poolInstance: Contract,
    outputTokenInstance: Contract,
  ): ReturnValue {
    const amountLP = planner.add(outputTokenInstance["balanceOf(address)"](vaultInstance.address).staticcall());
    return amountLP as ReturnValue;
  }

  getClaimRewardsPlan(
    planner: weirollPlanner,
    _vaultInstance: Contract,
    _inputTokenInstance: Contract,
    _poolInstance: Contract,
    _outputTokenInstance: Contract,
  ): weirollPlanner {
    // TODO verify any rewards and write claim plan for reward token
    return planner;
  }

  getHarvestRewardsPlan(
    planner: weirollPlanner,
    _vaultInstance: Contract,
    _vaulltUnderlyingTokenInstance: Contract,
  ): weirollPlanner {
    // TODO write harvest plan if reward token
    return planner;
  }
}
