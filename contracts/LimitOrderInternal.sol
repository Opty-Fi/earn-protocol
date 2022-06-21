// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

import { IVault } from './earn/IVault.sol';
import { LimitOrderStorage } from './LimitOrderStorage.sol';
import { DataTypes } from './DataTypes.sol';
import { ILimitOrderInternal } from './ILimitOrderInternal.sol';

/**
 * @title Contract for writing limit orders
 * @author OptyFi
 */
contract LimitOrderInternal is ILimitOrderInternal {
    using LimitOrderStorage for LimitOrderStorage.Layout;

    uint256 public constant FEE_BASIS = 1 ether;
    uint256 public immutable LIMIT_ORDER_FEE;

    constructor(uint256 _limitOrderFee) {
        LIMIT_ORDER_FEE = _limitOrderFee;
    }

    function _permitOrderCreation(
        LimitOrderStorage.Layout storage _l,
        address _user,
        address _vault,
        uint256 _startTime,
        uint256 _endTime
    ) internal view {
        require(
            _l.userVaultOrderActive[_user][_vault] == false,
            'user already has active limit order'
        );
        require(_startTime < _endTime, 'end time < start time');
    }

    function _cancelOrder(
        LimitOrderStorage.Layout storage _l,
        address _user,
        address _vault
    ) internal {
        _l.userVaultOrderActive[_user][_vault] = false;
    }

    function _spotPriceMet(uint256 _spotPrice, DataTypes.Order memory _order)
        internal
        pure
        returns (bool)
    {
        if (_order.side == DataTypes.Side.LOSS) {
            if (_spotPrice <= _order.priceTarget) {
                return true;
            } else {
                return false;
            }
        } else {
            if (_spotPrice >= _order.priceTarget) {
                return true;
            } else {
                return false;
            }
        }
    }

    function _createOrder(
        LimitOrderStorage.Layout storage _l,
        address _vault,
        uint256 _priceTarget,
        uint256 _liquidationShare,
        uint256 _endTime,
        DataTypes.Side _side
    ) internal returns (DataTypes.Order memory order) {
        uint256 startTime = block.timestamp;

        _permitOrderCreation(_l, msg.sender, _vault, startTime, _endTime);

        order.priceTarget = _priceTarget;
        order.liquidationShare = _liquidationShare;
        order.startTime = startTime;
        order.endTime = _endTime;
        order.vault = _vault;
        order.maker = msg.sender;
        order.side = _side;

        _l.userVaultOrder[msg.sender][_vault] = order;
        _l.userVaultOrderActive[msg.sender][_vault] = true;

        emit LimitOrderCreated(order);
    }

    function _canExecute(
        LimitOrderStorage.Layout storage _l,
        DataTypes.Order memory _order
    ) internal view {
        require(
            _l.userVaultOrderActive[_order.maker][_order.vault] == true,
            'user does not have an active order'
        );
        require(_order.endTime > block.timestamp, 'order expired');
        uint256 spotPrice = IVault(_order.vault).getPricePerFullShare();
        _spotPriceMet(spotPrice, _order);
    }
}
