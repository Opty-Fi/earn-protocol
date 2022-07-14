// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from './DataTypes.sol';
import { ISwap } from './ISwap.sol';
import { SwapInternal } from './SwapInternal.sol';

/**
 * @title Swap facet for OptyFiSwap
 * @author OptyFi
 */

import 'hardhat/console.sol';

contract Swap is SwapInternal, ISwap {
    /**
     * @inheritdoc ISwap
     */
    function swap(DataTypes.SwapData memory _swapData)
        external
        returns (uint256 receivedAmount, uint256 returnedBalance)
    {
        console.log('before swap check');
        _canSwap(_swapData);
        console.log('before simple swap');
        receivedAmount = _doSimpleSwap(_swapData);
        console.log('after simple swap');
        returnedBalance = _retrieveTokens(
            _swapData.fromToken,
            payable(msg.sender)
        );
    }
}
