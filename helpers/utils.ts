import abi from "ethereumjs-abi";
import { BigNumber, BigNumberish } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import fs from "fs";
import { AxiosRequestConfig, Method } from "axios";
import { Artifact } from "hardhat/types";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import { ethers } from "ethers";
import {
  AaveV1Adapter,
  AaveV1ETHGateway,
  AaveV2Adapter,
  AdminUpgradeabilityProxy,
  CompoundAdapter,
  CompoundETHGateway,
  CurveDepositPoolAdapter,
  CurveSwapETHGateway,
  CurveSwapPoolAdapter,
  ERC20,
  HarvestCodeProvider,
  InitializableImmutableAdminUpgradeabilityProxy,
  Registry,
  RegistryProxy,
  RiskManager,
  RiskManagerProxy,
  StrategyProvider,
  TestVault,
  Vault,
} from "../typechain";
import { expect } from "chai";

// function to get the equivalent hash (as generated by the solidity) of data passed in args
export function getSoliditySHA3Hash(argTypes: string[], args: any[]): string {
  const soliditySHA3Hash = "0x" + abi.soliditySHA3(argTypes, args).toString("hex");
  return soliditySHA3Hash;
}

export function amountInHex(fundAmount: BigNumber): string {
  const amount: string = "0x" + Number(fundAmount).toString(16);
  return amount;
}

export function delay(ms: number): Promise<unknown> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function removeDuplicateFromStringArray(list: string[]): string[] {
  return list.filter((x, i, a) => a.indexOf(x) == i);
}

export interface Signers {
  admin: SignerWithAddress;
  owner: SignerWithAddress;
  deployer: SignerWithAddress;
  alice: SignerWithAddress;
  bob: SignerWithAddress;
  financeOperator: SignerWithAddress;
  riskOperator: SignerWithAddress;
  strategyOperator: SignerWithAddress;
  operator: SignerWithAddress;
  governance: SignerWithAddress;
  eve: SignerWithAddress;
}

declare module "mocha" {
  export interface Context {
    signers: Signers;
    registry: Registry;
    registryArtifact: Artifact;
    registryProxy: RegistryProxy;
    harvestCodeProvider: HarvestCodeProvider;
    compoundAdapter: CompoundAdapter;
    compoundEthGateway: CompoundETHGateway;
    aavev1Adapter: AaveV1Adapter;
    aaveV1EthGateway: AaveV1ETHGateway;
    aaveV2Adapter: AaveV2Adapter;
    curveDepositPoolAdapter: CurveDepositPoolAdapter;
    curveSwapPoolAdapter: CurveSwapPoolAdapter;
    curveSwapEthGateway: CurveSwapETHGateway;
    strategyProvider: StrategyProvider;
    riskManagerProxy: RiskManagerProxy;
    riskManager: RiskManager;
    vault: Vault;
    vaultProxy: InitializableImmutableAdminUpgradeabilityProxy;
    opUSDCgrow: Vault;
    opUSDCgrowProxy: InitializableImmutableAdminUpgradeabilityProxy;
    opWETHgrow: Vault;
    opWETHgrowProxy: InitializableImmutableAdminUpgradeabilityProxy;
    vaultArtifact: Artifact;
    vaultProxyV2: AdminUpgradeabilityProxy;
    testVaultArtifact: Artifact;
    testVault: TestVault;
    erc20: ERC20;
    token: ERC20;
    usdc: ERC20;
    weth: ERC20;
    vaults: { [key: string]: Vault };
    tokens: { [key: string]: ERC20 };
  }
}

export function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function to_10powNumber_BN(decimals: BigNumberish): BigNumber {
  return BigNumber.from(10).pow(decimals);
}

export function createDir(_dirPath: string): void {
  if (!fs.existsSync(_dirPath)) {
    try {
      fs.mkdirSync(process.cwd() + _dirPath, { recursive: true });
    } catch (error) {
      console.error(`An error occurred: `, error);
    }
  }
}

export function createFile(filePath: string, fileContent: string | NodeJS.ArrayBufferView): void {
  try {
    fs.writeFileSync(filePath, fileContent);
  } catch (error) {
    console.error(`An error occurred: `, error);
  }
}

export function getMoralisConfig(
  method: Method,
  functionName: string,
  args: { [key: string]: any },
): AxiosRequestConfig {
  const BASE_DATA_OPTIONS = {
    _ApplicationId: process.env.MORALIS_APP_ID,
    _ClientVersion: "js0.0.120",
    _InstallationId: "a4e82bcc-1ef9-4379-a92f-59f2ecd557db",
  };
  const config = {
    method,
    url: `${process.env.MORALIS_SERVER_URL}/functions/${functionName}`,
    headers: {
      "Content-Type": "application/json",
    },
    data: JSON.stringify({
      ...args,
      ...BASE_DATA_OPTIONS,
    }),
  };

  return config;
}

