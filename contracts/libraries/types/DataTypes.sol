// SPDX-License-Identifier: MIT
pragma solidity ^0.6.10;

library DataTypes {
    struct Operation {
        address account;
        bool isDeposit;
        uint256 value;
    }

    struct BlockVaultValue {
        uint256 actualVaultValue;
        uint256 blockMinVaultValue;
        uint256 blockMaxVaultValue;
    }

    struct StrategyStep {
        address pool;
        address outputToken;
        bool isBorrow;
    }

    struct LiquidityPool {
        uint8 rating;
        bool isLiquidityPool;
    }

    struct Strategy {
        uint256 index;
        StrategyStep[] strategySteps;
    }

    struct Token {
        uint256 index;
        address[] tokens;
    }

    struct PoolRate {
        address pool;
        uint8 rate;
    }

    struct PoolAdapter {
        address pool;
        address adapter;
    }

    struct PoolRatingsRange {
        uint8 lowerLimit;
        uint8 upperLimit;
    }

    struct RiskProfile {
        uint256 index;
        uint8 steps;
        PoolRatingsRange[] poolRatingsRange;
        bool exists;
    }

    struct VaultRewardStrategy {
        uint256 hold; //  should be in basis eg: 50% means 5000
        uint256 convert; //  should be in basis eg: 50% means 5000
    }

    enum MaxExposure { Number, Pct }
}
