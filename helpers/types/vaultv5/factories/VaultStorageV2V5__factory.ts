/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { VaultStorageV2V5, VaultStorageV2V5Interface } from "../VaultStorageV2V5";

const _abi = [
  {
    inputs: [],
    name: "_domainSeparator",
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
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "investStrategySteps",
    outputs: [
      {
        internalType: "address",
        name: "pool",
        type: "address",
      },
      {
        internalType: "address",
        name: "outputToken",
        type: "address",
      },
      {
        internalType: "bool",
        name: "isBorrow",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "minimumDepositValueUT",
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
    name: "totalValueLockedLimitUT",
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
  {
    inputs: [],
    name: "underlyingTokensHash",
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
    name: "userDepositCapUT",
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
    name: "vaultConfiguration",
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
    name: "whitelistedAccountsRoot",
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
];

const _bytecode =
  "0x608060405234801561001057600080fd5b506103a2806100206000396000f3fe608060405234801561001057600080fd5b50600436106100ea5760003560e01c8063ae78b1b01161008c578063db7e563211610066578063db7e5632146101e7578063ddf0b009146101ef578063e94032561461022f578063eb3349b914610255576100ea565b8063ae78b1b0146101cf578063c9dd6b24146101d7578063d46ae8e2146101df576100ea565b806329dc0658116100c857806329dc06581461016e5780636db5eeb2146101765780638c0e0357146101bf578063a9b497c8146101c7576100ea565b806303f2e589146100ef57806323bb5fac146101095780632495a5991461014a575b600080fd5b6100f761027b565b60408051918252519081900360200190f35b61012c6004803603604081101561011f57600080fd5b5080359060200135610281565b60408051938452602084019290925282820152519081900360600190f35b6101526102c0565b604080516001600160a01b039092168252519081900360200190f35b6100f76102cf565b6101936004803603602081101561018c57600080fd5b50356102d5565b604080516001600160a01b03948516815292909316602083015215158183015290519081900360600190f35b6100f7610318565b6100f761031e565b6100f7610324565b6100f761032a565b6100f7610330565b6100f7610336565b61020c6004803603602081101561020557600080fd5b503561033c565b604080516001600160a01b03909316835260208301919091528051918290030190f35b6100f76004803603602081101561024557600080fd5b50356001600160a01b0316610371565b6100f76004803603602081101561026b57600080fd5b50356001600160a01b0316610383565b60095481565b6003602052816000526040600020818154811061029a57fe5b600091825260209091206003909102018054600182015460029092015490935090915083565b6008546001600160a01b031681565b600a5481565b600d81815481106102e257fe5b6000918252602090912060029091020180546001909101546001600160a01b03918216925090811690600160a01b900460ff1683565b60055481565b60045481565b60065481565b600c5481565b600b5481565b60075481565b6000818154811061034957fe5b6000918252602090912060029091020180546001909101546001600160a01b03909116915082565b60026020526000908152604090205481565b6001602052600090815260409020548156fea164736f6c634300060c000a";

export class VaultStorageV2V5__factory extends ContractFactory {
  constructor(...args: [signer: Signer] | ConstructorParameters<typeof ContractFactory>) {
    if (args.length === 1) {
      super(_abi, _bytecode, args[0]);
    } else {
      super(...args);
    }
  }

  deploy(overrides?: Overrides & { from?: string | Promise<string> }): Promise<VaultStorageV2V5> {
    return super.deploy(overrides || {}) as Promise<VaultStorageV2V5>;
  }
  getDeployTransaction(overrides?: Overrides & { from?: string | Promise<string> }): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): VaultStorageV2V5 {
    return super.attach(address) as VaultStorageV2V5;
  }
  connect(signer: Signer): VaultStorageV2V5__factory {
    return super.connect(signer) as VaultStorageV2V5__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): VaultStorageV2V5Interface {
    return new utils.Interface(_abi) as VaultStorageV2V5Interface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): VaultStorageV2V5 {
    return new Contract(address, _abi, signerOrProvider) as VaultStorageV2V5;
  }
}
