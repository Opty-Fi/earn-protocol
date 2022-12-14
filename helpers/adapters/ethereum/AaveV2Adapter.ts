import { Contract } from "ethers";
import { ethers } from "@weiroll/weiroll.js/node_modules/ethers";
import { Planner as weirollPlanner, Contract as weirollContract } from "@weiroll/weiroll.js";
import AaveV2 from "@optyfi/defi-legos/ethereum/aavev2/index";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { ReturnValue } from "../../type";
import { AdapterInterface } from "../AdapterInterface";
import { ERC20__factory, ISwapRouter__factory } from "../../../typechain";
import { getAddress } from "ethers/lib/utils";

const STK_AAVE = "0x4da27a545c0c5B758a6BA100e3a049001de870f5";
export class Aavev2Adapter implements AdapterInterface {
  getDepositPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputToken: string,
    pool: string,
    outputToken: string,
    isSwap: boolean,
    inputTokenAmount: ReturnValue,
  ): weirollPlanner {
    const lendingPoolContract = new ethers.Contract(
      "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9",
      AaveV2.LendingPool.abi,
    );
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
    const lendingPoolContract = new ethers.Contract(
      "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9",
      AaveV2.LendingPool.abi,
    );
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
    const outputTokenInstance = weirollContract.createContract(new ethers.Contract(outputToken, ERC20__factory.abi));
    const amountLP = planner.add(outputTokenInstance["balanceOf(address)"](vaultInstance.address).staticcall());
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
    // TODO consider adding minimum amount to receive
    const uniswapV3RouterContract = new ethers.Contract(
      "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      ISwapRouter__factory.abi,
    );
    const uniswapV3RouterInstance = weirollContract.createContract(uniswapV3RouterContract);
    const rewardContract = new ethers.Contract(STK_AAVE, ERC20__factory.abi);
    const rewardInstance = weirollContract.createContract(rewardContract);
    const rewardAmount = planner.add(rewardInstance["balanceOf(address)"](vaultInstance.address).staticcall());
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
      uniswapV3RouterInstance["exactInput((bytes,address,uint256,uint256,uint256))"]([
        univ3Path,
        vaultInstance.address,
        ethers.constants.MaxUint256,
        rewardAmount,
        0,
      ]),
    );
    return planner;
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
