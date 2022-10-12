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
     * @param liquidationAmountVT the amount of shares to be liquidated by the limit order
     * @param expectedOutputUT minimum amount of underlying tokens that must be received
     *        to not revert transaction
     * @param expiration the expiration timestamp of the order
     * @param lowerBound the lower bound of the limit order in USD price of the underlying token
     * @param upperBound the upper bound of the limit order in USD price of the underlying token
     * @param returnLimitUT the minimum amount of stablecoins to be returned after swap
     * @param expectedOutputVT the minimum amount of vault tokens that must be minted
     *        for the transaction to not revert
     * @param taskId unique identifier of the limit order
     * @param maker the address which made the order
     * @param vault the vault the order pertains to
     * @param stablecoinVault the opVault with stable coins as underlying to send liquidated shares to
     * @param dexRouter address of dex to swap on
     * @param direction the direction of the bounds
     * @param swapOnUniV3 boolean indicating whether the swap should be done via UniV3 router
     * @param uniV3Path token swap path for uniV3
     * @param permitParams permit parameters for liquidationAmountVT
     * @param uniV2Path token swap path for uniV2
     */
    struct Order {
        uint256 liquidationAmountVT;
        uint256 expectedOutputUT;
        uint256 expiration;
        uint256 lowerBound;
        uint256 upperBound;
        uint256 returnLimitUT;
        uint256 expectedOutputVT;
        bytes32 taskId;
        address payable maker;
        address vault;
        address stablecoinVault;
        address dexRouter;
        bool swapOnUniV3;
        BoundDirection direction;
        bytes uniV3Path;
        bytes permitParams;
        address[] uniV2Path;
    }

    /**
     * @notice encapsulate parameters needed to create limit order
     * @param liquidationAmountVT the amount of shares to be liquidated by the limit order
     * @param expectedOutputUT minimum amount of underlying tokens that must be received
     *        to not revert transaction
     * @param expiration the expiration timestamp of the order
     * @param lowerBound the lower bound in basis points of the limit order's priceTarget
     * @param upperBound the upper bound in basis points of the limit order's priceTarget
     * @param returnLimitUT the minimum amount of stablecoins to be returned after swap
     * @param expectedOutputVT the minimum amount of vault tokens that must be minted
     *        for the transaction to not revert
     * @param vault the vault the order pertains to
     * @param stablecoinVault the opVault with stable coins as underlying to send liquidated shares to
     * @param dexRouter address of dex to swap on
     * @param direction the direction of the bounds
     * @param swapOnUniV3 boolean indicating whether the swap should be done via UniV3 router
     * @param uniV3Path token swap path for uniV3
     * @param permitParams permit parameters for liquidationAmountVT
     * @param uniV2Path token swap path for uniV2
     */
    struct OrderParams {
        uint256 liquidationAmountVT;
        uint256 expectedOutputUT;
        uint256 expiration;
        uint256 lowerBound;
        uint256 upperBound;
        uint256 returnLimitUT;
        uint256 expectedOutputVT;
        address vault;
        address stablecoinVault;
        address dexRouter;
        bool swapOnUniV3;
        BoundDirection direction;
        bytes uniV3Path;
        bytes permitParams;
        address[] uniV2Path;
    }
}
