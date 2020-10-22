// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface ICurveSwap {
    function calc_token_amount (uint[] calldata amountsIn, bool deposit) external;
}