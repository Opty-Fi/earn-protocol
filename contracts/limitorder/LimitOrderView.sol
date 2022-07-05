// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from './DataTypes.sol';
import { ILimitOrderView } from './ILimitOrderView.sol';
import { LimitOrderInternal } from './LimitOrderInternal.sol';
import { LimitOrderStorage } from './LimitOrderStorage.sol';

contract LimitOrderView is LimitOrderInternal, ILimitOrderView {
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
    function tokenPriceFeed(address _token)
        external
        view
        returns (address priceFeed)
    {
        priceFeed = _tokenPriceFeed(LimitOrderStorage.layout(), _token);
    }
}
