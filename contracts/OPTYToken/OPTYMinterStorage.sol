// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

contract OPTYMinterStorage {
    
    struct OptyState {
        /// @notice The market's last index
        uint224 index;

        /// @notice The block number the index was last updated at
        uint32 block;
    }
    
    uint genesisBlock;
        
    address[] public allOptyPools;
    
    mapping(address => bool) public marketEnabled;
    
    /// @notice The rate at which the flywheel distributes OPTY, per block
    uint public optyTotalRate;

    /// @notice The portion of optyRate that each market currently receives
    mapping(address => uint) public optyPoolRate;
    
    /// @notice The OPTY accrued but not yet transferred to each user
    mapping(address => uint) public optyAccrued;
    
    /// @notice The OPTY market supply state for each optyPool
    mapping(address => OptyState) public optyPoolState;
    
    /// @notice The OPTY index for each market for each user as of the last time they accrued OPTY
    mapping(address => mapping(address => OptyState)) public optyUserStateInPool;
}