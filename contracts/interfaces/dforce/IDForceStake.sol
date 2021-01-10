// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface IDForceStake {
    function stake (uint _value) external;
    function withdraw (uint _value) external;
    function exit () external;
    function earned(address _holder) external view returns(uint);
    function balanceOf(address _account) external view returns(uint);
    function getReward() external;
    function decimals() external view returns(uint);
}