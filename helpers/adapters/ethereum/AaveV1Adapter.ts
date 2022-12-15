import { BigNumber, Contract } from "ethers";
import { ethers } from "@weiroll/weiroll.js/node_modules/ethers";
import { Planner as weirollPlanner, Contract as weirollContract } from "@weiroll/weiroll.js";
import Aave from "@optyfi/defi-legos/ethereum/aave/index";
import { getAddress } from "ethers/lib/utils";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { ReturnValue } from "../../type";
import { AdapterInterface } from "../AdapterInterface";
import { ERC20__factory, IWETH9__factory } from "../../../typechain";
import { JsonRpcProvider } from "@ethersproject/providers";
export class AaveV1Adapter implements AdapterInterface {
  getDepositPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
    isSwap: boolean,
    inputTokenAmount: ReturnValue,
  ): weirollPlanner {
    // TODO handle ETH deposit
    const lendingPoolContract = new ethers.Contract("0x398eC7346DcD622eDc5ae82352F02bE94C62d119", Aave.LendingPool.abi);
    const lendingPoolInstance = weirollContract.createContract(lendingPoolContract);
    if (getAddress(inputToken) === getAddress(EthereumTokens.WRAPPED_TOKENS.WETH)) {
      const wethContract = weirollContract.createContract(new ethers.Contract(inputToken, IWETH9__factory.abi));
      planner.add(wethContract["withdraw(uint256)"](inputTokenAmount));
      planner.add(
        lendingPoolInstance["deposit(address,uint256,uint16)"](inputToken, inputTokenAmount, "0").withValue(
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
    // TODO handle ETH withdraw
    const lpTokenContract = new ethers.Contract(outputToken, Aave.ATokenAbi);
    const lpTokenInstance = weirollContract.createContract(lpTokenContract);
    planner.add(lpTokenInstance["redeem(uint256)"](outputTokenAmount));
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
    const outputTokenInstance = new ethers.Contract(outputToken, ERC20__factory.abi);
    const amountLP = planner.add(outputTokenInstance["balanceOf(address)"](vaultInstance.address).staticcall());
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
    _vaulltUnderlyingToken: string,
  ): weirollPlanner {
    throw new Error("not implemented");
  }

  async getLPTokenBalance(
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
}
