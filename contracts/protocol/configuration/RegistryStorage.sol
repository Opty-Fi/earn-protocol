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
     * @notice Finance operator of optyfi's earn protocol
     * @dev Handle functions having withdrawal fee, treasury and finance related logic
     */
    address public financeOperator;

    /**
     * @notice Risk operator of optyfi's earn protocol
     * @dev Handle functions for maintaining the risk profiles and rating of liquidity/credit pools
     */
    address public riskOperator;

    /**
     * @notice Strategy operator of optyfi's earn protocol
     * @dev Handle functions related to strategies/vault strategies to be used
     */
    address public strategyOperator;

    /**
     * @notice Operator of optyfi's earn protocol
     */
    address public operator;

    /**
     * @notice Treasury of optyfi's earn protocol
     */
    address public treasury;

    /**
     * @notice Distributor for OPTY token
     */
    address public optyDistributor;

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
     * @notice notify when transfer operation of financeOperator occurs
     * @param financeOperator address of Finance operator of optyfi's earn protocol
     * @param caller address of user who has called the respective function to trigger this event
     */
    event TransferFinanceOperator(address indexed financeOperator, address indexed caller);

    /**
     * @notice notify when transfer operation of riskOperator occurs
     * @param riskOperator address of Risk operator of optyfi's earn protocol
     * @param caller address of user who has called the respective function to trigger this event
     */
    event TransferRiskOperator(address indexed riskOperator, address indexed caller);

    /**
     * @notice notify when transfer operation of strategyOperator occurs
     * @param strategyOperator address of Strategy operator of optyfi's earn protocol
     * @param caller address of user who has called the respective function to trigger this event
     */
    event TransferStrategyOperator(address indexed strategyOperator, address indexed caller);

    /**
     * @notice notify when transfer operation of operator occurs
     * @param operator address of Operator of optyfi's earn protocol
     * @param caller address of user who has called the respective function to trigger this event
     */
    event TransferOperator(address indexed operator, address indexed caller);

    /**
     * @notice notify when transfer operation of treasury occurs
     * @param treasury address of Treasury of optyfi's earn protocol
     * @param caller address of user who has called the respective function to trigger this event
     */
    event TransferTreasury(address indexed treasury, address indexed caller);

    /**
     * @notice notify when transfer operation of optyDistributor occurs
     * @param optyDistributor address of Opty distributor of optyfi's earn protocol
     * @param caller address of user who has called the respective function to trigger this event
     */
    event TransferOPTYDistributor(address indexed optyDistributor, address indexed caller);
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
     * @notice underlying asset (token address's hash) mapped to riskProfileCode and vault contract
     *         address for keeping track of all the vault contracts
     */
    mapping(bytes32 => mapping(uint256 => address)) public underlyingAssetHashToRPToVaults;

    /**
     * @dev riskProfileCode mapped to its struct `RiskProfile`
     */
    mapping(uint256 => DataTypes.RiskProfile) internal riskProfiles;

    /**
     * @notice vault contract address mapped to VaultConfiguration
     */
    mapping(address => DataTypes.VaultConfiguration) public vaultToVaultConfiguration;

    /**
     * @notice withdrawal fee's range
     */
    DataTypes.WithdrawalFeeRange public withdrawalFeeRange;

    /**
     * @notice List of all the tokenHashes
     */
    bytes32[] public tokensHashIndexes;

    /**
     * @notice List of all the riskProfiles
     */
    uint256[] public riskProfilesArray;

    /**
     * @notice strategyProvider contract address
     */
    address public strategyProvider;

    /**
     * @notice investStrategyRegistry contract address
     */
    address public investStrategyRegistry;

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

    /**
     * @notice OD vaultBooster contract address
     */
    address public odefiVaultBooster;

    /**
     * @notice Emitted when token is approved or revoked
     * @param token Underlying Token's address which is approved or revoked
     * @param enabled Token is approved (true) or revoked (false)
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogToken(address indexed token, bool indexed enabled, address indexed caller);

    /**
     * @notice Emitted when pool is approved or revoked as liquidity pool
     * @param pool Liquidity Pool's address which is approved or revoked
     * @param enabled Liquidity Pool is approved (true) or revoked (false)
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogLiquidityPool(address indexed pool, bool indexed enabled, address indexed caller);

    /**
     * @notice Emitted when pool is approved or revoked as credit pool
     * @param pool Credit Pool's address which is approved or revoked
     * @param enabled Credit pool is approved (true) or revoked (false)
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogCreditPool(address indexed pool, bool indexed enabled, address indexed caller);

    /**
     * @notice Emitted when liquidity pool is rated
     * @param pool Liquidity Pool's address which is rated
     * @param rate Rating of Liquidity Pool set
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogRateLiquidityPool(address indexed pool, uint8 indexed rate, address indexed caller);

    /**
     * @notice Emitted when credit pool is rated
     * @param pool Credit Pool's address which is rated
     * @param rate Rating of Credit Pool set
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogRateCreditPool(address indexed pool, uint8 indexed rate, address indexed caller);

    /**
     * @notice Emitted when liquidity pool pool is assigned to adapter
     * @param pool Liquidity Pool's address which is mapped to the adapter
     * @param adapter Address of the respective OptyFi's defi-adapter contract which is mapped to the Liquidity Pool
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogLiquidityPoolToAdapter(address indexed pool, address indexed adapter, address indexed caller);

    /**
     * @notice Emitted when tokens are assigned to tokensHash
     * @param tokensHash Hash of the token/list of tokens mapped to the provided token/list of tokens
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogTokensToTokensHash(bytes32 indexed tokensHash, address indexed caller);

    /**
     * @dev Emitted when Discontinue over vault is activated
     * @param vault OptyFi's Vault contract address which is discontinued from being operational
     * @param discontinued Discontinue status (true) of OptyFi's Vault contract
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogDiscontinueVault(address indexed vault, bool indexed discontinued, address indexed caller);

    /**
     * @notice Emitted when Pause over vault is activated/deactivated
     * @param vault OptyFi's Vault contract address which is temporarily paused or unpaused
     * @param unpaused Unpause status of OptyFi's Vault contract - false (if paused) and true (if unpaused)
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogUnpauseVault(address indexed vault, bool indexed unpaused, address indexed caller);

    /**
     * @notice Emitted when setUnderlyingAssetHashToRPToVaults function is called
     * @param underlyingAssetHash Underlying token's hash mapped to risk profile and OptyFi's Vault contract address
     * @param riskProfileCode Risk Profile Code used to map Underlying token hash and OptyFi's Vault contract address
     * @param vault OptyFi's Vault contract address
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogUnderlyingAssetHashToRPToVaults(
        bytes32 indexed underlyingAssetHash,
        uint256 indexed riskProfileCode,
        address indexed vault,
        address caller
    );

    /**
     * @notice Emitted when RiskProfile is added
     * @param index Index of an array at which risk profile is added
     * @param exists Status of risk profile if it exists (true) or not (false)
     * @param canBorrow Borrow is allowed (true) or not (false) for the specified risk profile
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogRiskProfile(uint256 indexed index, bool indexed exists, bool indexed canBorrow, address caller);

    /**
     * @notice Emitted when Risk profile is added/updated
     * @param index Index of an array at which risk profile is added or updated
     * @param lowerLimit Lower limit of the pool for the specified risk profile
     * @param upperLimit Upper limit of the pool for the specified risk profile
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogRPPoolRatings(uint256 indexed index, uint8 indexed lowerLimit, uint8 indexed upperLimit, address caller);
}
