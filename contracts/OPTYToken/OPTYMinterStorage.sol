// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

contract OPTYMinterStorage {
    
    struct OptyPoolState {
        /// @notice The market's last index
        uint224 index;

        /// @notice The block number the index was last updated at
        uint32 block;
    }
        
    address[] public allOptyPools;
    
    /// @notice The rate at which the flywheel distributes OPTY, per block
    uint public optyRate;

    /// @notice The portion of optyRate that each market currently receives
    mapping(address => uint) public optySpeeds;
    
    /// @notice The OPTY accrued but not yet transferred to each user
    mapping(address => uint) public optyAccrued;
    
    mapping(address => bool) public marketEnabled;
    
    /// @notice The OPTY market supply state for each optyPool
    mapping(address => OptyPoolState) public optyPoolState;
    
    /// @notice The OPTY index for each market for each user as of the last time they accrued OPTY
    mapping(address => mapping(address => uint)) public optySupplierIndex;
}