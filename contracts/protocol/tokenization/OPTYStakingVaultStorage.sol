// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

/**
 * @title Staking vault state that can change
 * @author opty.fi
 * @dev The storage contract for $OPTY token's staking vault
 */

contract OPTYStakingVaultStorage {
    /**
     * @dev Persist the timestamp of user's latest update to staking vault
     *      when staking and unstaking $OPTY
     */
    mapping(address => uint256) public userLastUpdate;

    /**
     * @dev Persist the timestamp when vault is updated
     */
    uint256 public lastPoolUpdate;

    /**
     * @dev Store the rate at which $OPTY is accrued
     */
    uint256 public optyRatePerSecond;

    /**
     * @dev Store the $OPTY token's address
     */
    address public token;

    /**
     * @dev Store the period in seconds for which $OPTY tokens will be locked
     */
    uint256 public timelockPeriod;
}
