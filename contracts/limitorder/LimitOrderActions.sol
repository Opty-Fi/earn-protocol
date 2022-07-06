// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from './DataTypes.sol';
import { DataTypes as SwapDataTypes } from '../swap/DataTypes.sol';
import { ILimitOrderActions } from './ILimitOrderActions.sol';
import { LimitOrderInternal } from './LimitOrderInternal.sol';
import { LimitOrderStorage } from './LimitOrderStorage.sol';

abstract contract LimitOrderActions is LimitOrderInternal, ILimitOrderActions {
    /**
     * @inheritdoc ILimitOrderActions
     */
    function cancelOrder(address _vault) external {
        _cancelOrder(LimitOrderStorage.layout(), msg.sender, _vault);
    }

    /**
     * @inheritdoc ILimitOrderActions
     */
    function createOrder(
        address _vault,
        uint256 _priceTarget,
        uint256 _liquidationShare,
        uint256 _endTime,
        uint256 _lowerBound,
        uint256 _upperBound,
        DataTypes.Side _side
    ) external returns (DataTypes.Order memory order) {
        order = _createOrder(
            LimitOrderStorage.layout(),
            _vault,
            _priceTarget,
            _liquidationShare,
            _endTime,
            _lowerBound,
            _upperBound,
            _side
        );
    }

    /**
     * @inheritdoc ILimitOrderActions
     */
    function execute(
        DataTypes.Order memory _order,
        SwapDataTypes.SwapData memory _swapData
    ) external {
        _execute(LimitOrderStorage.layout(), _order, _swapData);
    }
}
