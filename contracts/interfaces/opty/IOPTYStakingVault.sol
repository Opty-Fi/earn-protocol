// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

/**
 * @title Interface for the $OPTY staking vault
 * @author opty.fi
 * @notice Containes mix of permissioned and permissionless staking vault methods
 */

interface IOPTYStakingVault {
    /**
     * @notice Initialize the period for the staking $OPTY tokens
     * @dev this function can be accessible to the operator
     * @param _timelock time period in seconds
     * @return _success return true on successful initialization of the timelock
     */
    function setTimelockPeriod(uint256 _timelock) external returns (bool _success);

    /**
     * @notice Function to set the address of the $OPTY token
     * @dev initialize the address of the $OPTY token
     * @param _underlyingToken the address of the $OPTY token
     * @return _success return true if initialization of the staked token address is success
     */
    function setToken(address _underlyingToken) external returns (bool _success);

    /**
     * @notice Set the rate at which $OPTYs are distributed to the stakers per second
     * @param _rate the rate of $OPTY accrual per second
     * @return _success return true on successful initialization of the $OPTY distribution rate/second
     */
    function setOptyRatePerSecond(uint256 _rate) external returns (bool _success);

    /**
     * @notice Stake whole balance of $OPTYs of the user
     * @return bool return true on successful staking of $OPTY
     */
    function userStakeAll() external returns (bool);

    /**
     * @notice Stake amount of $OPTYs of the users
     * @param _amount the amount of $OPTY tokens
     * @return bool return true on successful staking of the $OPTY
     */
    function userStake(uint256 _amount) external returns (bool);

    /**
     * @notice Unstake all of staked $OPTY from the vault
     * @return bool return true on successful unstake of all staked $OPTY
     */
    function userUnstakeAll() external returns (bool);

    /**
     * @notice Unstake amount of the staked $OPTY
     * @param _redeemAmount the amount of staked $OPTY
     * @return bool return true on successful unstake of all staked $OPTY
     */
    function userUnstake(uint256 _redeemAmount) external returns (bool);

    /**
     * @dev Modify the state during stake/unstake of $OPTY
     * @return _success return true on successful vault update
     */
    function updatePool() external returns (bool _success);

    /**
     * @notice Retrieve $OPTY tokens in the vault
     * @dev We can have OPTYs in the vault that are not staked.
     *      Every time we update the vault, we are funding the
     *      vault with new OPTYs that weren't staked by the users.
     *      It is true that the users can't withdraw them,
     *      but they weren't staked.
     * @return uint256 the balance of $OPTY in the vault
     */
    function balance() external view returns (uint256);

    /**
     * @notice Compute the value of $stkOPTY in $OPTY
     * @return uint256 calculated value of $OPTY per stkOPTY
     */
    function getPricePerFullShare() external view returns (uint256);

    /**
     * @notice Compute the amount of $OPTY accrued by staking
     * @param _user the address of the staker
     * @return uint256 accrued $OPTY tokens
     */
    function balanceInOpty(address _user) external view returns (uint256);

    /**
     * @dev Retrieve the time elapsed since epoch
     * @return uint256 time in seconds
     */
    function getBlockTimestamp() external view returns (uint256);
}
