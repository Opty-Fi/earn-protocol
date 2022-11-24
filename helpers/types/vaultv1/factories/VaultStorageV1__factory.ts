/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { VaultStorageV1, VaultStorageV1Interface } from "../VaultStorageV1";

const _abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "index",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "DepositQueue",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "blockToBlockVaultValues",
    outputs: [
      {
        internalType: "uint256",
        name: "actualVaultValue",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "blockMinVaultValue",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "blockMaxVaultValue",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "depositQueue",
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
    name: "gasOwedToOperator",
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
    name: "investStrategyHash",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "maxVaultValueJump",
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
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "pendingDeposits",
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
    name: "pricePerShareWrite",
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
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "queue",
    outputs: [
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
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "riskProfileCode",
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
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalDeposits",
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
    name: "underlyingToken",
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
];

const _bytecode =
  "0x608060405234801561001057600080fd5b506102e2806100206000396000f3fe608060405234801561001057600080fd5b50600436106100a95760003560e01c8063c257408111610071578063c25740811461013d578063d9c3e8a114610145578063ddf0b0091461014d578063e94032561461018d578063eb3349b9146101b3578063f617eecc146101d9576100a9565b806323bb5fac146100ae5780632495a599146100ef5780635035a208146101135780635d79e2021461012d578063a9b497c814610135575b600080fd5b6100d1600480360360408110156100c457600080fd5b50803590602001356101e1565b60408051938452602084019290925282820152519081900360600190f35b6100f7610220565b604080516001600160a01b039092168252519081900360200190f35b61011b61022f565b60408051918252519081900360200190f35b61011b610235565b61011b61023b565b61011b610241565b61011b610247565b61016a6004803603602081101561016357600080fd5b503561024d565b604080516001600160a01b03909316835260208301919091528051918290030190f35b61011b600480360360208110156101a357600080fd5b50356001600160a01b0316610282565b61011b600480360360208110156101c957600080fd5b50356001600160a01b0316610294565b61011b6102a6565b600360205281600052604060002081815481106101fa57fe5b600091825260209091206003909102018054600182015460029092015490935090915083565b6008546001600160a01b031681565b60075481565b60095481565b60045481565b60055481565b600a5481565b6000818154811061025a57fe5b6000918252602090912060029091020180546001909101546001600160a01b03909116915082565b60026020526000908152604090205481565b60016020526000908152604090205481565b6006548156fea264697066735822122068b9e44bfbb5481cfdd0d69c847cea90fc20b927debb0f26ea57dda8c9a7dab064736f6c634300060c0033";

export class VaultStorageV1__factory extends ContractFactory {
  constructor(...args: [signer: Signer] | ConstructorParameters<typeof ContractFactory>) {
    if (args.length === 1) {
      super(_abi, _bytecode, args[0]);
    } else {
      super(...args);
    }
  }

  deploy(overrides?: Overrides & { from?: string | Promise<string> }): Promise<VaultStorageV1> {
    return super.deploy(overrides || {}) as Promise<VaultStorageV1>;
  }
  getDeployTransaction(overrides?: Overrides & { from?: string | Promise<string> }): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): VaultStorageV1 {
    return super.attach(address) as VaultStorageV1;
  }
  connect(signer: Signer): VaultStorageV1__factory {
    return super.connect(signer) as VaultStorageV1__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): VaultStorageV1Interface {
    return new utils.Interface(_abi) as VaultStorageV1Interface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): VaultStorageV1 {
    return new Contract(address, _abi, signerOrProvider) as VaultStorageV1;
  }
}
