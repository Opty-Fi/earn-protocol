// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

/**
 * @title DataTypes for Limit Orders
 * @author OptyFi
 */
library DataTypes {
    /**
     * @notice indicates whether a price must lie within or outwith the bounds
     * @param Out indicates that price must lie outwith the bounds
     * @param In indicates that price must lie within the bounds
     */
    enum BoundDirection {
        Out,
        In
    }

    /**
     * @notice encapsulate a limit order
     * @param liquidationShareBP the proportion of the investment to be liquidated in basis points
     * @param expiration the expiration timestamp of the order
     * @param lowerBound the lower bound of the limit order in USD price of the underlying token
     * @param upperBound the upper bound of the limit order in USD price of the underlying token
     * @param returnLimitBP the minimum acceptable percentage of returns from the swap in basis points
     * @param maker the address which made the order
     * @param vault the vault the order pertains to
     * @param direction the direction of the bounds
     */
    struct Order {
        uint256 liquidationShareBP;
        uint256 expiration;
        uint256 lowerBound;
        uint256 upperBound;
        uint256 returnLimitBP;
        address payable maker;
        address vault;
        BoundDirection direction;
    }

    /**
     * @notice encapsulate parameters needed to create limit order
     * @param liquidationShareBP the proportion of the investment to be liquidated in basis points
     * @param expiration the expiration timestamp of the order
     * @param lowerBound the lower bound in basis points of the limit order's priceTarget
     * @param upperBound the upper bound in basis points of the limit order's priceTarget
     * @param returnLimitBP the minimum acceptable percentage of returns from the swap in basis points
     * @param vault the vault the order pertains to
     * @param direction the direction of the bounds
     */
    struct OrderParams {
        uint256 liquidationShareBP;
        uint256 expiration;
        uint256 lowerBound;
        uint256 upperBound;
        uint256 returnLimitBP;
        address vault;
        BoundDirection direction;
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
