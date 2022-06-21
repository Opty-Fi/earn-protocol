// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

/**
 * @title DataTypes for Limit Orders
 * @author OptyFi
 */
library DataTypes {
    /**
     * @notice encapsulate a limit order
     * @param priceTarget the price target at which the limit order can execute
     * @param liquidationShare the proportion of the investment to be liquidated
     * @param startTime the starting timestamp of the order
     * @param endTime the ending timestamp of the order
     * @param maker the address which made the order
     * @param vault the vault the order pertains to
     * @param side the side of the limit order
     */
    struct Order {
        uint256 priceTarget;
        uint256 liquidationShare;
        uint256 startTime;
        uint256 endTime;
        address maker;
        address vault;
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
