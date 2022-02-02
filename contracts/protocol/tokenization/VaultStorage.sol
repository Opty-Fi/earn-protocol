// solhint-disable max-states-count
// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

// library
import { DataTypes } from "../../protocol/earn-protocol-configuration/contracts/libraries/types/DataTypes.sol";

/**
 * @title Vault state that can change
 * @author opty.fi
 * @dev The storage contract for opty.fi's interest bearing vault token
 */

contract VaultStorage {
    /**
     * @dev A list to maintain sequence of unprocessed deposits
     */
    DataTypes.UserDepositOperation[] public queue;

    /**
     * @dev Mapping of user account who has not received shares against deposited amount
     */
    mapping(address => uint256) public pendingDeposits;

    /**
     * @dev Mapping of user account against total deposited amount
     */
    mapping(address => uint256) public totalDeposits;

    /**
     * @dev Map the underlying token in vault to the current block for emergency brakes
     */
    mapping(uint256 => DataTypes.BlockVaultValue[]) public blockToBlockVaultValues;

    /**
     * @dev Current vault invest strategy
     */
    bytes32 public investStrategyHash;

    /**
     * @dev Operational cost for rebalance owed by the vault to operator
     */
    uint256 public gasOwedToOperator;

    /**
     * @dev Total amount of unprocessed deposit till next rebalance
     */
    uint256 public depositQueue;

    /**
     * @dev The standard deviation allowed for vault value
     */
    uint256 public maxVaultValueJump; // basis points

    /**
     * @dev store the underlying token contract address (for example DAI)
     */
    address public underlyingToken;

    /**
     * @dev The risk profile code of the vault
     */
    uint256 public riskProfileCode;

    /**
     * @dev The pricePerShare of the vault
     */
    uint256 public pricePerShareWrite;

    /**
     * @notice Log an event when user calls user deposit underlying asset without rebalance
     * @dev the shares are not minted until next rebalance
     * @param sender the account address of the user
     * @param index the position of user in the queue
     * @param amount the amount of underlying asset deposit
     */
    event DepositQueue(address indexed sender, uint256 indexed index, uint256 indexed amount);
}

contract VaultStorageV2 is VaultStorage {
    /**
     * @notice users allowed to interact with vault if whitelisted
     */
    mapping(address => bool) public whitelistedEOA;

    /**
     * @notice smart contract allowed to interact with vault if whitelisted
     */
    mapping(address => bool) public whitelistedCA;

    /**@notice Configuration params of the vault*/
    DataTypes.VaultConfigurationV2 public vaultConfiguration;

    /**
     * @dev Emitted when Discontinue over vault is activated
     * @param discontinued Discontinue status (true) of OptyFi's Vault contract
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogDiscontinue(bool indexed discontinued, address indexed caller);

    /**
     * @notice Emitted when Pause over vault is activated/deactivated
     * @param unpaused Unpause status of OptyFi's Vault contract - false (if paused) and true (if unpaused)
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogUnpause(bool indexed unpaused, address indexed caller);

    /**
     * @notice Emitted when setLimitStatus is called
     * @param allowWhitelistedState Whitelisted state of OptyFi's Vault contract - false (if not ) and true (if limited)
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogAllowWhitelistedState(bool indexed allowWhitelistedState, address indexed caller);

    /**
     * @notice Emitted when setUserDepositCapUT is called
     * @param userDepositCapUT Cap in underlying for user deposits in OptyFi's Vault contract
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogUserDepositCapUT(uint256 indexed userDepositCapUT, address indexed caller);

    /**
     * @notice Emitted when setMinimumDepositAmount is called
     * @param minimumDepositValueUT Minimum deposit in OptyFi's Vault contract - only for deposits (without rebalance)
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogMinimumDepositValueUT(uint256 indexed minimumDepositValueUT, address indexed caller);

    /**
     * @notice Emitted when setTotalValueLockedLimitUT is called
     * @param totalValueLockedLimitUT Maximum limit for total value locked of OptyFi's Vault contract
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogTotalValueLockedLimitUT(uint256 indexed totalValueLockedLimitUT, address indexed caller);

    /**
     * @notice Emitted when setQueueCap is called
     * @param queueCap Maximum queue length in OptyFi's Vault contract
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogQueueCap(uint256 indexed queueCap, address indexed caller);
}
