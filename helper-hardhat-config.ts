import { config as dotenvConfig } from "dotenv";
import { HardhatNetworkForkingUserConfig } from "hardhat/types";
import { resolve } from "path";
dotenvConfig({ path: resolve(__dirname, "./.env") });
const GWEI = 1000 * 1000 * 1000;

export enum eEVMNetwork {
  kovan = "kovan",
  ethereum = "ethereum",
  hardhat = "hardhat",
  staging = "staging",
  matic = "matic",
  polygon = "polygon",
  avalanche = "avalanche",
  ganache = "ganache",
}

export type iEVMParamsPerNetwork<T> = {
  [key in eEVMNetwork]: T;
};

export const NETWORKS_CHAIN_ID: iEVMParamsPerNetwork<number> = {
  [eEVMNetwork.kovan]: 42,
  [eEVMNetwork.ethereum]: 1,
  [eEVMNetwork.hardhat]: 31337,
  [eEVMNetwork.matic]: 137,
  [eEVMNetwork.polygon]: 137,
  [eEVMNetwork.avalanche]: 43114,
  [eEVMNetwork.staging]: 1337,
  [eEVMNetwork.ganache]: 1337,
};

export const NETWORKS_RPC_URL: iEVMParamsPerNetwork<string> = {
  [eEVMNetwork.kovan]: process.env.KOVAN_NODE_URL ? process.env.KOVAN_NODE_URL : "",
  [eEVMNetwork.ethereum]: process.env.ETHEREUM_NODE_URL ? process.env.ETHEREUM_NODE_URL : "",
  [eEVMNetwork.staging]: process.env.STAGING_NETWORK_URL ? process.env.STAGING_NETWORK_URL : "",
  [eEVMNetwork.hardhat]: "http://localhost:8545",
  [eEVMNetwork.polygon]: process.env.POLYGON_NODE_URL ? process.env.POLYGON_NODE_URL : "",
  [eEVMNetwork.matic]: process.env.MATIC_NODE_URL ? process.env.MATIC_NODE_URL : "",
  [eEVMNetwork.avalanche]: process.env.AVALANCHE_NODE_URL ? process.env.AVALANCHE_NODE_URL : "",
  [eEVMNetwork.ganache]: "http://localhost:8545",
};

export const NETWORKS_DEFAULT_GAS: iEVMParamsPerNetwork<number | "auto"> = {
  [eEVMNetwork.kovan]: 65 * GWEI,
  [eEVMNetwork.ethereum]: 65 * GWEI,
  [eEVMNetwork.hardhat]: "auto",
  [eEVMNetwork.staging]: "auto",
  [eEVMNetwork.matic]: 65 * GWEI,
  [eEVMNetwork.polygon]: 65 * GWEI,
  [eEVMNetwork.avalanche]: 65 * GWEI,
  [eEVMNetwork.ganache]: "auto",
};

export const BLOCK_TO_FORK: iEVMParamsPerNetwork<number | undefined> = {
  [eEVMNetwork.ethereum]: 14250614,
  [eEVMNetwork.kovan]: 29962003,
  [eEVMNetwork.hardhat]: undefined,
  [eEVMNetwork.matic]: 25200204,
  [eEVMNetwork.polygon]: 25200204,
  [eEVMNetwork.avalanche]: 11215586,
  [eEVMNetwork.staging]: undefined,
  [eEVMNetwork.ganache]: undefined,
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
