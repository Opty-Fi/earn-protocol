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
     * @param _vault the vault the order pertains to
     * @param _priceTarget the priceTarget at which the order may be executed
     * @param _liquidationShare the % in basis points of the users vault shares to liquidate
     * @param _endTime the expiration time of the limit order
     * @param _lowerBound the percentage lower bound of the priceTarget in Basis Points
     * @param _upperBound the percentage upper bound of the priceTarget in Basis Points
     * @return order the created limit order
     */
    function createOrder(
        address _vault,
        uint256 _priceTarget,
        uint256 _liquidationShare,
        uint256 _endTime,
        uint256 _lowerBound,
        uint256 _upperBound
    ) external returns (DataTypes.Order memory order);

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
}
