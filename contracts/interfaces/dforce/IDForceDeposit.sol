// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface IDForceDeposit {
    function mint(address receiver, uint depositAmount) external;
    function redeem(address receiver, uint redeemAmount) external;
    function getExchangeRate() external view returns (uint);
    function token() external view returns(address);
    function decimals() external view returns(uint);
}