// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

library DataTypes {
    /**
     * @param fromToken address of token to swap from
     * @param toToken address of token to swap to
     * @param fromAmount amount of fromToken to swap
     * @param toAmount amount of toToken to receive
     * @param expectedAmount expected amount of toToken
     * @param callees array of addresses to call (DEX addresses)
     * @param exchangeData calldata to execute on callees
     * @param startIndexes the index of the beginning of each call in exchangeData
     * @param values array of encoded values for each call in exchangeData
     * @param beneficiary the address of the recipient of the swapped returns
     * @param permit ERC2612 permit
     * @param deadline timestamp until which swap may be fulfilled
     */
    struct SwapData {
        address fromToken;
        address toToken;
        uint256 fromAmount;
        uint256 toAmount;
        uint256 expectedAmount;
        address[] callees;
        bytes exchangeData;
        uint256[] startIndexes;
        uint256[] values;
        address payable beneficiary;
        bytes permit;
        uint256 deadline;
    }
}
