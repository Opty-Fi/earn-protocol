// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface ICurveDeposit {
    function add_liquidity(uint256[2] calldata amountsIn, uint256 minAmountOut) external; //Function for every 2token pool.

    function add_liquidity(uint256[3] calldata amountsIn, uint256 minAmountOut) external; //Function for every 3token pool.

    function add_liquidity(uint256[4] calldata amountsIn, uint256 minAmountOut) external; //Function for every 4token pool.

    function remove_liquidity_one_coin(
        uint256 amountIn,
        int128 i,
        uint256 minAmountOut,
        bool donateDust
    ) external;

    function remove_liquidity(uint256 _amount, uint256[2] calldata minAmountOut) external;

    function remove_liquidity(uint256 _amount, uint256[3] calldata minAmountOut) external;

    function remove_liquidity(uint256 _amount, uint256[4] calldata minAmountOut) external;

    function calc_withdraw_one_coin(uint256 _balance, int128 _tokenIndex) external view returns (uint256);

    function token() external view returns (address);
}
