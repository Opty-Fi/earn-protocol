// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

//  libraries
import { DataTypes } from "../../libraries/types/DataTypes.sol";

/**
 * @title VaultBoosterStorage Contract
 * @author Opty.fi
 * @notice Contract stores VaultBooster's state variables data
 */
contract ODEFIVaultBoosterStorage {
    /** @notice ODEFI token address */
    address public odefiAddress;

    /** @notice Mapping ODEFI vault address to ODEFI community address */
    mapping(address => address) public rewarders;

    /** @notice Mapping of ODEFI vault address to first interaction timestamp */
    mapping(address => uint256) public odefiVaultStartTimestamp;

    /** @notice List of all ODEFI vaults */
    address[] public allOdefiVaults;

    /** @notice If the ODEFI vault is enabled or not */
    mapping(address => bool) public odefiVaultEnabled;

    /** @notice The rate at which the flywheel distributes ODEFI, per block */
    uint256 public odefiTotalRate;

    /** @notice The portion of odefiRate that each market currently receives */
    mapping(address => uint256) public odefiVaultRatePerSecond;

    /** @notice The portion of odefiRate that each market currently receives divided by the amount of LP tokens */
    mapping(address => uint256) public odefiVaultRatePerSecondAndVaultToken;

    /** @notice The ODEFI accrued but not yet transferred to each user */
    mapping(address => uint256) public odefiAccrued;

    /** @notice The ODEFI market supply state for each pool */
    mapping(address => DataTypes.RewardsState) public odefiVaultState;

    /** @notice The ODEFI index for each market for each user as of the last time they accrued ODEFI */
    mapping(address => mapping(address => DataTypes.RewardsState)) public odefiUserStateInVault;

    /** @notice Mapping of ODEFI vault address to user address to user last interaction timestamp */
    mapping(address => mapping(address => uint256)) public lastUserUpdate;
}
