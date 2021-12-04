// solhint-disable max-states-count
// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

// library
import { DataTypes } from "../../libraries/types/DataTypes.sol";

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
