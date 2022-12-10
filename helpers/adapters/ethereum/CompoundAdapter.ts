import { Contract } from "ethers";
import { ethers } from "@weiroll/weiroll.js/node_modules/ethers";
import { Planner as weirollPlanner, Contract as weirollContract } from "@weiroll/weiroll.js";
import Compound from "@optyfi/defi-legos/ethereum/compound/index";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { ReturnValue } from "../../type";
import { ERC20__factory, ISwapRouter__factory } from "../../../typechain";

export class CompoundAdapter {
  getDepositPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputTokenInstance: Contract,
    poolInstance: Contract,
    outputTokenInstance: Contract,
    inputTokenAmount: ReturnValue,
  ): weirollPlanner {
    planner.add(poolInstance["mint(uint256)"](inputTokenAmount));
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
    planner.add(poolInstance["redeem(uint256)"](outputTokenAmount));
    return planner;
  }

  getAmountInInputTokenPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputTokenInstance: Contract,
    poolInstance: Contract,
    outputTokenInstance: Contract,
    outputTokenAmount: ReturnValue,
    amountInInputTokenContractInstance: Contract,
    amountInInputTokenMethod: string,
  ): ReturnValue {
    const amountUT = planner.add(
      amountInInputTokenContractInstance[amountInInputTokenMethod](
        inputTokenInstance.address,
        poolInstance.address,
        outputTokenAmount,
      ).staticcall(),
    );
    return amountUT as ReturnValue;
  }

  getAmountInOutputTokenPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputTokenInstance: Contract,
    poolInstance: Contract,
    outputTokenInstance: Contract,
    inputTokenAmount: ReturnValue,
    amountInOutputTokenContractInstance: Contract,
    amountInOutputTokenMethod: string,
  ): ReturnValue {
    const amountLP = planner.add(
      amountInOutputTokenContractInstance[amountInOutputTokenMethod](
        inputTokenInstance.address,
        poolInstance.address,
        inputTokenAmount,
      ).staticcall(),
    );
    return amountLP as ReturnValue;
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
    vaultInstance: Contract,
    inputTokenInstance: Contract,
    poolInstance: Contract,
    _outputTokenInstance: Contract,
  ): weirollPlanner {
    const comptrollerContract = new ethers.Contract(Compound.comptroller.address, comptrollerAbi);
    const comptrollerInstance = weirollContract.createContract(comptrollerContract);
    planner.add(
      comptrollerInstance["claimComp(address[],address[],bool,bool)"](
        [vaultInstance.address],
        [poolInstance.address],
        false,
        true,
      ).staticcall(),
    );
    return planner;
  }

  getHarvestRewardsPlan(
    planner: weirollPlanner,
    vaultInstance: Contract,
    inputTokenInstance: Contract,
    poolInstance: Contract,
    outputTokenInstance: Contract,
  ): weirollPlanner {
    EthereumTokens.REWARD_TOKENS.COMP;
    // add read call to oracle for computing minimum expected
    const uniswapV3RouterContract = new ethers.Contract(
      "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      ISwapRouter__factory.abi,
    );
    const uniswapV3RouterInstance = weirollContract.createContract(uniswapV3RouterContract);
    const rewardContract = new ethers.Contract(EthereumTokens.REWARD_TOKENS.COMP, ERC20__factory.abi);
    const rewardInstance = weirollContract.createContract(rewardContract);
    const rewardAmount = planner.add(rewardInstance["balanceOf(address)"](vaultInstance.address).staticcall());
    const uniV3SwapPathForCOMPtoUT = ethers.utils.solidityPack(
      ["address", "uint24", "address", "uint24", "address"],
      [
        ethereumTokens.REWARD_TOKENS.COMP,
        10000,
        ethereumTokens.WRAPPED_TOKENS.WETH,
        500,
        ethereumTokens.PLAIN_TOKENS.USDT,
      ],
    );
    planner.add(
      uniswapV3RouterInstance["exactInput((bytes,address,uint256,uint256,uint256))"]([
        path,
        recipient,
        deadline,
        rewardAmount,
        0,
      ]),
    );
    return planner;
  }
}

const comptrollerAbi = [
  {
    constant: false,
    inputs: [
      {
        internalType: "address[]",
        name: "holders",
        type: "address[]",
      },
      {
        internalType: "contract CToken[]",
        name: "cTokens",
        type: "address[]",
      },
      {
        internalType: "bool",
        name: "borrowers",
        type: "bool",
      },
      {
        internalType: "bool",
        name: "suppliers",
        type: "bool",
      },
    ],
    name: "claimComp",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "getCompAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
];