export function waitforme(milisec: number): Promise<string> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve("");
    }, milisec);
  });
}

function hashToken(account: string) {
  return Buffer.from(ethers.utils.solidityKeccak256(["address"], [account]).slice(2), "hex");
}

function hashCodehash(hash: string) {
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

export function assertVaultConfiguration(
  vaultConfigurationV2: BigNumber | string,
  expectedDepositFeeUT: BigNumber | string,
  expectedDepositFeePct: BigNumber | string,
  expectedWithdrawalFeeUT: BigNumber | string,
  expectedWithdrawalFeePct: BigNumber | string,
  expectedMaxVaultValueJump: BigNumber | string,
  expectedVaultFeeCollector: string,
  expectedRiskProfileCode: BigNumber | string,
  expectedEmergencyShutdown: boolean,
  expectedUnpause: boolean,
  expectedAllowWhitelistedState: boolean,
): void {
  expect(getDepositFeeUT(vaultConfigurationV2)).to.eq(expectedDepositFeeUT);
  expect(getDepositFeePct(vaultConfigurationV2)).to.eq(expectedDepositFeePct);
  expect(getWithdrawalFeeUT(vaultConfigurationV2)).to.eq(expectedWithdrawalFeeUT);
  expect(getWithdrawalFeePct(vaultConfigurationV2)).to.eq(expectedWithdrawalFeePct);
  expect(getMaxVaultValueJump(vaultConfigurationV2)).to.eq(expectedMaxVaultValueJump);
  expect(ethers.utils.getAddress(getVaultFeeCollectorAddress(vaultConfigurationV2))).to.eq(
    ethers.utils.getAddress(expectedVaultFeeCollector),
  );
  expect(getRiskProfileCode(vaultConfigurationV2)).to.eq(expectedRiskProfileCode);
  expect(getEmergencyShutdown(vaultConfigurationV2)).to.eq(expectedEmergencyShutdown);
  expect(getUnpause(vaultConfigurationV2)).to.eq(expectedUnpause);
  expect(getAllowWhitelistState(vaultConfigurationV2)).to.eq(expectedAllowWhitelistedState);
}

export function getDepositFeeUT(vaultConfigurationV2: BigNumber | string): BigNumber {
  return BigNumber.from(BigInt(vaultConfigurationV2.toString()) & BigInt(65535));
}

export function getDepositFeePct(vaultConfigurationV2: BigNumber | string): BigNumber {
  return BigNumber.from((BigInt(vaultConfigurationV2.toString()) >> BigInt(16)) & BigInt(65535));
}

export function getWithdrawalFeeUT(vaultConfigurationV2: BigNumber | string): BigNumber {
  return BigNumber.from((BigInt(vaultConfigurationV2.toString()) >> BigInt(32)) & BigInt(65535));
}

export function getWithdrawalFeePct(vaultConfigurationV2: BigNumber | string): BigNumber {
  return BigNumber.from((BigInt(vaultConfigurationV2.toString()) >> BigInt(48)) & BigInt(65535));
}

export function getMaxVaultValueJump(vaultConfigurationV2: BigNumber | string): BigNumber {
  return BigNumber.from((BigInt(vaultConfigurationV2.toString()) >> BigInt(64)) & BigInt(65535));
}

export function getVaultFeeCollectorAddress(vaultConfigurationV2: BigNumber | string): string {
  return `0x${ethers.utils.hexlify(BigInt(vaultConfigurationV2.toString()) >> BigInt(80)).slice(-40)}`;
}

export function getRiskProfileCode(vaultConfigurationV2: BigNumber | string): BigNumber {
  return BigNumber.from(`0x${ethers.utils.hexlify(BigInt(vaultConfigurationV2.toString()) >> BigInt(240)).slice(-2)}`);
}

export function getEmergencyShutdown(vaultConfigurationV2: BigNumber | string): boolean {
  return (BigInt(vaultConfigurationV2.toString()) & (BigInt(1) << BigInt(248))) != BigInt(0);
}

export function getUnpause(vaultConfigurationV2: BigNumber | string): boolean {
  return (BigInt(vaultConfigurationV2.toString()) & (BigInt(1) << BigInt(249))) != BigInt(0);
}

export function getAllowWhitelistState(vaultConfigurationV2: BigNumber | string): boolean {
  return (BigInt(vaultConfigurationV2.toString()) & (BigInt(1) << BigInt(250))) != BigInt(0);
}
