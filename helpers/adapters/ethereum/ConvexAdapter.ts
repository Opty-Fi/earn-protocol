import { BigNumber, Contract } from "ethers";
import { ethers } from "@weiroll/weiroll.js/node_modules/ethers";
import { Planner as weirollPlanner, Contract as weirollContract } from "@weiroll/weiroll.js";
import { ReturnValue } from "../../type";
import { IConvexDeposit__factory } from "../../../typechain";
import { AdapterInterface } from "../AdapterInterface";
import { JsonRpcProvider } from "@ethersproject/providers";

export class ConvexAdapter implements AdapterInterface {
  vaultHelperInstance;
  readonly boosterDepositPool = "0xF403C135812408BFbE8713b5A23a04b3D48AAE31";

  constructor(vaultHelperContract: Contract) {
    this.vaultHelperInstance = weirollContract.createContract(
      new ethers.Contract(vaultHelperContract.address, vaultHelperContract.interface),
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
    const boosterDepositPoolInstance = weirollContract.createContract(
      new ethers.Contract(this.boosterDepositPool, IConvexDeposit__factory.abi),
    );
    planner.add(
      boosterDepositPoolInstance["deposit(uint256,uint256,bool)"](lpTokenToPoolData[pool].pid, inputTokenAmount, false),
    );
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
    const boosterDepositPoolInstance = weirollContract.createContract(
      new ethers.Contract(this.boosterDepositPool, IConvexDeposit__factory.abi),
    );
    planner.add(
      boosterDepositPoolInstance["withdraw(uint256,uint256)"](lpTokenToPoolData[pool].pid, outputTokenAmount),
    );
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

const lpTokenToPoolData: { [key: string]: { pid: number } } = {
  "0x30D9410ED1D5DA1F6C8391af5338C93ab8d4035C": {
    pid: 9,
  },
  "0xbE0F6478E0E4894CFb14f32855603A083A57c7dA": {
    pid: 32,
  },
  "0xabB54222c2b77158CC975a2b715a3d703c256F05": {
    pid: 40,
  },
  "0x9518c9063eB0262D791f38d8d6Eb0aca33c63ed0": {
    pid: 25,
  },
};