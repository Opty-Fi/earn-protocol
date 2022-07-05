// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from './DataTypes.sol';

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
     * @param _side the side of the order (PROFIT|LOSS)
     * @return order the created limit order
     */
    function createOrder(
        address _vault,
        uint256 _priceTarget,
        uint256 _liquidationShare,
        uint256 _endTime,
        uint256 _lowerBound,
        uint256 _upperBound,
        DataTypes.Side _side
    ) external returns (DataTypes.Order memory order);

    /**
     * @notice executes a limit order
     * @param _order the limit order to execute
     * @param _usdcAmountMin the minimum amount of USDC to be received from the swap
     * @param _target the DEX contract address to perform the swap
     * @param _data the calldata required for the swap
     */
    function execute(
        DataTypes.Order memory _order,
        uint256 _usdcAmountMin,
        address _target,
        bytes calldata _data
    ) external;
}
