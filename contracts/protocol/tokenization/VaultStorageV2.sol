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
     * @dev Maximum amount in underlying token allowed to be deposited by user
     */
    uint256 public userDepositCapUT;

    /**
     * @dev Minimum deposit value in underlying token required
     */
    uint256 public minimumDepositValueUT;

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
     * @dev Maximum TVL in underlying token allowed for the vault
     */
    uint256 public totalValueLockedLimitUT;
}

contract VaultStorageV2 is VaultStorage {
    /**
     * @notice accounts allowed to interact with vault if whitelisted
     */
    mapping(address => bool) public whitelistedAccounts;

    /**
     * @notice smart contracts allowed to interact with vault if whitelisted
     */
    mapping(bytes32 => bool) public whitelistedCodes;

    /**
     * @notice underlying tokens's hash
     * @dev keccak256 hash of the underlying tokens and chain id
     */
    bytes32 public underlyingTokensHash;

    /**@notice Configuration params of the vault*/
    DataTypes.VaultConfigurationV2 public vaultConfiguration;

    /**@notice current strategy metadata*/
    DataTypes.StrategyStep[] public investStrategySteps;

    /**@dev cache strategy metadata*/
    DataTypes.StrategyStep[] internal _cacheNextInvestStrategySteps;
}
