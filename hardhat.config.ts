import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import '@typechain/hardhat';
import 'hardhat-docgen';
import 'hardhat-gas-reporter';
import 'hardhat-spdx-license-identifier';
import 'hardhat-dependency-compiler';
import 'solidity-coverage';

import Dotenv from 'dotenv';

Dotenv.config();

const {
  API_KEY_ETHERSCAN,
  NODE_URL_MAINNET,
  NODE_URL_TESTNET,
  PKEY_MAINNET,
  PKEY_TESTNET,
  REPORT_GAS,
} = process.env;

export default {
  solidity: {
    compilers: [
      {
        version: '0.8.15',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.6.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },

  networks: {
    hardhat: {
      forking: {
        url: NODE_URL_MAINNET,
        blockNumber: 15095000,
      },
    },

    mainnet: {
      url: NODE_URL_MAINNET,
      accounts: [PKEY_MAINNET],
    },

    testnet: {
      url: NODE_URL_TESTNET,
      accounts: [PKEY_TESTNET],
    },
  },

  docgen: {
    clear: true,
    runOnCompile: false,
  },

  dependencyCompiler: {
    paths: ['@uniswap/v2-periphery/contracts/UniswapV2Router02.sol'],
  },

  etherscan: {
    apiKey: API_KEY_ETHERSCAN,
  },

  gasReporter: {
    enabled: REPORT_GAS === 'true',
    currency: 'USD',
    gasPrice: 30,
    coinmarketcap: 'b9cc2ae5-b176-41e8-80b0-095ab7f45f62',
    token: 'ETH',
  },

  spdxLicenseIdentifier: {
    overwrite: false,
    runOnCompile: true,
  },

  typechain: {
    alwaysGenerateOverloads: true,
  },
};
