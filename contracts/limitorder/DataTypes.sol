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
    enum BoundDirection { Out, In }

    /**
     * @notice encapsulate a limit order
     * @param liquidationAmount the amount of shares to be liquidated by the limit order
     * @param expiration the expiration timestamp of the order
     * @param lowerBound the lower bound of the limit order in USD price of the underlying token
     * @param upperBound the upper bound of the limit order in USD price of the underlying token
     * @param returnLimitBP the minimum acceptable percentage of returns from the swap in basis points
     * @param taskId unique identifier of the limit order
     * @param maker the address which made the order
     * @param vault the vault the order pertains to
     * @param stablecoinVault the opVault with stable coins as underlying to send liquidated shares to
     * @param dexRouter address of dex to swap on
     * @param direction the direction of the bounds
     * @param swapOnUniV3 boolean indicating whether the swap should be done via UniV3 router
     * @param uniV3Path token swap path for uniV3
     * @param uniV2Path token swap path for uniV2
     */
    struct Order {
        uint256 liquidationAmount;
        uint256 expiration;
        uint256 lowerBound;
        uint256 upperBound;
        uint256 returnLimitBP;
        bytes32 taskId;
        address payable maker;
        address vault;
        address stablecoinVault;
        address dexRouter;
        bool swapOnUniV3;
        BoundDirection direction;
        bytes uniV3Path;
        address[] uniV2Path;
    }

    /**
     * @notice encapsulate parameters needed to create limit order
     * @param liquidationAmount the amount of shares to be liquidated by the limit order
     * @param expiration the expiration timestamp of the order
     * @param lowerBound the lower bound in basis points of the limit order's priceTarget
     * @param upperBound the upper bound in basis points of the limit order's priceTarget
     * @param returnLimitBP the minimum acceptable percentage of returns from the swap in basis points
     * @param vault the vault the order pertains to
     * @param stablecoinVault the opVault with stable coins as underlying to send liquidated shares to
     * @param dexRouter address of dex to swap on
     * @param direction the direction of the bounds
     * @param swapOnUniV3 boolean indicating whether the swap should be done via UniV3 router
     * @param uniV3Path token swap path for uniV3
     * @param uniV2Path token swap path for uniV2
     */
    struct OrderParams {
        uint256 liquidationAmount;
        uint256 expiration;
        uint256 lowerBound;
        uint256 upperBound;
        uint256 returnLimitBP;
        address vault;
        address stablecoinVault;
        address dexRouter;
        bool swapOnUniV3;
        BoundDirection direction;
        bytes uniV3Path;
        address[] uniV2Path;
    }
}
