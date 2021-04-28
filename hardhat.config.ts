import { HardhatUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-waffle";
import "hardhat-gas-reporter";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
require("dotenv").config();
/**
 * @type import('hardhat/config').HardhatUserConfig
 */

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
        hardhat: {
            forking: {
                blockNumber: 12200321,
                url: process.env.MAINNET_NODE_URL ? process.env.MAINNET_NODE_URL : "",
            },
            gas: 12000000,
            allowUnlimitedContractSize: true,
            blockGasLimit: 0x1fffffffffffff,
        },
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
