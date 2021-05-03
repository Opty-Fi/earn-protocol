// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

/**
 * @dev Interface of the Opty.fi staking rate balancer.
 */
interface IOPTYStakingRateBalancer {
    function updateOptyRates() external returns (bool);

    function updateStakedOPTY(address _staker, uint256 _amount) external returns (bool);

    function updateUnstakedOPTY(address _staker, uint256 _shares) external returns (bool);
}
