// solhint-disable max-states-count
// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import { DataTypes } from "../../libraries/types/DataTypes.sol";

contract VaultStorage {
    DataTypes.Operation[] public queue;
    mapping(address => uint256) public pendingDeposits;
    mapping(address => uint256) public pendingWithdraws;
    mapping(uint256 => DataTypes.BlockVaultValue[]) public blockToBlockVaultValues;
    bytes32 public constant ZERO_BYTES32 = 0x0000000000000000000000000000000000000000000000000000000000000000;
    bytes32 public investStrategyHash;
    uint256 public vaultValue;
    uint256 public gasOwedToOperator;
    uint256 public depositQueue;
    uint256 public withdrawQueue;
    uint256 public maxVaultValueJump; // basis points
    address public underlyingToken; //  store the underlying token contract address (for example DAI)
    string public profile;

    event DepositQueue(address indexed sender, uint256 indexed index, uint256 indexed amount);
    event WithdrawQueue(address indexed sender, uint256 indexed index, uint256 indexed amount);
}
