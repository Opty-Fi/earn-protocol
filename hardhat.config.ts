import { HardhatUserConfig } from "hardhat/types";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import path from "path";
import fs from "fs";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
import "solidity-coverage";
import "hardhat-docgen";
import "hardhat-deploy";
import {
  NETWORKS_RPC_URL,
  NETWORKS_DEFAULT_GAS,
  eEthereumNetwork,
  CURRENT_BLOCK_NUMBER,
} from "./helper-hardhat-config";

const SKIP_LOAD = process.env.SKIP_LOAD === "true";
const DEFAULT_BLOCK_GAS_LIMIT = 0x1fffffffffffff;
const DEFAULT_GAS_MUL = 5;
const HARDFORK = "london";
const MNEMONIC_PATH = "m/44'/60'/0'/0";

if (!SKIP_LOAD) {
  ["", "deployment", "actions"].forEach(folder => {
    const tasksPath = path.join(__dirname, "tasks", folder);
    fs.readdirSync(tasksPath)
      .filter(pth => pth.includes(".ts"))
      .forEach(task => {
        require(`${tasksPath}/${task}`);
      });
  });
}

dotenvConfig({ path: resolve(__dirname, "./.env") });

const chainIds = {
  ganache: 1337,
  goerli: 5,
  hardhat: 31337,
  kovan: 42,
  mainnet: 1,
  rinkeby: 4,
  ropsten: 3,
};

// Ensure that we have all the environment variables we need.
let mnemonic: string;
if (!process.env.MNEMONIC) {
  throw new Error("Please set your MNEMONIC in a .env file");
} else {
  mnemonic = process.env.MNEMONIC as string;
}

let chainstackMainnetUrl: string;
if (!process.env.MAINNET_NODE_URL) {
  throw new Error("Please set your MAINNET_NODE_URL in a .env file");
} else {
  chainstackMainnetUrl = process.env.MAINNET_NODE_URL as string;
}

const getCommonNetworkConfig = (networkName: eEthereumNetwork, networkId: number) => ({
  url: NETWORKS_RPC_URL[networkName],
  hardfork: HARDFORK,
  blockGasLimit: DEFAULT_BLOCK_GAS_LIMIT,
  gasMultiplier: DEFAULT_GAS_MUL,
  gasPrice: NETWORKS_DEFAULT_GAS[networkName],
  chainId: networkId,
  accounts: {
    mnemonic,
    path: MNEMONIC_PATH,
    initialIndex: 0,
    count: 20,
  },
});

const buidlerConfig: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    version: "0.6.12",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "istanbul",
      outputSelection: {
        "*": {
          "*": ["storageLayout"],
        },
      },
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  networks: {
    staging: getCommonNetworkConfig(eEthereumNetwork.staging, chainIds.ganache),
    localhost: {
      url: NETWORKS_RPC_URL[eEthereumNetwork.hardhat],
      chainId: chainIds.ganache,
    },
    kovan: getCommonNetworkConfig(eEthereumNetwork.kovan, chainIds.kovan),
    hardhat: {
      initialBaseFeePerGas: 1_00_000_000,
      gasPrice: "auto",
      forking: {
        blockNumber: CURRENT_BLOCK_NUMBER,
        url: chainstackMainnetUrl,
      },
      allowUnlimitedContractSize: true,
      chainId: chainIds.ganache,
      accounts: {
        mnemonic,
        path: MNEMONIC_PATH,
        initialIndex: 0,
        count: 20,
        accountsBalance: "1000000000000000000000000000",
      },
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  mocha: {
    timeout: 0,
  },
  gasReporter: {
    currency: "USD",
    gasPrice: 165,
    enabled: process.env.REPORT_GAS == "true" ? true : false,
    coinmarketcap: process.env.COINMARKETCAP_API,
    excludeContracts: ["dependencies/", "mocks/"],
    src: "contracts",
  },
  docgen: {
    path: "./specification_docs",
    clear: true,
    runOnCompile: process.env.GENERATE_DOC_ON_COMPILE == "true" ? true : false,
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
};

export default buidlerConfig;
