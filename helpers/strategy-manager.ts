import { Planner as weirollPlanner, Contract as weirollContract } from "@weiroll/weiroll.js";
import { ethers } from "@weiroll/weiroll.js/node_modules/ethers";
import { BigNumber, Contract } from "ethers";
import { JsonRpcProvider } from "@ethersproject/providers";
import { AdapterInterface } from "./adapters/AdapterInterface";
import { AaveV1Adapter } from "./adapters/ethereum/AaveV1Adapter";
import { Aavev2Adapter } from "./adapters/ethereum/AaveV2Adapter";
import { CompoundAdapter } from "./adapters/ethereum/CompoundAdapter";
import { CurveAdapter } from "./adapters/ethereum/CurveAdapter";
import { CurveGaugeAdapter } from "./adapters/ethereum/CurveGaugeAdapter";
import { ConvexAdapter } from "./adapters/ethereum/ConvexAdapter";
import { ConvexStakingAdapter } from "./adapters/ethereum/ConvexStakingAdapter";
import { ReturnValue, StrategyStepType, WeirollPlan } from "./type";

export class StrategyManager {
  public readonly vaultHelperContract: weirollContract;
  public readonly compoundAdapterObj: AdapterInterface;
  public readonly aaveV1AdapterObj: AdapterInterface;
  public readonly aaveV2AdapterObj: AdapterInterface;
  public readonly curveAdapterObj: AdapterInterface;
  public readonly curveGaugeAdapterObj: AdapterInterface;
  public readonly convexAdapterObj: AdapterInterface;
  public convexStakingAdapterObj: AdapterInterface;

  public readonly liquidityPoolToAdapter: { [key: string]: AdapterInterface } = {};

  constructor(
    optyFiOracleAddress: string,
    vaultHelperInstance: Contract,
    swapHelperContract: Contract,
    compoundHelperContract: Contract,
    aaveV1HelperContract: Contract,
    curveHelperContract: Contract,
  ) {
    this.vaultHelperContract = weirollContract.createContract(
      new ethers.Contract(vaultHelperInstance.address, vaultHelperInstance.interface),
    );
    this.compoundAdapterObj = new CompoundAdapter(optyFiOracleAddress, vaultHelperInstance, compoundHelperContract);
    this.aaveV1AdapterObj = new AaveV1Adapter(vaultHelperInstance, aaveV1HelperContract);
    this.aaveV2AdapterObj = new Aavev2Adapter(optyFiOracleAddress, vaultHelperInstance, swapHelperContract);
    this.curveAdapterObj = new CurveAdapter(vaultHelperInstance, curveHelperContract);
    this.curveGaugeAdapterObj = new CurveGaugeAdapter(
      optyFiOracleAddress,
      vaultHelperInstance,
      curveHelperContract,
      swapHelperContract,
    );
    this.convexAdapterObj = new ConvexAdapter(vaultHelperInstance);
    this.convexStakingAdapterObj = new ConvexStakingAdapter(
      optyFiOracleAddress,
      vaultHelperInstance,
      swapHelperContract,
    );
    this.liquidityPoolToAdapter["0x52D306e36E3B6B02c153d0266ff0f85d18BCD413"] = this.aaveV2AdapterObj;
    this.liquidityPoolToAdapter["0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"] = this.compoundAdapterObj; // cDAI
    this.liquidityPoolToAdapter["0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9"] = this.compoundAdapterObj; // cUSDT
    this.liquidityPoolToAdapter["0xC11b1268C1A384e55C48c2391d8d480264A3A7F4"] = this.compoundAdapterObj; // cWBTC
    this.liquidityPoolToAdapter["0x39AA39c021dfbaE8faC545936693aC917d5E7563"] = this.compoundAdapterObj; // cUSDC
    this.liquidityPoolToAdapter["0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5"] = this.compoundAdapterObj; // cETH
    this.liquidityPoolToAdapter["0x24a42fD28C976A61Df5D00D0599C34c4f90748c8"] = this.aaveV1AdapterObj;
    this.liquidityPoolToAdapter["0x70e36f6BF80a52b3B46b3aF8e106CC0ed743E8e4"] = this.compoundAdapterObj; // cCOMP
    this.liquidityPoolToAdapter["0x80a2AE356fc9ef4305676f7a3E2Ed04e12C33946"] = this.compoundAdapterObj; // cYFI
    this.liquidityPoolToAdapter["0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7"] = this.curveAdapterObj; // 3Crv pool
    this.liquidityPoolToAdapter["0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A"] = this.curveGaugeAdapterObj; // 3Crv gauge
    this.liquidityPoolToAdapter["0x30D9410ED1D5DA1F6C8391af5338C93ab8d4035C"] = this.convexAdapterObj; // cvx3Crv
    this.liquidityPoolToAdapter["0x689440f2Ff927E1f24c72F1087E1FAF471eCe1c8"] = this.convexStakingAdapterObj; // cvx3Crv staking pool
  }

