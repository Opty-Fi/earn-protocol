// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

/**
 * @title Custo errors for OptyFiSwapper
 * @author OptyFi
 */
library Errors {
    /**
     * @notice call to TokenTransferProxy contract
     */
    error TokenTransferProxyCall();

    /**
     * @notice calling TransferFrom
     */
    error TransferFromCall();

    /**
     * @notice external call failed
     */
    error ExternalCallFailure();

    /**
     * @notice returned tokens too few
     */
    error InsufficientReturn();

    /**
     * @notice swapDeadline expired
     */
    error DeadlineBreach();

    /**
     * @notice incorrect ETH amount sent
     */
    error ETHValueMismatch();

    /**
     * @notice expected tokens returned are 0
     */
    error ZeroExpectedReturns();

    /**
     * @notice arrays in SwapData.exchangeData have wrong lengths
     */
    error ExchangeDataArrayMismatch();
}
