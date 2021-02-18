// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "./../RiskManager.sol";
import "./../StrategyCodeProvider.sol";

contract PoolStorage {
    struct Operation {
        address account;
        bool isDeposit;
        uint256 value;
    }

    bytes32 public strategyHash;
    address public token; //  store the underlying token contract address (for example DAI)
    uint256 public poolValue;
    string public profile;
    StrategyCodeProvider public strategyCodeProviderContract;
    RiskManager public riskManagerContract;

    uint256 public first = 1;
    uint256 public last = 0;
    uint256 public depositQueue;
    uint256 public withdrawQueue;
    mapping(uint256 => Operation) public queue;
    mapping(address => uint256) public pendingDeposits;
    mapping(address => uint256) public pendingWithdraws;

    event DepositQueue(address indexed sender, uint256 indexed index, uint256 indexed amount);
    event WithdrawQueue(address indexed sender, uint256 indexed index, uint256 indexed amount);
}
