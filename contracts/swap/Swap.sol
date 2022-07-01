// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from './DataTypes.sol';
import { SwapInternal } from './SwapInternal.sol';

abstract contract Swap is SwapInternal {
    function swap(DataTypes.SwapData memory _swapData) external {
        _canSwap(_swapData);
        _doSimpleSwap(_swapData);
    }
}
