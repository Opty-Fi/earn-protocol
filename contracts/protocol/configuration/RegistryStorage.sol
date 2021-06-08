/* solhint-disable max-states-count */
// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

//  libraries
import { DataTypes } from "../../libraries/types/DataTypes.sol";

/**
 * @title RegistryAdminStorage Contract
 * @author Opty.fi
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
     * @notice Change minter of protocol
     */
    event TransferOPTYMinter(address indexed minter, address indexed caller);
}

/**
 * @title RegistryStorage Contract
 * @author Opty.fi
 * @dev Contract used to store registry's contract state variables and events
 */
contract RegistryStorage is RegistryAdminStorage {
    /**
     * @notice token address status which are approved or not
     */
    mapping(address => bool) public tokens;

    /**
     * @notice token data mapped to token/tokens address/addresses hash
     */
    mapping(bytes32 => DataTypes.Token) public tokensHashToTokens;

    /**
     * @notice liquidityPool address mapped to its struct having `pool`, `outputToken`, `isBorrow`
     */
    mapping(address => DataTypes.LiquidityPool) public liquidityPools;

    /**
     * @notice creaditPool address mapped to its struct having `pool`, `outputToken`, `isBorrow`
     */
    mapping(address => DataTypes.LiquidityPool) public creditPools;

    /**
     * @notice liquidityPool address mapped to its adapter
     */
    mapping(address => address) public liquidityPoolToAdapter;

    /**
     * @notice underlying asset (token address's hash) mapped to riskProfile and vault contract
     *         address for keeping track of all the vault contracts
     */
    mapping(bytes32 => mapping(string => address)) public underlyingAssetHashToRPToVaults;

    /**
     * @notice riskProfile mapped to its struct `RiskProfile`
     */
    mapping(string => DataTypes.RiskProfile) public riskProfiles;

    /**
     * @notice vault contract address mapped to VaultConfiguration
     */
    mapping(address => DataTypes.VaultConfiguration) public vaultToVaultConfiguration;

    /**
     * @notice List of all the tokenHashes
     */
    bytes32[] public tokensHashIndexes;

    /**
     * @notice List of all the riskProfiles
     */
    string[] public riskProfilesArray;

    /**
     * @notice strategyProvider contract address
     */
    address public strategyProvider;

    /**
     * @notice vaultStepInvestStrategyDefinitionRegistry contract address
     */
    address public vaultStepInvestStrategyDefinitionRegistry;

    /**
     * @notice riskManager contract address
     */
    address public riskManager;

    /**
     * @notice harvestCodeProvider contract address
     */
    address public harvestCodeProvider;

    /**
     * @notice strategyManager contract address
     */
    address public strategyManager;

    /**
     * @notice priceOracle contract address
     */
    address public priceOracle;

    /**
     * @notice opty contract address
     */
    address public opty;

    /**
     * @notice aprOracle contract address
     */
    address public aprOracle;

    /**
     * @notice optyStakingRateBalancer contract address
     */
    address public optyStakingRateBalancer;
    address public odefiVaultBooster;

    /**
     * @notice Emitted when token is approved or revoked
     */
    event LogToken(address indexed token, bool indexed enabled, address indexed caller);

    /**
     * @notice Emitted when pool is approved or revoked
     */
    event LogLiquidityPool(address indexed pool, bool indexed enabled, address indexed caller);

    /**
     * @notice Emitted when credit pool is approved or revoked
     */
    event LogCreditPool(address indexed pool, bool indexed enabled, address indexed caller);

    /**
     * @notice Emitted when pool is rated
     */
    event LogRateLiquidityPool(address indexed pool, uint8 indexed rate, address indexed caller);

    /**
     * @notice Emitted when pool is rated
     */
    event LogRateCreditPool(address indexed pool, uint8 indexed rate, address indexed caller);

    /**
     * @notice Emitted when hash strategy is scored
     */
    event LogScoreStrategy(address indexed caller, bytes32 indexed hash, uint8 indexed score);

    /**
     * @notice Emitted when liquidity pool pool is assigned to adapter
     */
    event LogLiquidityPoolToDepositToken(address indexed pool, address indexed adapter, address indexed caller);

    /**
     * @notice Emitted when tokens are assigned to tokensHash
     */
    event LogTokensToTokensHash(bytes32 indexed _tokensHash, address indexed caller);

    /**
     * @dev Emitted when Discontinue over vault is activated
     */
    event LogDiscontinueVault(address indexed vault, bool indexed discontinued, address indexed caller);

    /**
     * @notice Emitted when Pause over vault is activated/deactivated
     */
    event LogUnpauseVault(address indexed vault, bool indexed unpaused, address indexed caller);

    /**
     * @notice Emitted when setUnderlyingAssetHashToRPToVaults function is called
     */
    event LogUnderlyingAssetHashToRPToVaults(
        bytes32 indexed underlyingAssetHash,
        string indexed riskProfile,
        address indexed vault,
        address caller
    );

    /**
     * @notice Emitted when RiskProfile is added
     */
    event LogRiskProfile(uint256 indexed index, bool indexed exists, uint8 indexed steps, address caller);

    /**
     * @notice Emitted when Risk profile is set
     */
    event LogRPPoolRatings(uint256 indexed index, uint8 indexed lowerLimit, uint8 indexed upperLimit, address caller);
}
