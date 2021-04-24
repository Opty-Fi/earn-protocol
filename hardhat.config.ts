import { HardhatUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-waffle";
import "hardhat-gas-reporter";
require("dotenv").config();
/**
 * @type import('hardhat/config').HardhatUserConfig
 */

const buidlerConfig: HardhatUserConfig = {
    solidity: {
        version: "0.6.10",
        settings: {
            optimizer: { enabled: true, runs: 20 },
            evmVersion: "istanbul",
        },
    },
    networks: {
        hardhat: {
            forking: {
                blockNumber: 12200321,
                url: process.env.MAINNET_NODE_URL ? process.env.MAINNET_NODE_URL : "",
            },
            allowUnlimitedContractSize: true,
        },
    },
    mocha: {
        timeout: 10000000,
    },
    gasReporter: {
        currency: "USD",
        gasPrice: 21,
        enabled: true,
        coinmarketcap: "b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c",
        outputFile: "output.txt",
        noColors: true,
    },
};
export default buidlerConfig;