  getDepositPlan(underlyingToken: string, strategySteps: StrategyStepType[], vaultInstance: Contract): WeirollPlan {
    const planner = new weirollPlanner();
    const vaultContract = weirollContract.createContract(
      new ethers.Contract(vaultInstance.address, vaultInstance.interface),
    );
    for (const [index, strategyStep] of strategySteps.entries()) {
      const adapterObj = this.liquidityPoolToAdapter[strategyStep.pool];

      if (index > 0) {
        const inputTokenAmount = <ReturnValue>(
          planner.add(
            this.vaultHelperContract["getERC20Balance(address,address)"](
              strategySteps[index - 1].outputToken,
              vaultContract.address,
            ).staticcall(),
          )
        );
        adapterObj.getDepositPlan(
          planner,
          vaultInstance,
          strategySteps[index - 1].outputToken,
          strategyStep.pool,
          strategyStep.outputToken,
          strategyStep.isSwap,
          inputTokenAmount,
        );
      } else {
        const amountUT = <ReturnValue>planner.add(vaultContract["getCacheValueUT()"]().staticcall());
        adapterObj.getDepositPlan(
          planner,
          vaultInstance,
          underlyingToken,
          strategyStep.pool,
          strategyStep.outputToken,
          strategyStep.isSwap,
          amountUT,
        );
      }
    }
    const { commands, state } = planner.plan();
    return { commands, state, outputIndex: 0 };
  }

  getWithdrawPlan(underlyingToken: string, strategySteps: StrategyStepType[], vaultInstance: Contract): WeirollPlan {
    const planner = new weirollPlanner();
    const vaultContract = weirollContract.createContract(
      new ethers.Contract(vaultInstance.address, vaultInstance.interface),
    );
    for (const [index, _strategyStep] of strategySteps.entries()) {
      const iteratorIndex = strategySteps.length - index - 1;
      const adapterObj = this.liquidityPoolToAdapter[strategySteps[iteratorIndex].pool];
      if (iteratorIndex === strategySteps.length - 1) {
        // last step
        const amountLP = planner.add(vaultContract.getCacheAmountLP().staticcall());
        adapterObj.getWithdrawPlan(
          planner,
          vaultInstance,
          underlyingToken,
          strategySteps[iteratorIndex].pool,
          strategySteps[iteratorIndex].outputToken,
          strategySteps[iteratorIndex].isSwap,
          amountLP as ReturnValue,
        );
      } else {
        const amountLP = <ReturnValue>(
          planner.add(
            this.vaultHelperContract["getERC20Balance(address,address)"](
              strategySteps[iteratorIndex].outputToken,
              vaultContract.address,
            ).staticcall(),
          )
        );
        adapterObj.getWithdrawPlan(
          planner,
          vaultInstance,
          underlyingToken,
          strategySteps[iteratorIndex].pool,
          strategySteps[iteratorIndex].outputToken,
          strategySteps[iteratorIndex].isSwap,
          amountLP,
        );
      }
    }
    const { commands, state } = planner.plan();
    return { commands, state, outputIndex: 0 };
  }

