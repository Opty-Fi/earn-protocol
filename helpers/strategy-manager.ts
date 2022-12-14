import { Planner as weirollPlanner, Contract as weirollContract } from "@weiroll/weiroll.js";
import { ethers } from "@weiroll/weiroll.js/node_modules/ethers";
import { ERC20, ERC20__factory, Vault, Vault__factory } from "../typechain";
import { AdapterInterface } from "./adapters/AdapterInterface";
import { AaveV1Adapter } from "./adapters/ethereum/AaveV1Adapter";
import { Aavev2Adapter } from "./adapters/ethereum/AaveV2Adapter";
import { CompoundAdapter } from "./adapters/ethereum/CompoundAdapter";
import { ReturnValue, STRATEGY_DATA, WeirollPlan } from "./type";

export class StrategyManager {
  compoundAdapterObj: AdapterInterface;
  aaveV1AdapterObj: AdapterInterface;
  aaveV2AdapterObj: AdapterInterface;

  public readonly liquidityPoolToAdapter: { [key: string]: AdapterInterface } = {};

  constructor(compoundAdapterAddress: string) {
    this.compoundAdapterObj = new CompoundAdapter(compoundAdapterAddress);
    this.aaveV1AdapterObj = new AaveV1Adapter();
    this.aaveV2AdapterObj = new Aavev2Adapter();
    this.liquidityPoolToAdapter["0x52D306e36E3B6B02c153d0266ff0f85d18BCD413"] = this.aaveV2AdapterObj;
    this.liquidityPoolToAdapter["0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"] = this.compoundAdapterObj;
    this.liquidityPoolToAdapter["0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9"] = this.compoundAdapterObj;
    this.liquidityPoolToAdapter["0xC11b1268C1A384e55C48c2391d8d480264A3A7F4"] = this.compoundAdapterObj;
    this.liquidityPoolToAdapter["0x39AA39c021dfbaE8faC545936693aC917d5E7563"] = this.compoundAdapterObj;
    this.liquidityPoolToAdapter["0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5"] = this.compoundAdapterObj;
    this.liquidityPoolToAdapter["0x24a42fD28C976A61Df5D00D0599C34c4f90748c8"] = this.aaveV1AdapterObj;
    this.liquidityPoolToAdapter["0x70e36f6BF80a52b3B46b3aF8e106CC0ed743E8e4"] = this.compoundAdapterObj;
    this.liquidityPoolToAdapter["0x80a2AE356fc9ef4305676f7a3E2Ed04e12C33946"] = this.compoundAdapterObj;
  }

  getDepositPlan(underlyingTokenInstance: ERC20, strategySteps: STRATEGY_DATA[], vaultInstance: Vault): WeirollPlan {
    let planner = new weirollPlanner();
    const vaultContract = weirollContract.createContract(
      new ethers.Contract(vaultInstance.address, Vault__factory.abi),
    );
    for (const [index, strategyStep] of strategySteps.entries()) {
      const adapterObj = this.liquidityPoolToAdapter[strategyStep.contract];

      if (index > 0) {
        const inputTokenContract = weirollContract.createContract(
          new ethers.Contract(strategySteps[index - 1].outputToken, ERC20__factory.abi),
        );
        const inputTokenAmount = <ReturnValue>(
          planner.add(inputTokenContract["balanceOf(address)"](vaultContract.address).staticcall())
        );
        planner = adapterObj.getDepositPlan(
          planner,
          vaultInstance,
          strategySteps[index - 1].outputToken,
          strategyStep.contract,
          strategyStep.outputToken,
          strategyStep.isSwap,
          inputTokenAmount,
        );
      } else {
        const amountUT = <ReturnValue>planner.add(vaultContract["getCacheValueUT()"].staticcall());
        planner = adapterObj.getDepositPlan(
          planner,
          vaultInstance,
          underlyingTokenInstance.address,
          strategyStep.contract,
          strategyStep.outputToken,
          strategyStep.isSwap,
          amountUT,
        );
      }
    }
    const { commands, state } = planner.plan();
    return { commands, state, outputIndex: 0 };
  }

  getWithdrawPlan(underlyingTokenInstance: ERC20, strategySteps: STRATEGY_DATA[], vaultInstance: Vault): WeirollPlan {
    let planner = new weirollPlanner();
    const vaultContract = weirollContract.createContract(
      new ethers.Contract(vaultInstance.address, Vault__factory.abi),
    );
    for (const [index, _strategyStep] of strategySteps.entries()) {
      const iteratorIndex = strategySteps.length - index - 1;
      const adapterObj = this.liquidityPoolToAdapter[strategySteps[iteratorIndex].contract];
      if (iteratorIndex === strategySteps.length - 1) {
        // last step
        const amountLP = planner.add(vaultContract.getCacheOraAmountLP().staticcall());
        planner = adapterObj.getWithdrawPlan(
          planner,
          vaultInstance,
          underlyingTokenInstance.address,
          strategySteps[iteratorIndex].contract,
          strategySteps[iteratorIndex].outputToken,
          strategySteps[iteratorIndex].isSwap,
          amountLP as ReturnValue,
        );
      } else {
        const outputTokenContract = weirollContract.createContract(
          new ethers.Contract(strategySteps[iteratorIndex].outputToken, ERC20__factory.abi),
        );
        const amountLP = <ReturnValue>(
          planner.add(outputTokenContract["balanceOf(address)"](vaultContract.address).staticcall())
        );
        planner = adapterObj.getWithdrawPlan(
          planner,
          vaultInstance,
          underlyingTokenInstance.address,
          strategySteps[iteratorIndex].contract,
          strategySteps[iteratorIndex].outputToken,
          strategySteps[iteratorIndex].isSwap,
          amountLP,
        );
      }
    }
    const { commands, state } = planner.plan();
    return { commands, state, outputIndex: 0 };
  }

