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
  [eEVMNetwork.polygon]: 137,
  [eEVMNetwork.avalanche]: 43114,
  [eEVMNetwork.staging]: 1337,
  [eEVMNetwork.ganache]: 1337,
};

export const NETWORKS_CHAIN_ID_HEX: iEVMParamsPerNetwork<string> = {
  [eEVMNetwork.kovan]: "0x2a",
  [eEVMNetwork.ethereum]: "0x1",
  [eEVMNetwork.hardhat]: "0x7a69",
  [eEVMNetwork.polygon]: "0x89",
  [eEVMNetwork.avalanche]: "0xa86a",
  [eEVMNetwork.staging]: "0x539",
  [eEVMNetwork.ganache]: "0x539",
};

export const NETWORKS_RPC_URL: iEVMParamsPerNetwork<string> = {
  [eEVMNetwork.kovan]: process.env.KOVAN_NODE_URL ? process.env.KOVAN_NODE_URL : "",
  [eEVMNetwork.ethereum]: process.env.ETHEREUM_NODE_URL ? process.env.ETHEREUM_NODE_URL : "",
  [eEVMNetwork.staging]: process.env.STAGING_NETWORK_URL ? process.env.STAGING_NETWORK_URL : "",
  [eEVMNetwork.hardhat]: "http://localhost:8545",
  [eEVMNetwork.polygon]: process.env.POLYGON_NODE_URL ? process.env.POLYGON_NODE_URL : "",
  [eEVMNetwork.avalanche]: process.env.AVALANCHE_NODE_URL ? process.env.AVALANCHE_NODE_URL : "",
  [eEVMNetwork.ganache]: "http://localhost:8545",
};

export const NETWORKS_DEFAULT_GAS: iEVMParamsPerNetwork<number | "auto"> = {
  [eEVMNetwork.kovan]: 65 * GWEI,
  [eEVMNetwork.ethereum]: 65 * GWEI,
  [eEVMNetwork.hardhat]: "auto",
  [eEVMNetwork.staging]: "auto",
  [eEVMNetwork.polygon]: 65 * GWEI,
  [eEVMNetwork.avalanche]: 65 * GWEI,
  [eEVMNetwork.ganache]: "auto",
};

export const BLOCK_TO_FORK: iEVMParamsPerNetwork<number | undefined> = {
  [eEVMNetwork.ethereum]: 14269106,
  [eEVMNetwork.kovan]: 29962003,
  [eEVMNetwork.hardhat]: undefined,
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
