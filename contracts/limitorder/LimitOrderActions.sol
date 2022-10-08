// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from './DataTypes.sol';
import { ILimitOrderActions } from './ILimitOrderActions.sol';
import { LimitOrderView } from './LimitOrderView.sol';
import { LimitOrderStorage } from './LimitOrderStorage.sol';

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
        _cancelOrder(LimitOrderStorage.layout(), msg.sender, _vault);
    }

    /**
     * @inheritdoc ILimitOrderActions
     */
    function createOrder(DataTypes.OrderParams memory _orderParams)
        external
        returns (DataTypes.Order memory order)
    {
        order = _createOrder(LimitOrderStorage.layout(), _orderParams);
    }

    /**
     * @inheritdoc ILimitOrderActions
     */
    function execute(address _maker, address _vault) external {
        _execute(LimitOrderStorage.layout(), _maker, _vault);
    }

    /**
     * @inheritdoc ILimitOrderActions
     */
    function modifyOrder(
        address _vault,
        DataTypes.OrderParams memory _orderParams
    ) external {
        _modifyOrder(LimitOrderStorage.layout(), _vault, _orderParams);
    }
}