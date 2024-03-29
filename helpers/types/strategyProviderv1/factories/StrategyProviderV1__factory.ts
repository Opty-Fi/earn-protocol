/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { StrategyProviderV1, StrategyProviderV1Interface } from "../StrategyProviderV1";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_registry",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_riskProfileCode",
        type: "uint256",
      },
      {
        internalType: "bytes32",
        name: "_underlyingTokensHash",
        type: "bytes32",
      },
    ],
    name: "getRpToTokenToBestStrategy",
    outputs: [
      {
        components: [
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
        internalType: "struct DataTypes.StrategyStep[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
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
        internalType: "bytes32",
        name: "_underlyingTokensHash",
        type: "bytes32",
      },
    ],
    name: "getRpToTokenToDefaultStrategy",
    outputs: [
      {
        components: [
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
        internalType: "struct DataTypes.StrategyStep[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_vaultRewardTokenHash",
        type: "bytes32",
      },
    ],
    name: "getVaultRewardTokenHashToVaultRewardTokenStrategy",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "hold",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "convert",
            type: "uint256",
          },
        ],
        internalType: "struct DataTypes.VaultRewardStrategy",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "registryContract",
    outputs: [
      {
        internalType: "contract IRegistry",
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
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "rpToTokenToBestStrategy",
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
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "rpToTokenToDefaultStrategy",
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
    inputs: [
      {
        internalType: "uint256",
        name: "_riskProfileCode",
        type: "uint256",
      },
      {
        internalType: "bytes32",
        name: "_underlyingTokensHash",
        type: "bytes32",
      },
      {
        components: [
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
        internalType: "struct DataTypes.StrategyStep[]",
        name: "_strategySteps",
        type: "tuple[]",
      },
    ],
    name: "setBestDefaultStrategy",
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
        internalType: "bytes32",
        name: "_underlyingTokensHash",
        type: "bytes32",
      },
      {
        components: [
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
        internalType: "struct DataTypes.StrategyStep[]",
        name: "_strategySteps",
        type: "tuple[]",
      },
    ],
    name: "setBestStrategy",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_registry",
        type: "address",
      },
    ],
    name: "setRegistry",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_vaultRewardTokenHash",
        type: "bytes32",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "hold",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "convert",
            type: "uint256",
          },
        ],
        internalType: "struct DataTypes.VaultRewardStrategy",
        name: "_vaultRewardStrategy",
        type: "tuple",
      },
    ],
    name: "setVaultRewardStrategy",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "hold",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "convert",
            type: "uint256",
          },
        ],
        internalType: "struct DataTypes.VaultRewardStrategy",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    name: "vaultRewardTokenHashToVaultRewardTokenStrategy",
    outputs: [
      {
        internalType: "uint256",
        name: "hold",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "convert",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b50604051610cd2380380610cd283398101604081905261002f91610054565b600080546001600160a01b0319166001600160a01b0392909216919091179055610082565b600060208284031215610065578081fd5b81516001600160a01b038116811461007b578182fd5b9392505050565b610c41806100916000396000f3fe608060405234801561001057600080fd5b50600436106100a95760003560e01c8063a91ee0dc11610071578063a91ee0dc14610144578063b06eed5e14610157578063d11917d51461016a578063e914aac51461018a578063f0e182e71461019d578063f4448faf146101b0576100a9565b80631ae5c8cb146100ae57806328c1f99b146100d95780632f5fa900146100ee5780632f647a2314610103578063373b9a8a14610124575b600080fd5b6100c16100bc366004610a6f565b6101c3565b6040516100d093929190610a9a565b60405180910390f35b6100e1610221565b6040516100d09190610b25565b6101016100fc3660046109ae565b610230565b005b610116610111366004610926565b61039b565b6040516100d0929190610bc8565b61013761013236600461093e565b6103b4565b6040516100d09190610bb1565b6101016101523660046108e7565b610437565b6101016101653660046109ae565b610549565b61017d61017836600461098d565b610658565b6040516100d09190610abe565b6100c1610198366004610a6f565b6106fa565b61017d6101ab36600461098d565b61071f565b6101376101be366004610926565b6107b2565b600260205282600052604060002060205281600052604060002081815481106101e857fe5b6000918252602090912060029091020180546001909101546001600160a01b0391821694509081169250600160a01b900460ff16905083565b6000546001600160a01b031681565b60005460408051637d5f707360e11b815290516102cc926001600160a01b03169163fabee0e6916004808301926020929190829003018186803b15801561027657600080fd5b505afa15801561028a573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906102ae919061090a565b604051806060016040528060228152602001610c13602291396107e4565b600083815260026020908152604080832085845290915281206102ee91610819565b60005b81518110156103955760008481526002602090815260408083208684529091529020825183908390811061032157fe5b602090810291909101810151825460018082018555600094855293839020825160029092020180546001600160a01b03199081166001600160a01b039384161782559383015190850180546040909401519390941691161760ff60a01b1916600160a01b91151591909102179055016102f1565b50505050565b6003602052600090815260409020805460019091015482565b6103bc61083d565b60005460408051637d5f707360e11b81529051610402926001600160a01b03169163fabee0e6916004808301926020929190829003018186803b15801561027657600080fd5b508051600092835260036020908152604093849020828155928101516001909301839055835180850190945290835282015290565b60005460408051631cfe878d60e31b815290516104f0926001600160a01b03169163e7f43c68916004808301926020929190829003018186803b15801561047d57600080fd5b505afa158015610491573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906104b5919061090a565b6040518060400160405280601a81526020017f63616c6c6572206973206e6f7420746865206f70657261746f720000000000008152506107e4565b610502816001600160a01b0316610813565b6105275760405162461bcd60e51b815260040161051e90610b8c565b60405180910390fd5b600080546001600160a01b0319166001600160a01b0392909216919091179055565b60005460408051637d5f707360e11b8152905161058f926001600160a01b03169163fabee0e6916004808301926020929190829003018186803b15801561027657600080fd5b600083815260016020908152604080832085845290915281206105b191610819565b60005b8151811015610395576000848152600160209081526040808320868452909152902082518390839081106105e457fe5b602090810291909101810151825460018082018555600094855293839020825160029092020180546001600160a01b03199081166001600160a01b039384161782559383015190850180546040909401519390941691161760ff60a01b1916600160a01b91151591909102179055016105b4565b60008281526001602090815260408083208484528252808320805482518185028101850190935280835260609492939192909184015b828210156106ee576000848152602090819020604080516060810182526002860290920180546001600160a01b03908116845260019182015490811684860152600160a01b900460ff16151591830191909152908352909201910161068e565b50505050905092915050565b600160205282600052604060002060205281600052604060002081815481106101e857fe5b600082815260026020908152604080832084845282528083208054825181850281018501909352808352606094929391929091840182156106ee576000848152602090819020604080516060810182526002860290920180546001600160a01b03908116845260019182015490811684860152600160a01b900460ff16151591830191909152908352909201910161068e565b6107ba61083d565b50600090815260036020908152604091829020825180840190935280548352600101549082015290565b80336001600160a01b0384161461080e5760405162461bcd60e51b815260040161051e9190610b39565b505050565b3b151590565b508054600082556002029060005260206000209081019061083a9190610857565b50565b604051806040016040528060008152602001600081525090565b5b808211156108885780546001600160a01b03191681556001810180546001600160a81b0319169055600201610858565b5090565b60006060828403121561089d578081fd5b6108a76060610bd6565b905081356108b481610bfd565b815260208201356108c481610bfd565b6020820152604082013580151581146108dc57600080fd5b604082015292915050565b6000602082840312156108f8578081fd5b813561090381610bfd565b9392505050565b60006020828403121561091b578081fd5b815161090381610bfd565b600060208284031215610937578081fd5b5035919050565b6000808284036060811215610951578182fd5b833592506040601f1982011215610966578182fd5b506109716040610bd6565b6020840135815260408401356020820152809150509250929050565b6000806040838503121561099f578182fd5b50508035926020909101359150565b600080600060608085870312156109c3578182fd5b843593506020808601359350604086013567ffffffffffffffff808211156109e9578485fd5b818801915088601f8301126109fc578485fd5b813581811115610a0a578586fd5b610a178485830201610bd6565b8181528481019250838501868302850186018c1015610a34578788fd5b8794505b82851015610a5e57610a4a8c8261088c565b845260019490940193928501928601610a38565b508096505050505050509250925092565b600080600060608486031215610a83578283fd5b505081359360208301359350604090920135919050565b6001600160a01b039384168152919092166020820152901515604082015260600190565b602080825282518282018190526000919060409081850190868401855b82811015610b1857815180516001600160a01b03908116865287820151168786015285015115158585015260609093019290850190600101610adb565b5091979650505050505050565b6001600160a01b0391909116815260200190565b6000602080835283518082850152825b81811015610b6557858101830151858201604001528201610b49565b81811115610b765783604083870101525b50601f01601f1916929092016040019392505050565b6020808252600b908201526a085a5cd0dbdb9d1c9858dd60aa1b604082015260600190565b815181526020918201519181019190915260400190565b918252602082015260400190565b60405181810167ffffffffffffffff81118282101715610bf557600080fd5b604052919050565b6001600160a01b038116811461083a57600080fdfe63616c6c6572206973206e6f74207468652073747261746567794f70657261746f72a164736f6c634300060c000a";

export class StrategyProviderV1__factory extends ContractFactory {
  constructor(...args: [signer: Signer] | ConstructorParameters<typeof ContractFactory>) {
    if (args.length === 1) {
      super(_abi, _bytecode, args[0]);
    } else {
      super(...args);
    }
  }

  deploy(_registry: string, overrides?: Overrides & { from?: string | Promise<string> }): Promise<StrategyProviderV1> {
    return super.deploy(_registry, overrides || {}) as Promise<StrategyProviderV1>;
  }
  getDeployTransaction(
    _registry: string,
    overrides?: Overrides & { from?: string | Promise<string> },
  ): TransactionRequest {
    return super.getDeployTransaction(_registry, overrides || {});
  }
  attach(address: string): StrategyProviderV1 {
    return super.attach(address) as StrategyProviderV1;
  }
  connect(signer: Signer): StrategyProviderV1__factory {
    return super.connect(signer) as StrategyProviderV1__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): StrategyProviderV1Interface {
    return new utils.Interface(_abi) as StrategyProviderV1Interface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): StrategyProviderV1 {
    return new Contract(address, _abi, signerOrProvider) as StrategyProviderV1;
  }
}
