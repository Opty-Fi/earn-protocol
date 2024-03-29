/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { IVaultV1, IVaultV1Interface } from "../IVaultV1";

const _abi = [
  {
    inputs: [
      {
        internalType: "bytes[]",
        name: "_codes",
        type: "bytes[]",
      },
    ],
    name: "adminCall",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "balance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "discontinue",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getDepositQueue",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "account",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "value",
            type: "uint256",
          },
        ],
        internalType: "struct DataTypes.UserDepositOperation[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getPricePerFullShare",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getPricePerFullShareWrite",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_investStrategyHash",
        type: "bytes32",
      },
    ],
    name: "harvest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_diff",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_currentVaultValue",
        type: "uint256",
      },
    ],
    name: "isMaxVaultValueJumpAllowed",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "rebalance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_maxVaultValueJump",
        type: "uint256",
      },
    ],
    name: "setMaxVaultValueJump",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_riskProfileCode",
        type: "uint256",
      },
    ],
    name: "setRiskProfileCode",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_underlyingToken",
        type: "address",
      },
    ],
    name: "setToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bool",
        name: "_unpaused",
        type: "bool",
      },
    ],
    name: "setUnpaused",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "userDeposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "userDepositAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "userDepositAllRebalance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "userDepositAllRebalanceWithCHI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "userDepositAllWithCHI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "userDepositRebalance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "userDepositRebalanceWithCHI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "userDepositWithCHI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "userWithdrawAllRebalance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "userWithdrawAllRebalanceWithCHI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_redeemAmount",
        type: "uint256",
      },
    ],
    name: "userWithdrawRebalance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_redeemAmount",
        type: "uint256",
      },
    ],
    name: "userWithdrawRebalanceWithCHI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export class IVaultV1__factory {
  static readonly abi = _abi;
  static createInterface(): IVaultV1Interface {
    return new utils.Interface(_abi) as IVaultV1Interface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): IVaultV1 {
    return new Contract(address, _abi, signerOrProvider) as IVaultV1;
  }
}
