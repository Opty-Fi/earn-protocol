import { BigNumber, Contract } from "ethers";
import { ethers } from "@weiroll/weiroll.js/node_modules/ethers";
import { Planner as weirollPlanner, Contract as weirollContract } from "@weiroll/weiroll.js";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { ReturnValue } from "../../type";
import { ICurveGauge__factory, ITokenMinter__factory } from "../../../typechain";
import { AdapterInterface } from "../AdapterInterface";
import { JsonRpcProvider } from "@ethersproject/providers";
import { getAddress } from "ethers/lib/utils";

export class CurveGaugeAdapter implements AdapterInterface {
  vaultHelperInstance;
  optyFiOracleAddress;
  swapHelperInstance;
  readonly tokenMinter = "0xd061D61a4d941c39E5453435B6345Dc261C2fcE0";

  constructor(
    _optyFiOracleAddress: string,
    vaultHelperContract: Contract,
    curveHelper: Contract,
    swapHelperContract: Contract,
  ) {
    this.vaultHelperInstance = weirollContract.createContract(
      new ethers.Contract(vaultHelperContract.address, vaultHelperContract.interface),
    );
    this.optyFiOracleAddress = _optyFiOracleAddress;
    this.swapHelperInstance = weirollContract.createContract(
      new ethers.Contract(swapHelperContract.address, swapHelperContract.interface),
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
    const gaugeInstance = weirollContract.createContract(new ethers.Contract(pool, ICurveGauge__factory.abi));
    planner.add(gaugeInstance["deposit(uint256)"](inputTokenAmount));
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
    const gaugeInstance = weirollContract.createContract(new ethers.Contract(pool, ICurveGauge__factory.abi));
    planner.add(gaugeInstance["withdraw(uint256)"](outputTokenAmount));
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
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    _outputToken: string,
  ): weirollPlanner {
    const minterInstance = weirollContract.createContract(
      new ethers.Contract(this.tokenMinter, ITokenMinter__factory.abi),
    );
    planner.add(minterInstance["mint(address)"](pool));
    return planner;
  }

  getHarvestRewardsPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    vaultUnderlyingToken: string,
  ): weirollPlanner {
    const rewardAmount = planner.add(
      this.vaultHelperInstance["getERC20Balance(address,address)"](
        EthereumTokens.REWARD_TOKENS.CRV,
        vaultInstance.address,
      ).staticcall(),
    );
    const outputAmount = planner.add(
      this.vaultHelperInstance["getTokenOutPrice_OptyFiOracle(address,address,address,uint256)"](
        this.optyFiOracleAddress,
        EthereumTokens.REWARD_TOKENS.CRV,
        vaultUnderlyingToken,
        rewardAmount,
      ).staticcall(),
    );
    const minimumOutputAmount = planner.add(
      this.vaultHelperInstance["getMinimumExpectedTokenOutPrice(uint256,uint256)"](outputAmount, 100),
    );
    let univ3Path;
    switch (getAddress(vaultUnderlyingToken)) {
      case getAddress(EthereumTokens.BTC_TOKENS.WBTC): {
        univ3Path = ethers.utils.solidityPack(
          ["address", "uint24", "address", "uint24", "address"],
          [
            EthereumTokens.REWARD_TOKENS.CRV,
            3000,
            EthereumTokens.PLAIN_TOKENS.USDT,
            3000,
            EthereumTokens.BTC_TOKENS.WBTC,
          ],
        );
        break;
      }
      case getAddress(EthereumTokens.PLAIN_TOKENS.USDC): {
        univ3Path = ethers.utils.solidityPack(
          ["address", "uint24", "address"],
          [EthereumTokens.REWARD_TOKENS.CRV, 10000, EthereumTokens.PLAIN_TOKENS.USDC],
        );
        break;
      }
      case getAddress(EthereumTokens.WRAPPED_TOKENS.WETH): {
        univ3Path = ethers.utils.solidityPack(
          ["address", "uint24", "address"],
          [EthereumTokens.REWARD_TOKENS.CRV, 3000, EthereumTokens.WRAPPED_TOKENS.WETH],
        );
        break;
      }
      case getAddress(EthereumTokens.WRAPPED_TOKENS.THREE_CRV): {
        univ3Path = ethers.utils.solidityPack(
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
        break;
      }
      default: {
        throw new Error(`not implemented for ${vaultUnderlyingToken}`);
      }
    }
    planner.add(
      this.swapHelperInstance["exactInput_UniswapV3(bytes,uint256,uint256,uint256)"](
        univ3Path,
        ethers.constants.MaxUint256,
        rewardAmount,
        minimumOutputAmount,
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
