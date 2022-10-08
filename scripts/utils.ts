import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import { ethers } from "ethers";

function hashToken(account: string) {
  return Buffer.from(ethers.utils.solidityKeccak256(["address"], [account]).slice(2), "hex");
}

export function hashCodehash(hash: string) {
  return Buffer.from(ethers.utils.solidityKeccak256(["bytes32"], [hash]).slice(2), "hex");
}

export function generateMerkleTree(addresses: string[]): MerkleTree {
  const leaves = addresses.map((addr: string) => hashToken(addr));
  return new MerkleTree(leaves, keccak256, { sortPairs: true });
}

export function generateMerkleTreeForCodehash(hashes: string[]): MerkleTree {
  const leaves = hashes.map((hash: string) => hashCodehash(hash));
  return new MerkleTree(leaves, keccak256, { sortPairs: true });
}

export const getProof = (tree: MerkleTree, address: string): string[] => {
  return tree.getHexProof(hashToken(address));
};

export const getProofForCode = (tree: MerkleTree, codeHash: string): string[] => {
  return tree.getHexProof(hashCodehash(codeHash));
};

export const getAccountsMerkleRoot = (goodAddresses: string[]): string => {
  const tree: MerkleTree = generateMerkleTree(goodAddresses);
  return tree.getHexRoot();
};

export const getAccountsMerkleProof = (goodAddresses: string[], address: string): string[] => {
  const tree: MerkleTree = generateMerkleTree(goodAddresses);
  return getProof(tree, address);
};

export const getCodesMerkleRoot = (goodCodehashes: string[]): string => {
  const tree: MerkleTree = generateMerkleTreeForCodehash(goodCodehashes);
  return tree.getHexRoot();
};

export const getCodesMerkleProof = (goodCodehashes: string[], codehash: string): string[] => {
  const tree: MerkleTree = generateMerkleTree(goodCodehashes);
  return getProofForCode(tree, codehash);
};
