// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

/**
 * @title DataTypes for Limit Orders
 * @author OptyFi
 */
library DataTypes {
    /**
     * @notice encapsulate a limit order
     * @param priceTarget the price target at which the limit order can execute
     * @param liquidationShare the proportion of the investment to be liquidated in basis points
     * @param expiration the expiration timestamp of the order
     * @param lowerBound the lower bound in basis points of the limit order's targetPrice
     * @param upperBound the upper bound in basis points of the limit order's targetPrice
     * @param maker the address which made the order
     * @param vault the vault the order pertains to
     * @param depositUSDC indicated whether the USDC should be deposited in opUSDC vault or user receives it
     */
    struct Order {
        uint256 priceTarget;
        uint256 liquidationShare;
        uint256 expiration;
        uint256 lowerBound;
        uint256 upperBound;
        address payable maker;
        address vault;
        bool depositUSDC;
    }

    /**
     * @notice encapsulate parameters needed to create limit order
     * @param priceTarget the price target at which the limit order can execute
     * @param liquidationShare the proportion of the investment to be liquidated in basis points
     * @param expiration the expiration timestamp of the order
     * @param lowerBound the lower bound in basis points of the limit order's targetPrice
     * @param upperBound the upper bound in basis points of the limit order's targetPrice
     * @param vault the vault the order pertains to
     * @param depositUSDC indicated whether the USDC should be deposited in opUSDC vault or user receives it
     */
    struct OrderParams {
        uint256 priceTarget;
        uint256 liquidationShare;
        uint256 expiration;
        uint256 lowerBound;
        uint256 upperBound;
        address vault;
        bool depositUSDC;
    }
}
