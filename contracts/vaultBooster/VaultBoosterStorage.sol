// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

contract VaultBoosterStorage {
    /// @notice The market's last index
    /// @notice The block number the index was last updated at
    struct ODEFIState {
        uint224 index;
        uint32 timestamp;
    }

    address public odefiAddress;

    mapping(address => address) public rewarders;

    mapping(address => uint256) public odefiVaultStartTimestamp;

    address[] public allOdefiVaults;

    mapping(address => bool) public odefiVaultEnabled;

    /// @notice The rate at which the flywheel distributes ODEFI, per block
    uint256 public odefiTotalRate;

    /// @notice The portion of odefiRate that each market currently receives
    mapping(address => uint256) public odefiVaultRatePerSecond;

    /// @notice The portion of odefiRate that each market currently receives divided by the amount of LP tokens
    mapping(address => uint256) public odefiVaultRatePerSecondAndVaultToken;

    /// @notice The ODEFI accrued but not yet transferred to each user
    mapping(address => uint256) public odefiAccrued;

    /// @notice The ODEFI market supply state for each pool
    mapping(address => ODEFIState) public odefiVaultState;

    /// @notice The ODEFI index for each market for each user as of the last time they accrued ODEFI
    mapping(address => mapping(address => ODEFIState)) public odefiUserStateInVault;

    mapping(address => mapping(address => uint256)) public lastUserUpdate;
}
