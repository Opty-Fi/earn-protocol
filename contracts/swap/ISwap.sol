// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from './DataTypes.sol';

interface ISwap {
    /**
     * @notice performs an arbitrary swap as dictated by _swapData
     * @dev will return any leftover input token
     * @param _swapData the swapData for the swap to be performed
     * @return receivedAmount received amount of output token
     * @return returnedBalance leftover input token
     */
    function swap(DataTypes.SwapData memory _swapData)
        external
        returns (uint256 receivedAmount, uint256 returnedBalance);
}
