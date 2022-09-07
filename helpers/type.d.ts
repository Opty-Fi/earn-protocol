import { BigNumberish, Contract } from "ethers";
import { MockContract } from "@defi-wonderland/smock";

export type ESSENTIAL_CONTRACTS = {
  registry: Contract;
  investStrategyRegistry: Contract;
  strategyProvider: Contract;
  harvestCodeProvider: Contract;
  riskManager: Contract;
  strategyManager: Contract;
  opty: Contract;
  optyDistributor: Contract;
  priceOracle: Contract;
};

export type CONTRACTS = {
  [name: string]: Contract;
};

export type MOCK_CONTRACTS = {
  [name: string]: MockContract<Contract>;
};

export type CONTRACTS_WITH_HASH = {
  [name: string]: { contract: Contract; hash: string };
};

export type DATA_OBJECT = {
  [name: string]: string;
};

export type RISK_PROFILE_DATA = {
  code: number;
  name: string;
  symbol: string;
  canBorrow: boolean;
  poolRating: number[];
}[];

export type REWARD_TOKEN_DATA_OBJECT = {
  [name: string]: {
    [name: string]: string | boolean;
  };
};

export type STRATEGY = {
  strategyName: string;
  token: string;
  strategy: STRATEGY_DATA[];
  riskProfileCode: number;
};

export type STRATEGIES = {
  [key: string]: STRATEGY;
};

export type STRATEGY_DATA = {
  contract: string;
  outputTokenSymbol?: string;
  outputToken: string;
  isBorrow: boolean;
  adapterName?: string;
  protocol?: string;
};

export type DEFI_POOL_DATA = {
  [name: string]: {
    pool: string;
    lpToken: string;
    tokens: string[];
    rewardTokens?: string[];
    stakingVault?: string;
    pid?: string;
    deprecated?: boolean;
  };
};

export type DEFI_POOLS_DATA = {
  [key: string]: DEFI_POOL_DATA;
};

export type ADAPTER_WITH_STRATEGIES_DATA = {
  [key: string]: STRATEGY[];
};

export type TESTING_DEFAULT_DATA = {
  setFunction: string;
  input: any[];
  getFunction: {
    name: string;
    input: any[];
    output: any;
  }[];
};

export type MULTI_ASSET_TOKEN_DATA = {
  [token: string]: {
    address: string;
    path0?: string[];
    path1?: string[];
  };
};

export type CURVE_TOKEN_DATA = {
  [token: string]: {
    address: string;
    pool: string;
    swap?: boolean;
    old?: boolean;
  };
};

export type OPTY_STAKING_VAULT = {
  name: string;
  numberOfDays: string;
  lockTime: number;
  multiplier: number;
};

export type TOKENS_DATA = {
  [name: string]: {
    address: string;
    pair: boolean;
  };
};

export type MULTI_CHAIN_TOKENS_DATA = {
  [key: string]: {
    [name: string]: {
      address: string;
      pair: boolean;
      hash: string;
    };
  };
};

export type TOKEN_STRATEGIES = {
  [token: string]: {
    hash: string;
    underlyingTokens: {
      address: string;
      symbol: string;
      name: string;
    }[];
    steps: {
      protocol: {
        name: string;
        logoURL: string;
      };
      poolContractAddress: string;
      lpToken: string;
      isBorrow: boolean;
      underlyingTokens: string[];
    }[];
  }[];
};

export type NETWORKS_TYPE = "ethereum" | "polygon";

export type CHAINID_NETWORKS = {
  [chainID: string]: {
    name: string;
    network: NETWORKS_TYPE;
  };
};

export type TokenStrategyType = {
  [name: string]: STRATEGIES;
};

export type StrategiesByTokenByChainType = {
  [key: string]: TokenStrategyType;
};

export type StrategyStepType = {
  pool: string;
  outputToken: string;
  isBorrow: boolean;
};

export type StrategyConfigurationParams = {
  registryContract: string;
  vault: string;
  underlyingToken: string;
  initialStepInputAmount: BigNumberish;
  internalTransactionIndex: BigNumberish;
  internalTransactionCount: BigNumberish;
};

export type VaultDetailType = {
  name: string;
  vaultConfig: BigNumberish;
  userDepositCapUT: BigNumberish;
  minimumDepositValueUT: BigNumberish;
  totalValueLockedLimitUT: BigNumberish;
};

export type VaultType = {
  [name: string]: VaultDetailType[];
};

export type MultiChainVaultsType = {
  [key: string]: VaultType;
};

export type PoolRate = {
  pool: string;
  rate: number;
};
