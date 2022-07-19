// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { ILimitOrderSettings } from './ILimitOrderSettings.sol';
import { LimitOrderInternal } from './LimitOrderInternal.sol';
import { LimitOrderStorage } from './LimitOrderStorage.sol';
import { OwnableInternal } from '@solidstate/contracts/access/ownable/OwnableInternal.sol';

/**
 * @title LimitOrderActions facet for LimitOrderDiamond
 * @author OptyFi
 * @dev contains all governance-facing actions
 */
contract LimitOrderSettings is
    LimitOrderInternal,
    OwnableInternal,
    ILimitOrderSettings
{
    constructor(
        address _usd,
        address _usdc,
        address _opUSDC
    ) LimitOrderInternal(_usd, _usdc, _opUSDC) {}

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function setTreasury(address _treasury) external onlyOwner {
        _setTreasury(LimitOrderStorage.layout(), _treasury);
    }

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function setCodeProof(bytes32[] memory _proof, address _vault)
        external
        onlyOwner
    {
        _setCodeProof(LimitOrderStorage.layout(), _proof, _vault);
    }

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function setAccountProof(bytes32[] memory _proof, address _vault)
        external
        onlyOwner
    {
        _setAccountProof(LimitOrderStorage.layout(), _proof, _vault);
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

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function setSwapDiamond(address _swapDiamond) external onlyOwner {
        _setSwapDiamond(LimitOrderStorage.layout(), _swapDiamond);
    }

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function setOracle(address _oracle) external onlyOwner {
        _setOracle(LimitOrderStorage.layout(), _oracle);
    }
}
