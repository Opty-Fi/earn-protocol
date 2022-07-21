// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { SwapStorage } from './SwapStorage.sol';
import { SwapInternal } from './SwapInternal.sol';
import { ISwapView } from './ISwapView.sol';

/**
 * @title SwapView facet for OptyFiSwapper diamond
 * @author OptyFi
 * @dev Contains all view functions
 */
contract SwapView is SwapInternal, ISwapView {
    /**
     * @inheritdoc ISwapView
     */
    function tokenTransferProxy()
        external
        view
        override
        returns (address tokenTransferProxy)
    {
        tokenTransferProxy = _tokenTransferProxy();
    }
}
