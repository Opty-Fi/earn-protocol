// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

import '@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol';

/**
 * @title DataTypes for Limit Orders
 * @author OptyFi
 */
library DataTypes {
    /**
     * @notice encapsulate a limit order
     * @param priceTarget the price target at which the limit order can execute
     * @param liquidationShare the proportion of the investment to be liquidated in basis points
     * @param id unique identifier for limit order
     * @param endTime the ending timestamp of the order
     * @param lowerBound the lower bound in basis points of the limit order's targetPrice
     * @param upperBound the upper bound in basis points of the limit order's targetPrice
     * @param maker the address which made the order
     * @param vault the vault the order pertains to
     * @param side the side of the limit order
     */
    struct Order {
        uint256 priceTarget;
        uint256 liquidationShare;
        uint256 id;
        uint256 endTime;
        uint256 lowerBound;
        uint256 upperBound;
        address payable maker;
        address vault;
        AggregatorV3Interface priceFeed;
        Side side;
    }

    /**
     * @notice captures the side of the limit order
     * @param PROFIT inidcates the limit order must meet a minimum price target to be executed
     * @param LOSS indicates the limit order must meet a maximum price target to be executed
     */
    enum Side {
        PROFIT,
        LOSS
    }

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
        bytes permit;
        uint256 deadline;
    }
}
