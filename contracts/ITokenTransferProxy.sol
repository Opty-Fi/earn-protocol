// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

/**
 * @title Interface for TokenTransferProxy
 * @author OptyFi
 */
interface ITokenTransferProxy {
    /**
     * @dev Allows owner of the contract to transfer tokens on user's behalf
     * @dev Stoploss contract will be the owner of this contract
     * @param token Address of the token
     * @param from Address from which tokens will be transferred
     * @param to Receipent address of the tokens
     * @param amount Amount of tokens to transfer
     */
    function transferFrom(
        address token,
        address from,
        address to,
        uint256 amount
    ) external;
}
