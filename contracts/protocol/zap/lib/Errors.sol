// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

/**
 * @title Custom errors for OptyFiZapper
 * @author OptyFi
 */
library Errors {
    /**
     * @notice permit call failed
     */
    error PermitFailed();

    /**
     * @notice input or output token is equal to vault's underlying token
     */
    error InvalidToken();
}
