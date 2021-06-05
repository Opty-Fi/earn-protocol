// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

library DataTypes {
    struct UserDepositOperation {
        address account;
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
        uint8 lowerLimit;
        uint8 upperLimit;
        bool exists;
    }

    struct VaultRewardStrategy {
        uint256 hold; //  should be in basis eg: 50% means 5000
        uint256 convert; //  should be in basis eg: 50% means 5000
    }

    enum MaxExposure { Number, Pct }

    enum DefaultStrategyState { Zero, CompoundOrAave }

    /// @notice The market's last index
    /// @notice The block number the index was last updated at
    struct ODEFIState {
        uint224 index;
        uint32 timestamp;
    }

    struct TreasuryShare {
        address treasury;
        uint256 share; //  should be in basis eg: 5% means 500
    }

    struct VaultConfiguration {
        bool discontinued;
        bool unpaused;
        uint256 withdrawalFee; //  should be in basis eg: 15% means 1500
        TreasuryShare[] treasuryShares;
    }

    struct StrategyConfiguration {
        address vaultStepInvestStrategyDefinitionRegistry;
        address strategyProvider;
        address aprOracle;
    }

    struct VaultStrategyConfiguration {
        address strategyManager;
        address riskManager;
        address optyMinter;
        address operator;
    }
}
