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
  forkMain = "forkMain",
  tenderlyMain = "tenderlyMain",
}

export type iEthereumParamsPerNetwork<T> = {
  [key in eEthereumNetwork]: T;
};

export const NETWORKS_RPC_URL: iEthereumParamsPerNetwork<string> = {
  [eEthereumNetwork.kovan]: "",
  [eEthereumNetwork.ropsten]: "",
  [eEthereumNetwork.main]: "",
  [eEthereumNetwork.forkMain]: "http://54.89.212.214:8545/",
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
  [eEthereumNetwork.forkMain]: 65 * GWEI,
  [eEthereumNetwork.buidlerevm]: 65 * GWEI,
  [eEthereumNetwork.tenderlyMain]: 0.01 * GWEI,
};
