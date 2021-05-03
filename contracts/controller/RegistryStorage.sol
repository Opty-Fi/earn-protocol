// SPDX-License-Identifier: MIT
pragma solidity ^0.6.10;

import { DataTypes } from "../libraries/types/DataTypes.sol";

/**
 * @dev Contract used to store registry's admin account
 */

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

contract RegistryStorage is RegistryAdminStorage {
    mapping(address => bool) public tokens;
    mapping(bytes32 => DataTypes.Token) public tokensHashToTokens;
    mapping(address => DataTypes.LiquidityPool) public liquidityPools;
    mapping(address => DataTypes.LiquidityPool) public creditPools;
    mapping(bytes32 => DataTypes.Strategy) public strategies;
    mapping(bytes32 => bytes32[]) public tokenToStrategies;
    mapping(address => mapping(address => bytes32)) public liquidityPoolToTokenHashes;
    mapping(address => address) public liquidityPoolToAdapter;
    mapping(address => mapping(string => address)) public underlyingTokenToRPToVaults;
    mapping(address => bool) public vaultToDiscontinued;
    mapping(address => bool) public vaultToPaused;
    mapping(string => DataTypes.RiskProfile) public riskProfiles;
    bytes32[] public strategyHashIndexes;
    bytes32[] public tokensHashIndexes;
    string[] public riskProfilesArray;
}
