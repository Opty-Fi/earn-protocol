// SPDX-License-Identifier: MIT
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { DataTypes } from "../../libraries/types/DataTypes.sol";

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

    /**
     * @notice when transfer operation of protocol occurs
     */
    event TransferOperator(address indexed operator, address indexed caller);

    /**
     * @notice Change strategist of protocol
     */
    event TransferStrategist(address indexed strategist, address indexed caller);

    /**
     * @notice Change minter of protocol
     */
    event TransferMinter(address indexed minter, address indexed caller);

    /**
     * @notice Change treasurer of protocol
     */
    event TransferTreasury(address indexed treasurer, address indexed caller);
}

contract RegistryStorage is RegistryAdminStorage {
    mapping(address => bool) public tokens;
    mapping(bytes32 => DataTypes.Token) public tokensHashToTokens;
    mapping(address => DataTypes.LiquidityPool) public liquidityPools;
    mapping(address => DataTypes.LiquidityPool) public creditPools;
    mapping(address => address) public liquidityPoolToAdapter;
    mapping(bytes32 => mapping(string => address)) public underlyingAssetHashToRPToVaults;
    mapping(string => DataTypes.RiskProfile) public riskProfiles;
    bytes32[] public tokensHashIndexes;
    string[] public riskProfilesArray;
    address public strategyProvider;
    address public vaultStepInvestStrategyDefinitionRegistry;
    mapping(address => DataTypes.VaultConfiguration) public vaultToVaultConfiguration;
    address public aprOracle;

    /**
     * @dev Emitted when `token` is approved or revoked.
     *
     * Note that `token` cannot be zero address or EOA.
     */
    event LogToken(address indexed token, bool indexed enabled, address indexed caller);

    /**
     * @dev Emitted when `pool` is approved or revoked.
     *
     * Note that `pool` cannot be zero address or EOA.
     */
    event LogLiquidityPool(address indexed pool, bool indexed enabled, address indexed caller);

    /**
     * @dev Emitted when credit `pool` is approved or revoked.
     *
     * Note that `pool` cannot be zero address or EOA.
     */
    event LogCreditPool(address indexed pool, bool indexed enabled, address indexed caller);

    /**
     * @dev Emitted when `pool` is rated.
     *
     * Note that `pool` cannot be zero address or EOA.
     */
    event LogRateLiquidityPool(address indexed pool, uint8 indexed rate, address indexed caller);

    /**
     * @dev Emitted when `pool` is rated.
     *
     * Note that `pool` cannot be zero address or EOA.
     */
    event LogRateCreditPool(address indexed pool, uint8 indexed rate, address indexed caller);

    /**
     * @dev Emitted when `hash` strategy is scored.
     *
     * Note that `hash` startegy should exist in {strategyHashIndexes}.
     */
    event LogScoreStrategy(address indexed caller, bytes32 indexed hash, uint8 indexed score);

    /**
     * @dev Emitted when liquidity pool `pool` is assigned to `adapter`.
     *
     * Note that `pool` should be approved in {liquidityPools}.
     */
    event LogLiquidityPoolToDepositToken(address indexed pool, address indexed adapter, address indexed caller);

    /**
     * @dev Emitted when tokens are assigned to `_tokensHash`.
     *
     * Note that tokens should be approved
     */
    event LogTokensToTokensHash(bytes32 indexed _tokensHash, address indexed caller);

    /**
     * @dev Emiited when `Discontinue` over vault is activated
     *
     * Note that `vault` can not be a zero address
     */
    event LogDiscontinueVault(address indexed vault, bool indexed discontinued, address indexed caller);

    /**
     * @dev Emiited when `Pause` over vault is activated/deactivated
     *
     * Note that `vault` can not be a zero address
     */
    event LogUnpauseVault(address indexed vault, bool indexed unpaused, address indexed caller);

    /**
     * @dev Emitted when `setUnderlyingAssetHashToRPToVaults` function is called.
     *
     * Note that `underlyingAssetHash` cannot be zero.
     */
    event LogUnderlyingAssetHashToRPToVaults(
        bytes32 indexed underlyingAssetHash,
        string indexed riskProfile,
        address indexed vault,
        address caller
    );

    /**
     * @dev Emitted when RiskProfile is added
     *
     * Note that `riskProfile` can not be empty
     */
    event LogRiskProfile(uint256 indexed index, bool indexed exists, uint8 indexed steps, address caller);

    /**
     * @dev Emitted when Risk profile is set
     *
     * Note that `riskProfile` can not be empty
     */
    event LogRPPoolRatings(uint256 indexed index, uint8 indexed lowerLimit, uint8 indexed upperLimit, address caller);
}
