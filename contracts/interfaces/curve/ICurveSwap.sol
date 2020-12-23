// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface ICurveSwap {
    function calc_token_amount (uint[] calldata amountsIn, bool deposit) external;
    function remove_liquidity_one_coin (uint amountIn, int128 i, uint minAmountOut) external;
    function add_liquidity (uint[2] calldata amountsIn, uint minAmountOut) external; //Function for every 2token pool.
    function add_liquidity (uint[3] calldata amountsIn, uint minAmountOut) external; //Function for every 3token pool.
    function add_liquidity (uint[4] calldata amountsIn, uint minAmountOut) external; //Function for every 4token pool.
    function remove_liquidity (uint _amount, uint[2] calldata minAmountOut) external;
    function remove_liquidity (uint _amount, uint[3] calldata minAmountOut) external;
    function remove_liquidity (uint _amount, uint[4] calldata minAmountOut) external;
}
