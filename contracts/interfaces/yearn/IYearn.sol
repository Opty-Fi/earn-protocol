// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface IYearn {
    function deposit(uint _amount) external;
    function withdraw(uint _shares) external;
    function getPricePerFullShare() external view returns (uint);
    function token() external view returns(address);
    function decimals() external view returns (uint);
    function calcPoolValueInToken() external view returns (uint);
    function balance() external view returns (uint);
}