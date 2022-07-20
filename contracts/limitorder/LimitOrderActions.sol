// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from './DataTypes.sol';
import { ILimitOrderActions } from './ILimitOrderActions.sol';
import { LimitOrderInternal } from './LimitOrderInternal.sol';
import { LimitOrderStorage } from './LimitOrderStorage.sol';

/**
 * @title LimitOrderActions facet for LimitOrderDiamond
 * @author OptyFi
 * @dev contains all user-facing actions
 */
contract LimitOrderActions is LimitOrderInternal, ILimitOrderActions {
    constructor(
        address _usd,
        address _usdc,
        address _opUSDC
    ) LimitOrderInternal(_usd, _usdc, _opUSDC) {}

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
    function execute(
        address _maker,
        address _vault,
        DataTypes.SwapParams calldata _swapParams
    ) external {
        _execute(LimitOrderStorage.layout(), _maker, _vault, _swapParams);
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