  getOraValueUTPlan(underlyingToken: string, strategySteps: StrategyStepType[], vaultInstance: Contract): WeirollPlan {
    const planner = new weirollPlanner();
    const amountLP = <ReturnValue>(
      planner.add(
        this.vaultHelperContract["getERC20Balance(address,address)"](
          strategySteps[strategySteps.length - 1].outputToken,
          vaultInstance.address,
        ).staticcall(),
      )
    );
    let amountUT;
    for (const [index, _strategyStep] of strategySteps.entries()) {
      const iteratorIndex = strategySteps.length - index - 1;
      const adapterObj = this.liquidityPoolToAdapter[strategySteps[iteratorIndex].pool];
      let inputToken = underlyingToken;
      if (iteratorIndex !== 0) {
        inputToken = strategySteps[iteratorIndex - 1].outputToken;
      }
      if (iteratorIndex === strategySteps.length - 1) {
        amountUT = <ReturnValue>(
          adapterObj.getAmountInInputTokenPlan(
            planner,
            vaultInstance,
            inputToken,
            strategySteps[iteratorIndex].pool,
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
            strategySteps[iteratorIndex].pool,
            strategySteps[iteratorIndex].outputToken,
            strategySteps[iteratorIndex].isSwap,
            amountUT as ReturnValue,
          )
        );
      }
    }
    planner.add(this.vaultHelperContract["pureFunctionUint256(uint256)"](amountUT).staticcall());
    const { commands, state } = planner.plan();
    return { commands, state, outputIndex: 0 };
  }

  getOraSomeValueLPPlan(
    underlyingToken: string,
    strategySteps: StrategyStepType[],
    vaultInstance: Contract,
  ): WeirollPlan {
    const planner = new weirollPlanner();
    const vaultContract = weirollContract.createContract(
      new ethers.Contract(vaultInstance.address, vaultInstance.interface),
    );
    const valueUT = <ReturnValue>planner.add(vaultContract.getCacheValueUT().staticcall());
    let amountLP;
    for (const [index, strategyStep] of strategySteps.entries()) {
      const adapterObj = this.liquidityPoolToAdapter[strategyStep.pool];
      let inputToken = underlyingToken;
      if (index !== 0) {
        inputToken = strategySteps[index - 1].outputToken;
      }
      if (index === 0) {
        amountLP = adapterObj.getAmountInOutputTokenPlan(
          planner,
          vaultInstance,
          inputToken,
          strategyStep.pool,
          strategyStep.outputToken,
          strategyStep.isSwap,
          valueUT,
        );
      } else {
        amountLP = adapterObj.getAmountInOutputTokenPlan(
          planner,
          vaultInstance,
          inputToken,
          strategyStep.pool,
          strategyStep.outputToken,
          strategyStep.isSwap,
          amountLP as ReturnValue,
        );
      }
    }
    planner.add(this.vaultHelperContract["pureFunctionUint256(uint256)"](amountLP).staticcall());
    const { commands, state } = planner.plan();
    return { commands, state, outputIndex: 0 };
  }

  getLastStrategyStepBalancePlan(
    underlyingToken: string,
    strategySteps: StrategyStepType[],
    vaultInstance: Contract,
  ): WeirollPlan {
    const planner = new weirollPlanner();
    const amountLP = planner.add(
      this.vaultHelperContract["getERC20Balance(address,address)"](
        strategySteps[strategySteps.length - 1].outputToken,
        vaultInstance.address,
      ).staticcall(),
    );
    planner.add(this.vaultHelperContract["pureFunctionUint256(uint256)"](amountLP).staticcall());
    const { commands, state } = planner.plan();
    return { commands, state, outputIndex: 0 };
  }

