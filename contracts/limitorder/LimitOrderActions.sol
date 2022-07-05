// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from './DataTypes.sol';
import { ILimitOrderActions } from './ILimitOrderActions.sol';
import { LimitOrderInternal } from './LimitOrderInternal.sol';
import { LimitOrderStorage } from './LimitOrderStorage.sol';

contract LimitOrderActioms is LimitOrderInternal, ILimitOrderActions {
    constructor(
        address _arbitrarySwapper,
        address _usdc,
        address _opUSDCVault,
        address _treasury,
        address[] memory _tokens,
        address[] memory _priceFeeds
    )
        LimitOrderInternal(
            _arbitrarySwapper,
            _usdc,
            _opUSDCVault,
            _treasury,
            _tokens,
            _priceFeeds
        )
    {}

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
        uint256 _usdcAmountMin,
        address _target,
        bytes calldata _data
    ) external {
        _execute(
            LimitOrderStorage.layout(),
            _order,
            _usdcAmountMin,
            _target,
            _data
        );
    }
}
