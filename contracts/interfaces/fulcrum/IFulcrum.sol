// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface IFulcrum {
    function mint(address receiver, uint depositAmount) external;
    function burn(address receiver, uint burnAmount) external;
    function tokenPrice() external view returns (uint);
    function loanTokenAddress() external view returns(address);
    function decimals() external view returns (uint);
    function assetBalanceOf(address holder) external view returns(uint);
}