  getOraValueUTPlan(underlyingTokenInstance: ERC20, strategySteps: STRATEGY_DATA[], vaultInstance: Vault): WeirollPlan {
    const planner = new weirollPlanner();
    const outputTokenContract = weirollContract.createContract(
      new ethers.Contract(strategySteps[strategySteps.length - 1].outputToken, ERC20__factory.abi),
    );
    const amountLP = <ReturnValue>planner.add(outputTokenContract["balanceOf(address)"](vaultInstance.address));
    let amountUT;
    for (const [index, _strategyStep] of strategySteps.entries()) {
      const iteratorIndex = strategySteps.length - index - 1;
      const adapterObj = this.liquidityPoolToAdapter[strategySteps[iteratorIndex].contract];
      let inputToken = underlyingTokenInstance.address;
      if (iteratorIndex !== 0) {
        inputToken = strategySteps[iteratorIndex - 1].outputToken;
      }
      if (iteratorIndex === strategySteps.length - 1) {
        amountUT = <ReturnValue>(
          adapterObj.getAmountInInputTokenPlan(
            planner,
            vaultInstance,
            inputToken,
            strategySteps[iteratorIndex].contract,
            strategySteps[iteratorIndex].outputToken,
            strategySteps[iteratorIndex].isSwap,
            amountLP,
          )
        );
      } else {
        amountUT = <ReturnValue>(
          adapterObj.getAmountInInputTokenPlan(
            planner,
            vaultInstance,
            inputToken,
            strategySteps[iteratorIndex].contract,
            strategySteps[iteratorIndex].outputToken,
            strategySteps[iteratorIndex].isSwap,
            amountUT as ReturnValue,
          )
        );
      }
    }
    const { commands, state } = planner.plan();
    return { commands, state, outputIndex: 0 };
  }

  getOraSomeValueLPPlan(
    underlyingTokenInstance: ERC20,
    strategySteps: STRATEGY_DATA[],
    vaultInstance: Vault,
  ): WeirollPlan {
    const planner = new weirollPlanner();
    const vaultContract = weirollContract.createContract(
      new ethers.Contract(vaultInstance.address, Vault__factory.abi),
    );
    const valueUT = <ReturnValue>planner.add(vaultContract.getCacheExpectedStratWithdrawUT().staticcall());
    let amountLP;
    for (const [index, strategyStep] of strategySteps.entries()) {
      const adapterObj = this.liquidityPoolToAdapter[strategyStep.contract];
      let inputToken = underlyingTokenInstance.address;
      if (index !== 0) {
        inputToken = strategySteps[index - 1].outputToken;
      }
      if (index === 0) {
        amountLP = adapterObj.getAmountInOutputTokenPlan(
          planner,
          vaultInstance,
          inputToken,
          strategyStep.contract,
          strategyStep.outputToken,
          strategyStep.isSwap,
          amountLP as ReturnValue,
        );
      } else {
        amountLP = adapterObj.getAmountInOutputTokenPlan(
          planner,
          vaultInstance,
          inputToken,
          strategyStep.contract,
          strategyStep.outputToken,
          strategyStep.isSwap,
          valueUT,
        );
      }
    }
    const { commands, state } = planner.plan();
    return { commands, state, outputIndex: 0 };
  }

  getLastStrategyStepBalancePlan(
    underlyingTokenInstance: ERC20,
    strategySteps: STRATEGY_DATA[],
    vaultInstance: Vault,
  ): WeirollPlan {
    const planner = new weirollPlanner();
    const outputTokenContract = weirollContract.createContract(
      new ethers.Contract(strategySteps[strategySteps.length - 1].outputToken, ERC20__factory.abi),
    );
    planner.add(outputTokenContract["balanceOf(address)"](vaultInstance.address));
    const { commands, state } = planner.plan();
    return { commands, state, outputIndex: 0 };
  }

  getClaimRewardsPlan(
    underlyingTokenInstance: ERC20,
    strategySteps: STRATEGY_DATA[],
    vaultInstance: Vault,
  ): WeirollPlan {
    let planner = new weirollPlanner();
    const adapterObj = this.liquidityPoolToAdapter[strategySteps[strategySteps.length - 1].contract];
    let inputToken = underlyingTokenInstance.address;
    if (strategySteps.length > 1) {
      inputToken = strategySteps[strategySteps.length - 2].outputToken;
    }
    planner = adapterObj.getClaimRewardsPlan(
      planner,
      vaultInstance,
      inputToken,
      strategySteps[strategySteps.length - 1].contract,
      strategySteps[strategySteps.length - 1].outputToken,
    );
    const { commands, state } = planner.plan();
    return { commands, state, outputIndex: 0 };
  }

  getHarvestRewardsPlan(
    underlyingTokenInstance: ERC20,
    strategySteps: STRATEGY_DATA[],
    vaultInstance: Vault,
  ): WeirollPlan {
    let planner = new weirollPlanner();
    const adapterObj = this.liquidityPoolToAdapter[strategySteps[strategySteps.length - 1].contract];
    let inputToken = underlyingTokenInstance.address;
    if (strategySteps.length > 1) {
      inputToken = strategySteps[strategySteps.length - 2].outputToken;
    }
    planner = adapterObj.getHarvestRewardsPlan(planner, vaultInstance, inputToken);
    const { commands, state } = planner.plan();
    return { commands, state, outputIndex: 0 };
  }
}
