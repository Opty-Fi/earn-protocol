// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from './DataTypes.sol';
import { DataTypes as SwapDataTypes } from '../swap/DataTypes.sol';

interface ILimitOrderActions {
    /**
     * @notice cancels an active order
     * @param _vault the address of the vault the order pertains to
     */
    function cancelOrder(address _vault) external;

    /**
     * @notice creates a limit order
     * @param _orderParams the parameters to create the order with
     * @return order the created limit order
     */
    function createOrder(DataTypes.OrderParams memory _orderParams)
        external
        returns (DataTypes.Order memory order);

    /**
     * @notice executes a limit order
     * @param _maker address of order maker
     * @param _vault address of vault that order pertains to
     * @param _swapData token swap data
     */
    function execute(
        address _maker,
        address _vault,
        SwapDataTypes.SwapData memory _swapData
    ) external;

    /**
     * @notice modifies an existing order
     * @param _vault the address of the vault the order pertains to
     * @param _orderParams the parameters to modify the exited order with
     */
    function modifyOrder(
        address _vault,
        DataTypes.OrderParams memory _orderParams
    ) external;
}
