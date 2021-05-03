// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

contract RegistryAdminStorage {
    /**
     * @notice Governance of optyfi's earn protocol
     */
    address public governance;

    /**
     * @notice Operator of optyfi's earn protocol
     */
    address public operator;

    /**
     * @notice Strategist for this contract
     */
    address public strategist;

    /**
     * @notice Treasury for this contract
     */
    address public treasury;

    /**
     * @notice Minter for OPTY token
     */
    address public minter;

    /**
     * @notice Pending governance for optyfi's earn protocol
     */
    address public pendingGovernance;

    /**
     * @notice Active brains of Registry
     */
    address public registryImplementation;

    /**
     * @notice Pending brains of Registry
     */
    address public pendingRegistryImplementation;
}

contract Structs {
    struct StrategyStep {
        address pool;
        address outputToken;
        bool isBorrow;
    }
    
    struct VaultRewardStrategy {
        uint256 hold;   //  should be in basis eg: 50% means 5000
        uint256 convert;    //  should be in basis eg: 50% means 5000
    }
    
    struct VaultRewardToken {
        address vault;
        address rewardToken;
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
}

contract RegistryStorage is RegistryAdminStorage, Structs {
    bytes32[] public strategyHashIndexes;
    bytes32[] public tokensHashIndexes;

    mapping(address => bool) public tokens;
    mapping(bytes32 => Token) public tokensHashToTokens;
    mapping(address => LiquidityPool) public liquidityPools;
    mapping(address => LiquidityPool) public creditPools;
    mapping(bytes32 => Strategy) public strategies;
    mapping(bytes32 => bytes32[]) public tokenToStrategies;
    mapping(address => mapping(address => bytes32)) public liquidityPoolToTokenHashes;
    mapping(address => address) public liquidityPoolToAdapter;
    mapping(address => mapping(string => address)) public underlyingTokenToRPToVaults;
    mapping(address => bool) public vaultToDiscontinued;
    mapping(address => bool) public vaultToPaused;
    string[] public riskProfilesArray;
    mapping(string => RiskProfile) public riskProfiles;
    // mapping(bytes32 => bytes32) public vaultRewardTokenHashToVaultRewardStrategyHash;
    // mapping(bytes32 => VaultRewardToken) public vaultRewardTokenHashToVaultRewardToken;
    // mapping(bytes32 => VaultRewardStrategy) public vaultRewardStrategies;
}
