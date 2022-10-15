// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from "./DataTypes.sol";
import { ILimitOrderActions } from "../interfaces/limit-order/ILimitOrderActions.sol";
import { LimitOrderView } from "./LimitOrderView.sol";
import { LimitOrderStorage } from "./LimitOrderStorage.sol";

/**
 * @title LimitOrderActions
 * @author OptyFi
 * @dev contains all user-facing actions
 */
abstract contract LimitOrderActions is LimitOrderView, ILimitOrderActions {
    /**
     * @inheritdoc ILimitOrderActions
     */
    function cancelOrder(address _vault) external {
        bytes32 _taskId = _cancelOrder(LimitOrderStorage.layout(), msg.sender, _vault);

        emit LimitOrderCancelled(_taskId, msg.sender, _vault);
    }

    /**
     * @inheritdoc ILimitOrderActions
     */
    function createOrder(DataTypes.OrderParams calldata _orderParams) external {
        DataTypes.Order memory _order = _createOrder(LimitOrderStorage.layout(), _orderParams);
        emit LimitOrderCreated(
            _order.liquidationAmountVT,
            _order.expectedOutputUT,
            _order.expiration,
            _order.lowerBound,
            _order.upperBound,
            _order.returnLimitUT,
            _order.expectedOutputVT,
            _order.taskId,
            _order.maker,
            _order.vault,
            _order.stablecoinVault,
            _order.dexRouter,
            _order.swapOnUniV3,
            uint8(_order.direction)
        );
    }

    /**
     * @inheritdoc ILimitOrderActions
     */
    function execute(
        address _maker,
        address _vault,
        uint256 _deadline
    ) external {
        (
            bytes32 _taskId,
            uint256 _liquidationAmountVT,
            uint256 _fee,
            uint256 _stablecoinDepositAmountUT,
            uint256 _stablecoinAmountVT,
            address _stablecoinVault
        ) = _execute(LimitOrderStorage.layout(), _maker, _vault, _deadline);

        emit LimitOrderFulfilled(
            _taskId,
            _maker,
            _vault,
            _liquidationAmountVT,
            _fee,
            _stablecoinDepositAmountUT,
            _stablecoinAmountVT,
            _stablecoinVault
        );
    }

    /**
     * @inheritdoc ILimitOrderActions
     */
    function modifyOrder(address _vault, DataTypes.OrderParams calldata _orderParams) external {
        DataTypes.Order memory _order = _modifyOrder(LimitOrderStorage.layout(), _vault, _orderParams);
        emit LimitOrderModified(
            _order.liquidationAmountVT,
            _order.expectedOutputUT,
            _order.expiration,
            _order.lowerBound,
            _order.upperBound,
            _order.returnLimitUT,
            _order.expectedOutputVT,
            _order.taskId,
            _order.maker,
            _order.vault,
            _order.stablecoinVault,
            _order.dexRouter,
            _order.swapOnUniV3,
            uint8(_order.direction)
        );
    }
}
