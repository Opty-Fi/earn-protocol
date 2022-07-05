// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { ILimitOrderSettings } from './ILimitOrderSettings.sol';
import { LimitOrderInternal } from './LimitOrderInternal.sol';
import { LimitOrderStorage } from './LimitOrderStorage.sol';
import { OwnableInternal } from '@solidstate/contracts/access/ownable/OwnableInternal.sol';

abstract contract LimitOrderSettings is
    LimitOrderInternal,
    OwnableInternal,
    ILimitOrderSettings
{
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
