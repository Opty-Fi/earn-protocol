// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

interface ISwapView {
    /**
     * @notice returns address of the TokenTransferProxy
     * @return tokenTransferProxy address
     */
    function tokenTransferProxy()
        external
        view
        returns (address tokenTransferProxy);
}
