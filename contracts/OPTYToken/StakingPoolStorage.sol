// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "./../RiskManager.sol";
import "./../StrategyCodeProvider.sol";
import "./../OPTYToken/OPTYMinter.sol";

contract StakingPoolStorage {
    struct StakingState {
        uint32 timestamp;
        uint224 value;
    }
    mapping(address => uint256) userLastUpdate;
    uint256 lastPoolUpdate;
    uint256 optyRatePerBlock;
    address public token; //  store the underlying token contract address (for example DAI)
    uint256 public poolValue;
    OPTYMinter public optyMinterContract;
}
