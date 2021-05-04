// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import { DataTypes } from "../../libraries/types/DataTypes.sol";

contract VaultBoosterStorage {
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
    mapping(address => DataTypes.ODEFIState) public odefiVaultState;

    /// @notice The ODEFI index for each market for each user as of the last time they accrued ODEFI
    mapping(address => mapping(address => DataTypes.ODEFIState)) public odefiUserStateInVault;

    mapping(address => mapping(address => uint256)) public lastUserUpdate;
}
