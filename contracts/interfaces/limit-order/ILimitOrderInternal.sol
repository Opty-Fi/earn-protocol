// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from "../../limit-order/DataTypes.sol";

/**
 * @title interfaces to hold all LimitOrder Events
 * @author OptyFi
 */
interface ILimitOrderInternal {
    /**
     * @notice Logs when a LimitOrder is created
     * @param liquidationAmountVT the amount of shares to be liquidated by the limit order
     * @param expectedOutputUT minimum amount of underlying tokens that must be received
     *        to not revert transaction upon liquidation
     * @param expiration the expiration timestamp of the order
     * @param lowerBound the lower bound of the limit order in USD price of the underlying token
     * @param upperBound the upper bound of the limit order in USD price of the underlying token
     * @param returnLimitUT the minimum amount of stablecoins to be received after swap
     * @param expectedOutputVT the minimum amount of vault tokens that must be minted
     *        for the transaction to not revert when depositing into stablecoin vault
     * @param taskId unique identifier of the limit order
     * @param maker the address of limit order creator
     * @param vault the vault the order pertains to
     * @param stablecoinVault the opVault with stable coins as underlying to send liquidated shares to
     * @param dexRouter address of dex to swap tokens
     * @param direction the direction of the bounds
     * @param swapOnUniV3 boolean indicating whether the swap should be done via UniV3 router
     */
    event LimitOrderCreated(
        uint256 liquidationAmountVT,
        uint256 expectedOutputUT,
        uint256 expiration,
        uint256 lowerBound,
        uint256 upperBound,
        uint256 returnLimitUT,
        uint256 expectedOutputVT,
        bytes32 taskId,
        address payable maker,
        address vault,
        address stablecoinVault,
        address dexRouter,
        bool swapOnUniV3,
        uint8 direction
    );

    /**
     * @notice Logs when a LimitOrder is modified
     * @param liquidationAmountVT the amount of shares to be liquidated by the limit order
     * @param expectedOutputUT minimum amount of underlying tokens that must be received
     *        to not revert transaction upon liquidation
     * @param expiration the expiration timestamp of the order
     * @param lowerBound the lower bound of the limit order in USD price of the underlying token
     * @param upperBound the upper bound of the limit order in USD price of the underlying token
     * @param returnLimitUT the minimum amount of stablecoins to be received after swap
     * @param expectedOutputVT the minimum amount of vault tokens that must be minted
     *        for the transaction to not revert when depositing into stablecoin vault
     * @param taskId unique identifier of the limit order
     * @param maker the address of limit order creator
     * @param vault the vault the order pertains to
     * @param stablecoinVault the opVault with stable coins as underlying to send liquidated shares to
     * @param dexRouter address of dex to swap tokens
     * @param direction the direction of the bounds
     * @param swapOnUniV3 boolean indicating whether the swap should be done via UniV3 router
     */
    event LimitOrderModified(
        uint256 liquidationAmountVT,
        uint256 expectedOutputUT,
        uint256 expiration,
        uint256 lowerBound,
        uint256 upperBound,
        uint256 returnLimitUT,
        uint256 expectedOutputVT,
        bytes32 taskId,
        address payable maker,
        address vault,
        address stablecoinVault,
        address dexRouter,
        bool swapOnUniV3,
        uint8 direction
    );

    /**
     * @notice Logs upon limit order fulfillment
     * @param taskId unique identifier of the limit order
     * @param maker the address of limit order creator
     * @param vault the vault the order pertains to
     * @param liquidationAmountVT the amount of shares to be liquidated by the limit order
     * @param fee fee collected upon order fulfillment
     * @param stablecoinDepositAmountUT amount in underlying token deposited to stablecoin vault
     * @param stablecoinAmountVT amount in vault token minted by stablecoin vault
     * @param stablecoinVault the opVault with stable coins as underlying to send liquidated shares to
     */
    event LimitOrderFulfilled(
        bytes32 taskId,
        address maker,
        address vault,
        uint256 liquidationAmountVT,
        uint256 fee,
        uint256 stablecoinDepositAmountUT,
        uint256 stablecoinAmountVT,
        address stablecoinVault
    );

    /**
     * @notice Logs upon limit order cancellation
     * @param taskId unique identifier of the limit order
     * @param maker the address of limit order creator
     * @param vault the vault the order pertains to
     */
    event LimitOrderCancelled(bytes32 taskId, address maker, address vault);
}
