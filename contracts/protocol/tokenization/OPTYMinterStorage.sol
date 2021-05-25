// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import { OPTYStakingVault } from "./OPTYStakingVault.sol";

/**
 * @dev Contract to store the OPTYMinter's state variables
 */

contract OPTYMinterStorage {
    mapping(address => bool) public stakingVaults;
    /// @notice The market's last index
    /// @notice The block number the index was last updated at
    struct OptyState {
        uint224 index;
        uint32 timestamp;
    }

    address public optyAddress;

    mapping(address => uint256) public optyVaultStartTimestamp;

    address[] public allOptyVaults;

    mapping(address => bool) public optyVaultEnabled;

    /// @notice The rate at which the flywheel distributes OPTY, per block
    uint256 public optyTotalRate;

    /// @notice The portion of optyRate that each market currently receives
    mapping(address => uint256) public optyVaultRatePerSecond;

    /// @notice The portion of optyRate that each market currently receives divided by the amount of LP tokens
    mapping(address => uint256) public optyVaultRatePerSecondAndVaultToken;

    /// @notice The OPTY accrued but not yet transferred to each user
    mapping(address => uint256) public optyAccrued;

    /// @notice The OPTY market supply state for each optyPool
    mapping(address => OptyState) public optyVaultState;

    /// @notice The OPTY index for each market for each user as of the last time they accrued OPTY
    mapping(address => mapping(address => OptyState)) public optyUserStateInVault;

    mapping(address => mapping(address => uint256)) public lastUserUpdate;

    uint256 public operatorUnlockClaimOPTYTimestamp;
}
