import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import TASKS from "../task-names";
import { getAddress } from "ethers/lib/utils";

task(TASKS.ACTION_TASKS.CHANGE_VAULT_PROXY_V2_ADMIN.NAME, TASKS.ACTION_TASKS.CHANGE_VAULT_PROXY_V2_ADMIN.DESCRIPTION)
  .addParam("vault", "the address of vault", "", types.string)
  .addParam("newAdmin", "address of the new admin", "", types.string)
  .setAction(async ({ vault, newAdmin }, hre) => {
    if (!isAddress(vault)) {
      throw new Error("vault address is invalid");
    }

    if (!isAddress(newAdmin)) {
      throw new Error("new admin address is invalid");
    }

    try {
      const vaultProxyInstance = await hre.ethers.getContractAt(EIP173_ABI, vault);
      const currentAdmin = await vaultProxyInstance.owner();
      console.log("current admin ", currentAdmin);
      if (getAddress(newAdmin) != getAddress(currentAdmin)) {
        const currentAdminSigner = await hre.ethers.getSigner(currentAdmin);
        const tx = await vaultProxyInstance.connect(currentAdminSigner).transferOwnership(newAdmin);
        await tx.wait(1);
        const actualNewAdmin = await vaultProxyInstance.owner();
        console.log("The new admin is ", actualNewAdmin);
      } else {
        console.log("current admin is upto date");
      }
    } catch (error: any) {
      console.error(`${TASKS.ACTION_TASKS.CHANGE_VAULT_PROXY_V2_ADMIN.NAME}: `, error);
    }
  });

const EIP173_ABI = [
  {
    inputs: [
      { internalType: "address", name: "implementationAddress", type: "address" },
      { internalType: "address", name: "ownerAddress", type: "address" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    stateMutability: "payable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "previousOwner", type: "address" },
      { indexed: true, internalType: "address", name: "newOwner", type: "address" },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "previousImplementation", type: "address" },
      { indexed: true, internalType: "address", name: "newImplementation", type: "address" },
    ],
    name: "ProxyImplementationUpdated",
    type: "event",
  },
  { stateMutability: "payable", type: "fallback" },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes4", name: "id", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newImplementation", type: "address" }],
    name: "upgradeTo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "newImplementation", type: "address" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "upgradeToAndCall",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  { stateMutability: "payable", type: "receive" },
];
