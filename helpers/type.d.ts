import { Contract } from "ethers";

export type ESSENTIAL_CONTRACTS = {
  registry: Contract;
  vaultStepInvestStrategyDefinitionRegistry: Contract;
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

export type CONTRACTS_WITH_HASH = {
  [name: string]: { contract: Contract; hash: string };
};

export type DATA_OBJECT = {
  [name: string]: string;
};

export type RISK_PROFILE_DATA = {
  [key: string]: {
    name: string;
    canBorrow: boolean;
    poolRating: number[];
  };
};

export type REWARD_TOKEN_DATA_OBJECT = {
  [name: string]: {
    [name: string]: string | boolean;
  };
};

export type STRATEGY = {
  strategyName: string;
  token: string;
  strategy: STRATEGY_DATA[];
};

export type STRATEGY_DATA = {
  contract: string;
  outputTokenSymbol?: string;
  outputToken: string;
  isBorrow: boolean;
};

export type DEFI_POOLS_DATA = {
  [key: string]: {
    [name: string]: {
      pool: string;
      lpToken: string;
      tokens: string[];
    };
  };
};

export type ADAPTER_WITH_STRATEGIES_DATA = {
  [key: string]: STRATEGY[];
};
