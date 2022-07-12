// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from './DataTypes.sol';
import { ILimitOrderView } from './ILimitOrderView.sol';
import { LimitOrderInternal } from './LimitOrderInternal.sol';
import { LimitOrderStorage } from './LimitOrderStorage.sol';

/**
 * @title LimitOrderActions facet for LimitOrderDiamond
 * @author OptyFi
 * @dev contains all viewing actions
 */
contract LimitOrderView is LimitOrderInternal, ILimitOrderView {
    constructor(
        address _usd,
        address _usdc,
        address _opUSDC
    ) LimitOrderInternal(_usd, _usdc, _opUSDC) {}

    /**
     * @inheritdoc ILimitOrderView
     */
    function userVaultOrder(address _user, address _vault)
        external
        view
        returns (DataTypes.Order memory order)
    {
        order = _userVaultOrder(LimitOrderStorage.layout(), _user, _vault);
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function userVaultOrderActive(address _user, address _vault)
        external
        view
        returns (bool hasActiveOrder)
    {
        hasActiveOrder = _userVaultOrderActive(
            LimitOrderStorage.layout(),
            _user,
            _vault
        );
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function vaultFee(address _vault) external view returns (uint256 fee) {
        fee = _vaultFee(LimitOrderStorage.layout(), _vault);
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function treasury() external view returns (address treasury) {
        treasury = _treasury(LimitOrderStorage.layout());
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function proof() external view returns (bytes32[] memory proof) {
        proof = _proof(LimitOrderStorage.layout());
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function swapDiamond() external view returns (address swapDiamond) {
        swapDiamond = _swapDiamond(LimitOrderStorage.layout());
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function oracle() external view returns (address oracle) {
        oracle = _oracle(LimitOrderStorage.layout());
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function transferProxy() external view returns (address transferProxy) {
        transferProxy = _transferProxy(LimitOrderStorage.layout());
    }
}
