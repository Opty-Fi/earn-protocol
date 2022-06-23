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
     * @param startTime the starting timestamp of the order
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
        uint256 startTime;
        uint256 endTime;
        uint256 lowerBound;
        uint256 upperBound;
        address maker;
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
}
