import { HardhatUserConfig, NetworkUserConfig } from "hardhat/types";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import path from "path";
import fs from "fs";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "solidity-coverage";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import "hardhat-docgen";
import "@typechain/hardhat";
import "hardhat-storage-layout";
import "@tenderly/hardhat-tenderly";
import "hardhat-contract-sizer";
// import "hardhat-storage-layout";
import {
  NETWORKS_RPC_URL,
  NETWORKS_DEFAULT_GAS,
  eEVMNetwork,
  buildForkConfig,
  NETWORKS_CHAIN_ID,
  buildDeployConfig,
} from "./helper-hardhat-config";

const SKIP_LOAD = process.env.SKIP_LOAD === "true";
const DEFAULT_BLOCK_GAS_LIMIT = 0x1fffffffffffff;
const DEFAULT_GAS_MUL = 5;
const HARDFORK = "london";
const MNEMONIC_PATH = "m/44'/60'/0'/0";
const FORK = process.env.FORK || "";
const NETWORK_NAME = process.env.NETWORK_NAME || "";
const FORK_BLOCK_NUMBER = process.env.FORK_BLOCK_NUMBER ? parseInt(process.env.FORK_BLOCK_NUMBER) : 0;

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

// Ensure that we have all the environment variables we need.
let mnemonic: string;
if (!process.env.MNEMONIC) {
  throw new Error("Please set your MNEMONIC in a .env file");
} else {
  mnemonic = process.env.MNEMONIC as string;
}

const getCommonNetworkConfig = (rpcUrl: string, networkName: eEVMNetwork, networkId: number): NetworkUserConfig => ({
  url: rpcUrl,
  hardfork: HARDFORK,
  blockGasLimit: DEFAULT_BLOCK_GAS_LIMIT,
  gasMultiplier: DEFAULT_GAS_MUL,
  gasPrice: NETWORKS_DEFAULT_GAS[networkName] || "auto",
  chainId: networkId,
  deploy: [`deploy`, `deploy_${NETWORK_NAME}`],
  timeout: 100000,
  accounts: process.env.PK?.split(","),
});

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
    admin: 1,
    operator: 2,
  },
  solidity: {
    compilers: [
      {
        version: "0.6.12",
        settings: {
          metadata: {
            // Not including the metadata hash
            // https://github.com/paulrberg/solidity-template/issues/31
            bytecodeHash: "none",
          },
          // Disable the optimizer when debugging
          // https://hardhat.org/hardhat-network/#solidity-optimizer-support
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.11",
        settings: {
          metadata: {
            // Not including the metadata hash
            // https://github.com/paulrberg/solidity-template/issues/31
            bytecodeHash: "none",
          },
          // Disable the optimizer when debugging
          // https://hardhat.org/hardhat-network/#solidity-optimizer-support
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.15",
        settings: {
          metadata: {
            // Not including the metadata hash
            // https://github.com/paulrberg/solidity-template/issues/31
            bytecodeHash: "none",
          },
          // Disable the optimizer when debugging
          // https://hardhat.org/hardhat-network/#solidity-optimizer-support
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY as string,
      ropsten: process.env.ETHERSCAN_API_KEY as string,
      bsc: process.env.BSCSCAN_API_KEY as string,
      polygon: process.env.POLYGONSCAN_API_KEY as string,
      avalanche: process.env.SNOWTRACE_API_KEY as string,
    },
  },
  networks: {
    mainnet: getCommonNetworkConfig(
      NETWORKS_RPC_URL[eEVMNetwork.mainnet],
      eEVMNetwork.mainnet,
      NETWORKS_CHAIN_ID[eEVMNetwork.mainnet],
    ),
    dashboard: {
      url: NETWORKS_RPC_URL[eEVMNetwork.dashboard],
      deploy: [`deploy`, `deploy_${NETWORK_NAME}`],
    },
    polygon: getCommonNetworkConfig(
      NETWORKS_RPC_URL[eEVMNetwork.polygon],
      eEVMNetwork.polygon,
      NETWORKS_CHAIN_ID[eEVMNetwork.polygon],
    ),
    avalanche: getCommonNetworkConfig(
      NETWORKS_RPC_URL[eEVMNetwork.avalanche],
      eEVMNetwork.avalanche,
      NETWORKS_CHAIN_ID[eEVMNetwork.avalanche],
    ),
    mumbai: getCommonNetworkConfig(
      NETWORKS_RPC_URL[eEVMNetwork.mumbai],
      eEVMNetwork.mumbai,
      NETWORKS_CHAIN_ID[eEVMNetwork.mumbai],
    ),
    staging: getCommonNetworkConfig(
      NETWORKS_RPC_URL[eEVMNetwork.staging],
      eEVMNetwork.staging,
      NETWORKS_CHAIN_ID[eEVMNetwork.ganache],
    ),
    localhost: {
      url: NETWORKS_RPC_URL[eEVMNetwork.hardhat],
      chainId: NETWORKS_CHAIN_ID[eEVMNetwork.ganache],
    },
    kovan: getCommonNetworkConfig(
      NETWORKS_RPC_URL[eEVMNetwork.kovan],
      eEVMNetwork.kovan,
      NETWORKS_CHAIN_ID[eEVMNetwork.kovan],
    ),
    ropsten: getCommonNetworkConfig(
      NETWORKS_RPC_URL[eEVMNetwork.ropsten],
      eEVMNetwork.ropsten,
      NETWORKS_CHAIN_ID[eEVMNetwork.ropsten],
    ),
    tenderly: getCommonNetworkConfig(
      NETWORKS_RPC_URL[eEVMNetwork.tenderly],
      eEVMNetwork.tenderly,
      NETWORKS_CHAIN_ID[NETWORK_NAME as eEVMNetwork],
    ),
    ftm: getCommonNetworkConfig(
      NETWORKS_RPC_URL[eEVMNetwork.ftm],
      eEVMNetwork.ftm,
      NETWORKS_CHAIN_ID[NETWORK_NAME as eEVMNetwork],
    ),
    hardhat: {
      hardfork: "merge",
      initialBaseFeePerGas: 1_00_000_000,
      gasPrice: "auto",
      forking: buildForkConfig(FORK as eEVMNetwork, FORK_BLOCK_NUMBER),
      allowUnlimitedContractSize: false,
      chainId: NETWORKS_CHAIN_ID[NETWORK_NAME as eEVMNetwork],
      accounts: {
        mnemonic,
        path: MNEMONIC_PATH,
        initialIndex: 0,
        count: 20,
        accountsBalance: "1000000000000000000000000000",
      },
      deploy: buildDeployConfig(FORK as eEVMNetwork),
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
    gasPrice: 108,
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
  tenderly: {
    username: process.env.TENDERLY_USERNAME as string,
    project: process.env.TENDERLY_PROJECT as string,
    forkNetwork: "1", //Network id of the network we want to fork
  },
};

export default config;
