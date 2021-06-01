// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

/**
 * @dev Interface of the Opty.fi staking vault.
 */
interface IOPTYStakingVault {
    function setTimelockPeriod(uint256 _timelock) external returns (bool _success);

    function setToken(address _underlyingToken) external returns (bool _success);

    function setOptyRatePerSecond(uint256 _rate) external returns (bool _success);

    function userStakeAll() external returns (bool);

    function userStake(uint256 _amount) external returns (bool);

    function userUnstakeAll() external returns (bool);

    function userUnstake(uint256 _redeemAmount) external returns (bool);

    function updatePool() external returns (bool _success);

    /**
     * @dev Function to get the underlying token balance of OptyPool Contract
     */
    function balance() external view returns (uint256);

    function getPricePerFullShare() external view returns (uint256);

    function balanceInOpty(address _user) external view returns (uint256);

    function getBlockTimestamp() external view returns (uint256);
}
