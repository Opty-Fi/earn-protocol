// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "./OPTYStakingPool.sol";

contract OPTYMinterStorage {
    OPTYStakingPool optyStakingPool;
    /// @notice The market's last index
    /// @notice The block number the index was last updated at
    struct OptyState {
        uint224 index;
        uint32 timestamp;
    }

    mapping(address => uint256) public optyPoolStartTimestamp;

    address[] public allOptyPools;

    mapping(address => bool) public optyPoolEnabled;

    /// @notice The rate at which the flywheel distributes OPTY, per block
    uint256 public optyTotalRate;

    /// @notice The portion of optyRate that each market currently receives
    mapping(address => uint256) public optyPoolRatePerSecond;

    /// @notice The portion of optyRate that each market currently receives divided by the amount of LP tokens
    mapping(address => uint256) public optyPoolRatePerSecondAndLPToken;

    /// @notice The OPTY accrued but not yet transferred to each user
    mapping(address => uint256) public optyAccrued;

    /// @notice The OPTY market supply state for each optyPool
    mapping(address => OptyState) public optyPoolState;

    /// @notice The OPTY index for each market for each user as of the last time they accrued OPTY
    mapping(address => mapping(address => OptyState)) public optyUserStateInPool;

    mapping(address => mapping(address => uint256)) public lastUserUpdate;
}
