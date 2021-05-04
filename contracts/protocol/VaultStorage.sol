// solhint-disable max-states-count
// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import { RiskManager } from "./../RiskManager.sol";
import { StrategyManager } from "./../StrategyManager.sol";
import { OPTYMinter } from "./../OPTYToken/OPTYMinter.sol";
import { DataTypes } from "../libraries/types/DataTypes.sol";

contract VaultStorage {
    mapping(uint256 => DataTypes.Operation) public queue;
    mapping(address => uint256) public pendingDeposits;
    mapping(address => uint256) public pendingWithdraws;
    mapping(uint256 => DataTypes.BlockVaultValue[]) public blockToBlockVaultValues;
    StrategyManager public strategyManagerContract;
    RiskManager public riskManagerContract;
    OPTYMinter public optyMinterContract;
    bytes32 public constant ZERO_BYTES32 = 0x0000000000000000000000000000000000000000000000000000000000000000;
    uint256 public first = 1;
    uint256 public last = 0;
    uint256 public withdrawalFee = 50;
    uint256 public constant WITHDRAWAL_MAX = 10000;
    bytes32 public investStrategyHash;
    uint256 public vaultValue;
    uint256 public gasOwedToOperator;
    uint256 public depositQueue;
    uint256 public withdrawQueue;
    uint256 public maxVaultValueJump; // basis points
    address public underlyingToken; //  store the underlying token contract address (for example DAI)
    string public profile;
}
