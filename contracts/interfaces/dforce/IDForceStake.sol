// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface IDForceStake {
    function stake(uint256 _value) external;

    function withdraw(uint256 _value) external;

    function exit() external;

    function earned(address _holder) external view returns (uint256);

    function balanceOf(address _account) external view returns (uint256);

    function getReward() external;

    function decimals() external view returns (uint256);
}
