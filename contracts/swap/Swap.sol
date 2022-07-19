// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from './DataTypes.sol';
import { ISwap } from './ISwap.sol';
import { SwapInternal } from './SwapInternal.sol';

/**
 * @title Swap facet for OptyFiSwapper
 * @author OptyFi
 * @dev contains swapping functions
 */
contract Swap is SwapInternal, ISwap {
    /**
     * @inheritdoc ISwap
     */
    function swap(DataTypes.SwapData memory _swapData)
        external
        payable
        returns (uint256 receivedAmount, uint256 returnedBalance)
    {
        _canSwap(_swapData);
        receivedAmount = _doSimpleSwap(_swapData);
        returnedBalance = _retrieveTokens(
            _swapData.fromToken,
            payable(msg.sender)
        );
    }
}
