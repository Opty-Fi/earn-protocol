// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

contract OPTYStakingRateBalancerStorage {
    /**
     * @notice Active brains of Risk Manager
     */
    address public OPTYStakingRateBalancerImplementation;
    
    /**
     * @notice Pending brains of Risk Manager
     */
    address public pendingOPTYStakingRateBalancerImplementation;

    /// @notice This variable stores the no locking term's staking pool address
    address public stakingPoolNoLockingTerm;
    /// @notice This variable stores the 30 days locking term's staking pool address
    address public stakingPool30DLockingTerm;
    /// @notice This variable stores the 60 days locking term's staking pool address
    address public stakingPool60DLockingTerm;
    /// @notice This variable stores the 180 days locking term's staking pool address
    address public stakingPool180DLockingTerm;

    /// @notice This variable stores active staking pools
    mapping(address => bool) public stakingPools;

    /// @notice This variable stores $OPTY staked in staking pool
    mapping(address => uint256) public stakingPoolToStakedOPTY;

    /// @notice This variable stores $OPTY staked in staking pool per user
    mapping(address => mapping(address => uint256)) public stakingPoolToUserStakedOPTY;

    mapping(address => uint256) public stakingPoolMultipliers;

    uint256 public stakingPoolOPTYAllocation;
}