// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface ICurveSwap {
    function calc_token_amount (uint[] calldata amountsIn, bool deposit) external;
    function remove_liquidity_one_coin (uint amountIn, int128 i, uint minAmountOut) external;
}
