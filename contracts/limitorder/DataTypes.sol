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
     * @param lowerBound the lower bound in basis points of the limit order's priceTarget
     * @param upperBound the upper bound in basis points of the limit order's priceTarget
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
     * @param lowerBound the lower bound in basis points of the limit order's priceTarget
     * @param upperBound the upper bound in basis points of the limit order's priceTarget
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

    /**
     * @notice encapsulate all parameters necessary to create SwapData struct for OptyFiSwapper
     * @param deadline timestamp until which swap may be fulfilled
     * @param startIndexes the index of the beginning of each call in exchangeData
     * @param values array of encoded values for each call in exchangeData
     * @param callees array of addresses to call (DEX addresses)
     * @param exchangeData calldata to execute on callees
     * @param permit ERC2612 permit
     */
    struct SwapParams {
        uint256 deadline;
        uint256[] startIndexes;
        uint256[] values;
        address[] callees;
        bytes exchangeData;
        bytes permit;
    }
}
