import { Contract } from "ethers";
import { ethers } from "@weiroll/weiroll.js/node_modules/ethers";
import { Planner as weirollPlanner, Contract as weirollContract } from "@weiroll/weiroll.js";
import AaveV2 from "@optyfi/defi-legos/ethereum/aavev2/index";
import { ReturnValue } from "../../type";

export class Aavev2Adapter {
  getDepositPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputTokenInstance: Contract,
    poolInstance: Contract,
    outputTokenInstance: Contract,
    inputTokenAmount: ReturnValue,
  ): weirollPlanner {
    const lendingPoolContract = new ethers.Contract(
      "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9",
      AaveV2.LendingPool.abi,
    );
    const lendingPoolInstance = weirollContract.createContract(lendingPoolContract);
    planner.add(
      lendingPoolInstance["deposit(address,uint256,address,uint16)"](
        inputTokenInstance.address,
        inputTokenAmount,
        vaultInstance.address,
        "0",
      ),
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
    const lendingPoolContract = new ethers.Contract(
      "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9",
      AaveV2.LendingPool.abi,
    );
    const lendingPoolInstance = weirollContract.createContract(lendingPoolContract);
    planner.add(
      lendingPoolInstance["withdraw(address,uint256,address)"](
        inputTokenInstance.address,
        outputTokenAmount,
        vaultInstance.address,
      ),
    );
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
