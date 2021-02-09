// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;

/**
 * @dev Interface of the Harvester.
 */
interface IUniswap{
    function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts);
    function getAmountsOut(uint amountIn, address[] memory path) external view returns (uint[] memory amounts);
}