  getClaimRewardsPlan(
    underlyingToken: string,
    strategySteps: StrategyStepType[],
    vaultInstance: Contract,
  ): WeirollPlan {
    try {
      let planner = new weirollPlanner();
      const adapterObj = this.liquidityPoolToAdapter[strategySteps[strategySteps.length - 1].pool];
      let inputToken = underlyingToken;
      if (strategySteps.length > 1) {
        inputToken = strategySteps[strategySteps.length - 2].outputToken;
      }
      planner = adapterObj.getClaimRewardsPlan(
        planner,
        vaultInstance,
        inputToken,
        strategySteps[strategySteps.length - 1].pool,
        strategySteps[strategySteps.length - 1].outputToken,
      );
      const { commands, state } = planner.plan();
      return { commands, state, outputIndex: 0 };
    } catch (error: any) {
      if (error.message === "not implemented") {
        return { commands: [], state: [], outputIndex: 0 };
      }
      throw error;
    }
  }

  getHarvestRewardsPlan(
    underlyingToken: string,
    strategySteps: StrategyStepType[],
    vaultInstance: Contract,
  ): WeirollPlan {
    const planner = new weirollPlanner();
    try {
      const adapterObj = this.liquidityPoolToAdapter[strategySteps[strategySteps.length - 1].pool];
      adapterObj.getHarvestRewardsPlan(planner, vaultInstance, underlyingToken);
      const { commands, state } = planner.plan();
      return { commands, state, outputIndex: 0 };
    } catch (error: any) {
      if (error.message === `not implemented for ${underlyingToken}`) {
        return { commands: [], state: [], outputIndex: 0 };
      }
      return error;
    }
  }

  async getValueInInputToken(
    underlyingToken: string,
    strategySteps: StrategyStepType[],
    vaultInstance: Contract,
    outputTokenAmount: BigNumber,
    provider: JsonRpcProvider,
  ): Promise<BigNumber> {
    let amountUT: BigNumber = BigNumber.from("0");
    for (const [index, _strategyStep] of strategySteps.entries()) {
      const iteratorIndex = strategySteps.length - 1 - index;
      const adapterObj = this.liquidityPoolToAdapter[strategySteps[iteratorIndex].pool];
      let inputToken = underlyingToken;
      const outputToken = strategySteps[iteratorIndex].outputToken;
      if (iteratorIndex !== 0) {
        inputToken = strategySteps[iteratorIndex - 1].outputToken;
      }
      if (iteratorIndex === strategySteps.length - 1) {
        amountUT = await adapterObj.getValueInInputToken(
          vaultInstance,
          inputToken,
          strategySteps[iteratorIndex].pool,
          outputToken,
          outputTokenAmount,
          strategySteps[iteratorIndex].isSwap,
          provider,
        );
      } else {
        amountUT = await adapterObj.getValueInInputToken(
          vaultInstance,
          inputToken,
          strategySteps[iteratorIndex].pool,
          outputToken,
          amountUT,
          strategySteps[iteratorIndex].isSwap,
          provider,
        );
      }
    }
    return amountUT;
  }

  async getValueInOutputToken(
    underlyingToken: string,
    strategySteps: StrategyStepType[],
    vaultInstance: Contract,
    inputTokenAmount: BigNumber,
    provider: JsonRpcProvider,
  ): Promise<BigNumber> {
    let amountLP: BigNumber = BigNumber.from("0");
    for (const [index, strategyStep] of strategySteps.entries()) {
      const adapterObj = this.liquidityPoolToAdapter[strategyStep.pool];
      let inputToken = underlyingToken;
      if (index !== 0) {
        inputToken = strategySteps[index - 1].outputToken;
      }
      if (index === 0) {
        amountLP = await adapterObj.getValueInOutputToken(
          vaultInstance,
          inputToken,
          strategyStep.pool,
          strategyStep.outputToken,
          inputTokenAmount,
          strategyStep.isSwap,
          provider,
        );
      } else {
        amountLP = await adapterObj.getValueInOutputToken(
          vaultInstance,
          inputToken,
          strategyStep.pool,
          strategyStep.outputToken,
          amountLP,
          strategyStep.isSwap,
          provider,
        );
      }
    }
    return amountLP;
  }
}
