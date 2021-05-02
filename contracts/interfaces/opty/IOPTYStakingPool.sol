// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

/**
 * @dev Interface of the Opty.fi staking pool.
 */
interface IOPTYStakingPool {
    function setOptyRatePerBlock(uint256 _rate) external returns (bool _success);
}