import { config as dotenvConfig } from "dotenv";
import { HardhatNetworkForkingUserConfig } from "hardhat/types";
import { resolve } from "path";
dotenvConfig({ path: resolve(__dirname, "./.env") });
const GWEI = 1000 * 1000 * 1000;

export enum eEVMNetwork {
  kovan = "kovan",
  ropsten = "ropsten",
  mainnet = "mainnet",
  hardhat = "hardhat",
  staging = "staging",
  polygon = "polygon",
  avalanche = "avalanche",
  ganache = "ganache",
  mumbai = "mumbai",
  dashboard = "dashboard",
  tenderly = "tenderly",
  ftm = "ftm",
}

export type iEVMParamsPerNetwork<T> = {
  [key in eEVMNetwork]: T;
};

export const NETWORKS_CHAIN_ID: iEVMParamsPerNetwork<number> = {
  [eEVMNetwork.kovan]: 42,
  [eEVMNetwork.ropsten]: 3,
  [eEVMNetwork.mainnet]: 1,
  [eEVMNetwork.hardhat]: 31337,
  [eEVMNetwork.polygon]: 137,
  [eEVMNetwork.avalanche]: 43114,
  [eEVMNetwork.staging]: 1337,
  [eEVMNetwork.ganache]: 1337,
  [eEVMNetwork.mumbai]: 80001,
  [eEVMNetwork.dashboard]: 1,
  [eEVMNetwork.tenderly]: 1,
  [eEVMNetwork.ftm]: 250,
};

export const NETWORKS_CHAIN_ID_HEX: iEVMParamsPerNetwork<string> = {
  [eEVMNetwork.kovan]: "0x2a",
  [eEVMNetwork.ropsten]: "0x3",
  [eEVMNetwork.mainnet]: "0x1",
  [eEVMNetwork.hardhat]: "0x7a69",
  [eEVMNetwork.polygon]: "0x89",
  [eEVMNetwork.avalanche]: "0xa86a",
  [eEVMNetwork.staging]: "0x539",
  [eEVMNetwork.ganache]: "0x539",
  [eEVMNetwork.mumbai]: "0x13881",
  [eEVMNetwork.dashboard]: "0x1",
  [eEVMNetwork.tenderly]: "0x1",
  [eEVMNetwork.ftm]: "0xFA",
};

export const NETWORKS_CHAIN_ID_TO_HEX: { [key: string]: string } = {
  "42": "0x2a",
  "3": "0x3",
  "1": "0x1",
  "31337": "0x7a69",
  "137": "0x89",
  "43114": "0xa86a",
  "1337": "0x539",
  "80001": "0x13881",
  "250": "0xFA",
};

export const NETWORKS_RPC_URL: iEVMParamsPerNetwork<string> = {
  [eEVMNetwork.kovan]: process.env.KOVAN_NODE_URL ? process.env.KOVAN_NODE_URL : "",
  [eEVMNetwork.ropsten]: process.env.ROPSTEN_NODE_URL ? process.env.ROPSTEN_NODE_URL : "",
  [eEVMNetwork.mainnet]: process.env.MAINNET_NODE_URL ? process.env.MAINNET_NODE_URL : "",
  [eEVMNetwork.staging]: process.env.STAGING_NETWORK_URL ? process.env.STAGING_NETWORK_URL : "",
  [eEVMNetwork.hardhat]: "http://localhost:8545",
  [eEVMNetwork.polygon]: process.env.POLYGON_NODE_URL ? process.env.POLYGON_NODE_URL : "",
  [eEVMNetwork.avalanche]: process.env.AVALANCHE_NODE_URL ? process.env.AVALANCHE_NODE_URL : "",
  [eEVMNetwork.mumbai]: process.env.MUMBAI_NODE_URL ? process.env.MUMBAI_NODE_URL : "",
  [eEVMNetwork.ganache]: "http://localhost:8545",
  [eEVMNetwork.dashboard]: "http://localhost:24012/rpc",
  [eEVMNetwork.tenderly]: process.env.TENDERLY_FORK_URL ? process.env.TENDERLY_FORK_URL : "",
  [eEVMNetwork.ftm]: process.env.FTM_NODE_URL ? process.env.FTM_NODE_URL : "",
};

export const NETWORKS_DEFAULT_GAS: iEVMParamsPerNetwork<number | "auto"> = {
  [eEVMNetwork.kovan]: 65 * GWEI,
  [eEVMNetwork.ropsten]: 65 * GWEI,
  [eEVMNetwork.mainnet]: "auto",
  [eEVMNetwork.hardhat]: "auto",
  [eEVMNetwork.staging]: "auto",
  [eEVMNetwork.polygon]: 50 * GWEI,
  [eEVMNetwork.avalanche]: 65 * GWEI,
  [eEVMNetwork.mumbai]: 30 * GWEI,
  [eEVMNetwork.ganache]: "auto",
  [eEVMNetwork.dashboard]: "auto",
  [eEVMNetwork.tenderly]: 65 * GWEI,
  [eEVMNetwork.ftm]: "auto",
};

export const BLOCK_TO_FORK: iEVMParamsPerNetwork<number | undefined> = {
  [eEVMNetwork.mainnet]: 16242888,
  [eEVMNetwork.kovan]: 29962003,
  [eEVMNetwork.ropsten]: undefined,
  [eEVMNetwork.hardhat]: undefined,
  [eEVMNetwork.polygon]: 35125484,
  [eEVMNetwork.avalanche]: 17246557,
  [eEVMNetwork.staging]: undefined,
  [eEVMNetwork.ganache]: undefined,
  [eEVMNetwork.mumbai]: 25291667,
  [eEVMNetwork.dashboard]: undefined,
  [eEVMNetwork.tenderly]: undefined,
  [eEVMNetwork.ftm]: undefined,
};

export const buildForkConfig = (
  fork: eEVMNetwork,
  forkBlockNumber?: number,
): HardhatNetworkForkingUserConfig | undefined => {
  if (fork) {
    const forkMode: HardhatNetworkForkingUserConfig = {
      url: NETWORKS_RPC_URL[fork as eEVMNetwork],
    };
    if (forkBlockNumber || BLOCK_TO_FORK[fork]) {
      forkMode.blockNumber = forkBlockNumber || BLOCK_TO_FORK[fork];
    }

    return forkMode;
  }
  return undefined;
};

export const buildDeployConfig = (fork: eEVMNetwork): string[] | undefined => {
  if (fork) {
    const deployFolders: string[] = [`deploy`, `deploy_${fork}`];
    return deployFolders;
  }
};
