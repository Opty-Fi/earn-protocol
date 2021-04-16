import { HardhatUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-waffle";
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
        },
    },
    mocha: {
        timeout: 10000000,
    },
};
export default buidlerConfig;
