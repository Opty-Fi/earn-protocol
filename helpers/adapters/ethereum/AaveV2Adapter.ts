import { BigNumber, Contract } from "ethers";
import { ethers } from "@weiroll/weiroll.js/node_modules/ethers";
import { Planner as weirollPlanner, Contract as weirollContract } from "@weiroll/weiroll.js";
import AaveV2 from "@optyfi/defi-legos/ethereum/aavev2/index";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { getAddress } from "ethers/lib/utils";
import { ReturnValue } from "../../type";
import { AdapterInterface } from "../AdapterInterface";
import { JsonRpcProvider } from "@ethersproject/providers";

const STK_AAVE = "0x4da27a545c0c5B758a6BA100e3a049001de870f5";
export class Aavev2Adapter implements AdapterInterface {
  optyFiOracleAddress;
  vaultHelperMainnetInstance;

  constructor(vaultHelperMainnetContract: Contract, _optyFiOracleAddress: string) {
    this.optyFiOracleAddress = _optyFiOracleAddress;
    this.vaultHelperMainnetInstance = weirollContract.createContract(
      new ethers.Contract(vaultHelperMainnetContract.address, vaultHelperMainnetContract.interface),
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
    const lendingPoolContract = new ethers.Contract(AaveV2.LendingPool.address, AaveV2.LendingPool.abi);
    const lendingPoolInstance = weirollContract.createContract(lendingPoolContract);
    planner.add(
      lendingPoolInstance["deposit(address,uint256,address,uint16)"](
        inputToken,
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
    inputToken: string,
    pool: string,
    outputToken: string,
    isSwap: boolean,
    outputTokenAmount: ReturnValue,
  ): weirollPlanner {
    const lendingPoolContract = new ethers.Contract(AaveV2.LendingPool.address, AaveV2.LendingPool.abi);
    const lendingPoolInstance = weirollContract.createContract(lendingPoolContract);
    planner.add(
      lendingPoolInstance["withdraw(address,uint256,address)"](inputToken, outputTokenAmount, vaultInstance.address),
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
      this.vaultHelperMainnetInstance["getERC20Balance(address,address)"](
        outputToken,
        vaultInstance.address,
      ).staticcall(),
    );
    return amountLP as ReturnValue;
  }

  getClaimRewardsPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
  ): weirollPlanner {
    const aaveIncentiveControllerInstance = weirollContract.createContract(
      new ethers.Contract("0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5", aaveIncentiveControllerAbi),
    );
    planner.add(
      aaveIncentiveControllerInstance["claimRewards(address[],uint256,address)"](
        [outputToken],
        ethers.constants.MaxUint256,
        vaultInstance.address,
      ),
    );
    return planner;
  }

  getHarvestRewardsPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    vaultUnderlyingToken: string,
  ): weirollPlanner {
    const rewardAmount = planner.add(
      this.vaultHelperMainnetInstance["getERC20Balance(address,address)"](STK_AAVE, vaultInstance.address).staticcall(),
    );
    const minumumOutputAmount = planner.add(
      this.vaultHelperMainnetInstance[
        "getMinimumExpectedTokenOutPrice_OptyFiOracle(address,address,address,uint256,uint256)"
      ](this.optyFiOracleAddress, STK_AAVE, vaultUnderlyingToken, rewardAmount, 100).staticcall(),
    );
    let univ3Path;
    switch (getAddress(vaultUnderlyingToken)) {
      case getAddress(EthereumTokens.PLAIN_TOKENS.USDT): {
        univ3Path = ethers.utils.solidityPack(
          ["address", "uint24", "address", "uint24", "address", "uint24", "address"],
          [
            STK_AAVE,
            500,
            EthereumTokens.REWARD_TOKENS.AAVE,
            3000,
            EthereumTokens.WRAPPED_TOKENS.WETH,
            500,
            EthereumTokens.PLAIN_TOKENS.USDT,
          ],
        );
        break;
      }
      case getAddress(EthereumTokens.BTC_TOKENS.WBTC): {
        univ3Path = ethers.utils.solidityPack(
          ["address", "uint24", "address", "uint24", "address", "uint24", "address"],
          [
            STK_AAVE,
            500,
            EthereumTokens.REWARD_TOKENS.AAVE,
            3000,
            EthereumTokens.WRAPPED_TOKENS.WETH,
            500,
            EthereumTokens.BTC_TOKENS.WBTC,
          ],
        );
        break;
      }
      case getAddress(EthereumTokens.PLAIN_TOKENS.USDC): {
        univ3Path = ethers.utils.solidityPack(
          ["address", "uint24", "address", "uint24", "address", "uint24", "address"],
          [
            STK_AAVE,
            500,
            EthereumTokens.REWARD_TOKENS.AAVE,
            3000,
            EthereumTokens.WRAPPED_TOKENS.WETH,
            500,
            EthereumTokens.PLAIN_TOKENS.USDC,
          ],
        );
        break;
      }
      case getAddress(EthereumTokens.WRAPPED_TOKENS.WETH): {
        univ3Path = ethers.utils.solidityPack(
          ["address", "uint24", "address", "uint24", "address"],
          [STK_AAVE, 500, EthereumTokens.REWARD_TOKENS.AAVE, 3000, EthereumTokens.WRAPPED_TOKENS.WETH],
        );
        break;
      }
      case getAddress(EthereumTokens.PLAIN_TOKENS.DAI): {
        univ3Path = ethers.utils.solidityPack(
          ["address", "uint24", "address", "uint24", "address", "uint24", "address"],
          [
            STK_AAVE,
            500,
            EthereumTokens.REWARD_TOKENS.AAVE,
            3000,
            EthereumTokens.WRAPPED_TOKENS.WETH,
            500,
            EthereumTokens.PLAIN_TOKENS.DAI,
          ],
        );
        break;
      }
      default: {
        throw new Error(`not implemented for ${vaultUnderlyingToken}`);
      }
    }
    planner.add(
      this.vaultHelperMainnetInstance["exactInput_UniswapV3(bytes,uint256,uint256,uint256)"](
        univ3Path,
        ethers.constants.MaxUint256,
        rewardAmount,
        minumumOutputAmount,
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
      this.vaultHelperMainnetInstance.address,
      this.vaultHelperMainnetInstance.interface,
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

const aaveIncentiveControllerAbi = [
  {
    inputs: [
      { internalType: "address[]", name: "assets", type: "address[]" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address", name: "to", type: "address" },
    ],
    name: "claimRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_user", type: "address" }],
    name: "getUserUnclaimedRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];
