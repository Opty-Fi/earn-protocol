// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from "../../limit-order/DataTypes.sol";

/**
 * @title Interface for LimitOrderActions facet
 * @author OptyFi
 */
interface ILimitOrderActions {
    /**
     * @notice cancels an active order
     * @param _vault the address of the vault the order pertains to
     */
    function cancelOrder(address _vault) external;

    /**
     * @notice creates a limit order
     * @param _orderParams the parameters to create the order
     */
    function createOrder(DataTypes.OrderParams memory _orderParams) external;

    /**
     * @notice executes a limit order
     * @param _maker address of order maker
     * @param _vault address of vault that order pertains to
     * @param _deadline deadline for the swap
     */
    function execute(
        address _maker,
        address _vault,
        uint256 _deadline
    ) external;

    /**
     * @notice modifies an existing order
     * @param _vault the address of the vault the order pertains to
     * @param _orderParams the parameters to modify the existing order
     */
    function modifyOrder(address _vault, DataTypes.OrderParams memory _orderParams) external;
}
