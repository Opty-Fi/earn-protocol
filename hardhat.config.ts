import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import '@typechain/hardhat';
import * as tdly from '@tenderly/hardhat-tenderly';
import 'hardhat-docgen';
import 'hardhat-gas-reporter';
import 'hardhat-spdx-license-identifier';
import 'hardhat-dependency-compiler';
import 'hardhat-deploy';
import 'solidity-coverage';
import path from 'path';
import fs from 'fs';

import Dotenv from 'dotenv';

Dotenv.config();
tdly.setup({
  automaticVerifications: false,
});

const SKIP_LOAD = process.env.SKIP_LOAD === 'true';

if (!SKIP_LOAD) {
  ['', 'actions'].forEach((folder) => {
    const tasksPath = path.join(__dirname, 'tasks', folder);
    fs.readdirSync(tasksPath)
      .filter((pth: string | string[]) => pth.includes('.ts'))
      .forEach((task) => {
        require(`${tasksPath}/${task}`);
      });
  });
}

const {
  API_KEY_ETHERSCAN,
  NODE_URL_MAINNET,
  NODE_URL_TESTNET,
  PKEY_MAINNET,
  PKEY_TESTNET,
  REPORT_GAS,
  NODE_URL_TENDERLY,
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
        version: '0.8.11',
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
      {
        version: '0.6.12',
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

    tenderly: {
      url: NODE_URL_TENDERLY,
      accounts: [PKEY_TESTNET],
      chainId: 1,
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

  // spdxLicenseIdentifier: {
  //   overwrite: false,
  //   runOnCompile: false,
  // },

  paths: {
    artifacts: './artifacts',
    cache: './cache',
    sources: './contracts',
    tests: './test',
  },

  typechain: {
    alwaysGenerateOverloads: true,
  },
};
