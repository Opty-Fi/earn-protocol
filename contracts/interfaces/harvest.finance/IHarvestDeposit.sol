// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface IHarvestDeposit {
    function deposit(uint _amount) external;
    function withdraw(uint _shares) external;
    function getPricePerFullShare() external view returns (uint);
    function underlying() external view returns(address);
    function decimals() external view returns(uint);
} 