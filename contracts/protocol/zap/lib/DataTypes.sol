// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

/**
 * @title Library for custom structs for OptyFiZapper
 * @author OptyFi
 */
library DataTypes {
    /**
     * @param vault address of the vault
     * @param toAmount amount of toToken to receive
     * @param callees array of addresses to call (DEX and token addresses)
     * @param exchangeData calldata to execute on callees
     * @param startIndexes the index of the beginning of each call in exchangeData
     * @param values array of encoded values for each call in exchangeData
     * @param permit ERC2612 permit
     * @param deadline timestamp until which swap may be fulfilled
     * @param accountsProof merkle proof for caller
     */
    struct ZapData {
        address vault;
        uint256 toAmount;
        uint256 deadline;
        bytes exchangeData;
        bytes permit;
        address[] callees;
        uint256[] startIndexes;
        uint256[] values;
        bytes32[] accountsProof;
    }
}
