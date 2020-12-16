// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface ICurveDeposit {
    function add_liquidity (uint[2] calldata amountsIn, uint minAmountOut) external; //Function for every 2token pool.
    function add_liquidity (uint[3] calldata amountsIn, uint minAmountOut) external; //Function for every 3token pool.
    function add_liquidity (uint[4] calldata amountsIn, uint minAmountOut) external; //Function for every 4token pool.
    function remove_liquidity_one_coin (uint amountIn, int128 i, uint minAmountOut, bool donateDust) external;
    function remove_liquidity (uint _amount, uint[2] calldata minAmountOut) external;
    function remove_liquidity (uint _amount, uint[3] calldata minAmountOut) external;
    function remove_liquidity (uint _amount, uint[4] calldata minAmountOut) external;
    function calc_withdraw_one_coin(uint _balance, int128 _tokenIndex) external view returns(uint);
    function token() external view returns(address);
}