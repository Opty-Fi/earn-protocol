/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { IRegistryV1, IRegistryV1Interface } from "../IRegistryV1";

const _abi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_riskProfileCode",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "_name",
        type: "string",
      },
      {
        internalType: "string",
        name: "_symbol",
        type: "string",
      },
      {
        internalType: "bool",
        name: "_canBorrow",
        type: "bool",
      },
      {
        components: [
          {
            internalType: "uint8",
            name: "lowerLimit",
            type: "uint8",
          },
          {
            internalType: "uint8",
            name: "upperLimit",
            type: "uint8",
          },
        ],
        internalType: "struct DataTypes.PoolRatingsRange",
        name: "_poolRatingRange",
        type: "tuple",
      },
    ],
    name: "addRiskProfile",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256[]",
        name: "_riskProfileCodes",
        type: "uint256[]",
      },
      {
        internalType: "string[]",
        name: "_names",
        type: "string[]",
      },
      {
        internalType: "string[]",
        name: "_symbols",
        type: "string[]",
      },
      {
        internalType: "bool[]",
        name: "_canBorrow",
        type: "bool[]",
      },
      {
        components: [
          {
            internalType: "uint8",
            name: "lowerLimit",
            type: "uint8",
          },
          {
            internalType: "uint8",
            name: "upperLimit",
            type: "uint8",
          },
        ],
        internalType: "struct DataTypes.PoolRatingsRange[]",
        name: "_poolRatingRanges",
        type: "tuple[]",
      },
    ],
    name: "addRiskProfile",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_pool",
        type: "address",
      },
    ],
    name: "approveCreditPool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "_pools",
        type: "address[]",
      },
    ],
    name: "approveCreditPool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_pool",
        type: "address",
      },
    ],
    name: "approveLiquidityPool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "_pools",
        type: "address[]",
      },
    ],
    name: "approveLiquidityPool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "pool",
            type: "address",
          },
          {
            internalType: "address",
            name: "adapter",
            type: "address",
          },
        ],
        internalType: "struct DataTypes.PoolAdapter[]",
        name: "_poolAdapters",
        type: "tuple[]",
      },
    ],
    name: "approveLiquidityPoolAndMapToAdapter",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_pool",
        type: "address",
      },
      {
        internalType: "address",
        name: "_adapter",
        type: "address",
      },
    ],
    name: "approveLiquidityPoolAndMapToAdapter",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_token",
        type: "address",
      },
    ],
    name: "approveToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "_tokens",
        type: "address[]",
      },
    ],
    name: "approveToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_tokensHash",
        type: "bytes32",
      },
      {
        internalType: "address[]",
        name: "_tokens",
        type: "address[]",
      },
    ],
    name: "approveTokenAndMapToTokensHash",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "bytes32",
            name: "tokensHash",
            type: "bytes32",
          },
          {
            internalType: "address[]",
            name: "tokens",
            type: "address[]",
          },
        ],
        internalType: "struct DataTypes.TokensHashDetail[]",
        name: "_tokensHashesDetails",
        type: "tuple[]",
      },
    ],
    name: "approveTokenAndMapToTokensHash",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getFinanceOperator",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getGovernance",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getHarvestCodeProvider",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_pool",
        type: "address",
      },
    ],
    name: "getLiquidityPool",
    outputs: [
      {
        components: [
          {
            internalType: "uint8",
            name: "rating",
            type: "uint8",
          },
          {
            internalType: "bool",
            name: "isLiquidityPool",
            type: "bool",
          },
        ],
        internalType: "struct DataTypes.LiquidityPool",
        name: "_liquidityPool",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_pool",
        type: "address",
      },
    ],
    name: "getLiquidityPoolToAdapter",
    outputs: [
      {
        internalType: "address",
        name: "_adapter",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getODEFIVaultBooster",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getOPTYDistributor",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getOperator",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getRiskManager",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getRiskOperator",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "getRiskProfile",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "index",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "canBorrow",
            type: "bool",
          },
          {
            components: [
              {
                internalType: "uint8",
                name: "lowerLimit",
                type: "uint8",
              },
              {
                internalType: "uint8",
                name: "upperLimit",
                type: "uint8",
              },
            ],
            internalType: "struct DataTypes.PoolRatingsRange",
            name: "poolRatingsRange",
            type: "tuple",
          },
          {
            internalType: "bool",
            name: "exists",
            type: "bool",
          },
          {
            internalType: "string",
            name: "name",
            type: "string",
          },
          {
            internalType: "string",
            name: "symbol",
            type: "string",
          },
        ],
        internalType: "struct DataTypes.RiskProfile",
        name: "_riskProfile",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getRiskProfileList",
    outputs: [
      {
        internalType: "uint256[]",
        name: "",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getStrategyOperator",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getStrategyProvider",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTokenHashes",
    outputs: [
      {
        internalType: "bytes32[]",
        name: "",
        type: "bytes32[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_index",
        type: "uint256",
      },
    ],
    name: "getTokensHashByIndex",
    outputs: [
      {
        internalType: "bytes32",
        name: "_tokensHash",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_tokensHash",
        type: "bytes32",
      },
    ],
    name: "getTokensHashIndexByHash",
    outputs: [
      {
        internalType: "uint256",
        name: "_index",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_tokensHash",
        type: "bytes32",
      },
    ],
    name: "getTokensHashToTokenList",
    outputs: [
      {
        internalType: "address[]",
        name: "",
        type: "address[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_token",
        type: "address",
      },
    ],
    name: "isApprovedToken",
    outputs: [
      {
        internalType: "bool",
        name: "_isTokenApproved",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_pool",
        type: "address",
      },
      {
        internalType: "uint8",
        name: "_rate",
        type: "uint8",
      },
    ],
    name: "rateCreditPool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "pool",
            type: "address",
          },
          {
            internalType: "uint8",
            name: "rate",
            type: "uint8",
          },
        ],
        internalType: "struct DataTypes.PoolRate[]",
        name: "_poolRates",
        type: "tuple[]",
      },
    ],
    name: "rateCreditPool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "pool",
            type: "address",
          },
          {
            internalType: "uint8",
            name: "rate",
            type: "uint8",
          },
        ],
        internalType: "struct DataTypes.PoolRate[]",
        name: "_poolRates",
        type: "tuple[]",
      },
    ],
    name: "rateLiquidityPool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_pool",
        type: "address",
      },
      {
        internalType: "uint8",
        name: "_rate",
        type: "uint8",
      },
    ],
    name: "rateLiquidityPool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_index",
        type: "uint256",
      },
    ],
    name: "removeRiskProfile",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "_pools",
        type: "address[]",
      },
    ],
    name: "revokeCreditPool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_pool",
        type: "address",
      },
    ],
    name: "revokeCreditPool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "_pools",
        type: "address[]",
      },
    ],
    name: "revokeLiquidityPool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_pool",
        type: "address",
      },
    ],
    name: "revokeLiquidityPool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_token",
        type: "address",
      },
    ],
    name: "revokeToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "_tokens",
        type: "address[]",
      },
    ],
    name: "revokeToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_harvestCodeProvider",
        type: "address",
      },
    ],
    name: "setHarvestCodeProvider",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_pool",
        type: "address",
      },
      {
        internalType: "address",
        name: "_adapter",
        type: "address",
      },
    ],
    name: "setLiquidityPoolToAdapter",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "pool",
            type: "address",
          },
          {
            internalType: "address",
            name: "adapter",
            type: "address",
          },
        ],
        internalType: "struct DataTypes.PoolAdapter[]",
        name: "_poolAdapters",
        type: "tuple[]",
      },
    ],
    name: "setLiquidityPoolToAdapter",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_odefiVaultBooster",
        type: "address",
      },
    ],
    name: "setODEFIVaultBooster",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_opty",
        type: "address",
      },
    ],
    name: "setOPTY",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_riskManager",
        type: "address",
      },
    ],
    name: "setRiskManager",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_strategyProvider",
        type: "address",
      },
    ],
    name: "setStrategyProvider",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_tokensHash",
        type: "bytes32",
      },
      {
        internalType: "address[]",
        name: "_tokens",
        type: "address[]",
      },
    ],
    name: "setTokensHashToTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "bytes32",
            name: "tokensHash",
            type: "bytes32",
          },
          {
            internalType: "address[]",
            name: "tokens",
            type: "address[]",
          },
        ],
        internalType: "struct DataTypes.TokensHashDetail[]",
        name: "_tokensHashesDetails",
        type: "tuple[]",
      },
    ],
    name: "setTokensHashToTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_treasury",
        type: "address",
      },
    ],
    name: "setTreasury",
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
      {
        components: [
          {
            internalType: "uint8",
            name: "lowerLimit",
            type: "uint8",
          },
          {
            internalType: "uint8",
            name: "upperLimit",
            type: "uint8",
          },
        ],
        internalType: "struct DataTypes.PoolRatingsRange",
        name: "_poolRatingRange",
        type: "tuple",
      },
    ],
    name: "updateRPPoolRatings",
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
      {
        internalType: "bool",
        name: "_canBorrow",
        type: "bool",
      },
    ],
    name: "updateRiskProfileBorrow",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export class IRegistryV1__factory {
  static readonly abi = _abi;
  static createInterface(): IRegistryV1Interface {
    return new utils.Interface(_abi) as IRegistryV1Interface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): IRegistryV1 {
    return new Contract(address, _abi, signerOrProvider) as IRegistryV1;
  }
}
