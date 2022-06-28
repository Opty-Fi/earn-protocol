// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { ILimitOrderSettings } from './ILimitOrderSettings.sol';
import { LimitOrderInternal } from './LimitOrderInternal.sol';
import { LimitOrderStorage } from './LimitOrderStorage.sol';
import { OwnableInternal } from '@solidstate/contracts/access/OwnableInternal.sol';

contract LimitOrderSettings is
    LimitOrderInternal,
    OwnableInternal,
    ILimitOrderSettings
{
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
     * @inheritdoc ILimitOrderSettings
     */
    function setTreasury(address _treasury) external onlyOwner {
        _setTreasury(LimitOrderStorage.layout(), _treasury);
    }

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function setProof(bytes32[] memory _proof) external onlyOwner {
        _setProof(LimitOrderStorage.layout(), _proof);
    }

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function setVaultLiquidationFee(uint256 _fee, address _vault)
        external
        onlyOwner
    {
        _setVaultLiquidationFee(LimitOrderStorage.layout(), _fee, _vault);
    }
}
