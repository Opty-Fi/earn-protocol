// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface IYearn {
    function deposit(uint _amount) external;
    function withdraw(uint _shares) external;
    function getPricePerFullShare() external view returns (uint);
    function token() external view returns(address);
}