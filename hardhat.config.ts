import { HardhatUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-waffle";
import "hardhat-gas-reporter";
import "hardhat-deploy-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
import "hardhat-deploy";
import {
    NETWORKS_RPC_URL,
    NETWORKS_DEFAULT_GAS,
    eEthereumNetwork,
} from "./helper-hardhat-config";

require("dotenv").config();
require("./tasks/deployment/deploy-infra");
require("./tasks/deployment/deploy-vault");
require("./tasks/deployment/deploy-vaults");
/**
 * @type import('hardhat/config').HardhatUserConfig
 */

const DEFAULT_BLOCK_GAS_LIMIT = 12450000;
const DEFAULT_GAS_MUL = 5;
const HARDFORK = "istanbul";
const MNEMONIC_PATH = "m/44'/60'/0'/0";
const MNEMONIC = process.env.MNEMONIC || "";

const getCommonNetworkConfig = (networkName: eEthereumNetwork, networkId: number) => ({
    url: NETWORKS_RPC_URL[networkName],
    hardfork: HARDFORK,
    blockGasLimit: DEFAULT_BLOCK_GAS_LIMIT,
    gasMultiplier: DEFAULT_GAS_MUL,
    gasPrice: NETWORKS_DEFAULT_GAS[networkName],
    chainId: networkId,
    accounts: {
        mnemonic: MNEMONIC,
        path: MNEMONIC_PATH,
        initialIndex: 0,
        count: 20,
    },
});

const buidlerConfig: HardhatUserConfig = {
    solidity: {
        version: "0.6.10",
        settings: {
            optimizer: { enabled: true, runs: 1 },
            evmVersion: "istanbul",
        },
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
    },
    networks: {
        kovan: getCommonNetworkConfig(eEthereumNetwork.kovan, 42),
        ropsten: getCommonNetworkConfig(eEthereumNetwork.ropsten, 3),
        main: getCommonNetworkConfig(eEthereumNetwork.main, 1),
        localhost: {
            url: NETWORKS_RPC_URL[eEthereumNetwork.hardhat],
            chainId: 1337,
        },
        hardhat: {
            forking: {
                blockNumber: 12200321,
                url: process.env.MAINNET_NODE_URL ? process.env.MAINNET_NODE_URL : "",
            },
            allowUnlimitedContractSize: true,
            blockGasLimit: 0x1fffffffffffff,
            chainId: 1337,
        },
    },
    namedAccounts: {
        owner: 0,
        admin: 1,
    },
    mocha: {
        timeout: 0,
    },
    gasReporter: {
        currency: "USD",
        gasPrice: 21,
        enabled: process.env.REPORT_GAS ? true : false,
        coinmarketcap: process.env.COINMARKETCAP_API,
    },
};
export default buidlerConfig;
