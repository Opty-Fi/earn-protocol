// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

/**
 * @title Custo errors for OptyFiSwapper
 * @author OptyFi
 */
library Errors {
    error TokenTransferProxyCall();
    error TransferFromCall();
    error ExternalCallFailure();
    error InsufficientReturn(uint256 expected, uint256 returned);
}
