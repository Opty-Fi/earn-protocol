// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "./../RiskManager.sol";
import "./../StrategyManager.sol";
import "./../OPTYToken/OPTYMinter.sol";

contract VaultStorage {
    struct Operation {
        address account;
        bool isDeposit;
        uint256 value;
    }

    struct BlockVaultValue {
        uint256 actualVaultValue;
        uint256 blockMinVaultValue;
        uint256 blockMaxVaultValue;
    }

    address public constant WETH = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    bytes32 public strategyHash;
    address public underlyingToken; //  store the underlying token contract address (for example DAI)
    uint256 public vaultValue;
    uint256 public gasOwedToOperator;
    string public profile;
    StrategyManager public strategyManagerContract;
    RiskManager public riskManagerContract;
    OPTYMinter public optyMinterContract;

    uint256 public first = 1;
    uint256 public last = 0;
    uint256 public depositQueue;
    uint256 public withdrawQueue;
    mapping(uint256 => Operation) public queue;
    mapping(address => uint256) public pendingDeposits;
    mapping(address => uint256) public pendingWithdraws;
    uint256 public maxVaultValueJump; // basis points
    mapping(uint256 => BlockVaultValue[]) public blockToBlockVaultValues;

    event DepositQueue(address indexed sender, uint256 indexed index, uint256 indexed amount);
    event WithdrawQueue(address indexed sender, uint256 indexed index, uint256 indexed amount);
}
