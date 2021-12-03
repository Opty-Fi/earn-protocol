import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
dotenvConfig({ path: resolve(__dirname, "./.env") });
const GWEI = 1000 * 1000 * 1000;

export enum eEthereumNetwork {
  buidlerevm = "buidlerevm",
  kovan = "kovan",
  ropsten = "ropsten",
  main = "main",
  coverage = "coverage",
  hardhat = "hardhat",
  staging = "staging",
  tenderlyMain = "tenderlyMain",
}

export type iEthereumParamsPerNetwork<T> = {
  [key in eEthereumNetwork]: T;
};

export const NETWORKS_RPC_URL: iEthereumParamsPerNetwork<string> = {
  [eEthereumNetwork.kovan]: process.env.KOVAN_NODE_URL ? process.env.KOVAN_NODE_URL : "",
  [eEthereumNetwork.ropsten]: "",
  [eEthereumNetwork.main]: "",
  [eEthereumNetwork.staging]: process.env.STAGING_NETWORK_URL ? process.env.STAGING_NETWORK_URL : "",
  [eEthereumNetwork.coverage]: "http://localhost:8555",
  [eEthereumNetwork.hardhat]: "http://localhost:8545",
  [eEthereumNetwork.tenderlyMain]: "",
  [eEthereumNetwork.buidlerevm]: "",
};

export const NETWORKS_DEFAULT_GAS: iEthereumParamsPerNetwork<number> = {
  [eEthereumNetwork.kovan]: 65 * GWEI,
  [eEthereumNetwork.ropsten]: 65 * GWEI,
  [eEthereumNetwork.main]: 65 * GWEI,
  [eEthereumNetwork.coverage]: 65 * GWEI,
  [eEthereumNetwork.hardhat]: 65 * GWEI,
  [eEthereumNetwork.staging]: 65 * GWEI,
  [eEthereumNetwork.buidlerevm]: 65 * GWEI,
  [eEthereumNetwork.tenderlyMain]: 0.01 * GWEI,
};

export const CURRENT_BLOCK_NUMBER = 13703745;
