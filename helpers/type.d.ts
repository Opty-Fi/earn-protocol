import { Contract } from "ethers";

export type ESSENTIAL_CONTRACTS = {
    registry: Contract;
    strategyProvider: Contract;
    harvestCodeProvider: Contract;
    riskManager: Contract;
    strategyManager: Contract;
    opty: Contract;
    optyMinter: Contract;
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
        steps: number;
        poolRating: number[];
    };
};

export type STRATEGIES_DATA = {
    [key: string]: {
        [key: string]: { strategyName: string; strategy: STRATEGY_DATA[] }[];
    };
};
export type STRATEGY_DATA = {
    contract: string;
    outputTokenSymbol: string;
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
    [key: string]: {
        strategyName: string;
        token: string;
        strategy: {
            contract: string;
            outputTokenSymbol: string;
            outputToken: string;
            isBorrow: boolean;
        }[];
    }[];
};
