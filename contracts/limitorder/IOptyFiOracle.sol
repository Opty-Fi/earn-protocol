// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

interface IOptyFiOracle {
    /**
     * @notice returns price of tokenA in terms of tokenB
     * @param tokenA address of tokenA
     * @param tokenB address of tokenB
     * @return uint256 price of tokenA in terms of tokenB
     */
    function getTokenPrice(address tokenA, address tokenB)
        external
        view
        returns (uint256);
}
