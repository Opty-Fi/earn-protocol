// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { ILimitOrderSettings } from './ILimitOrderSettings.sol';
import { LimitOrderInternal } from './LimitOrderInternal.sol';
import { LimitOrderStorage } from './LimitOrderStorage.sol';
import { OwnableInternal } from '@solidstate/contracts/access/ownable/OwnableInternal.sol';

/**
 * @title LimitOrderSettings facet for LimitOrderDiamond
 * @author OptyFi
 * @dev contains all governance-facing actions
 */
contract LimitOrderSettings is
    LimitOrderInternal,
    OwnableInternal,
    ILimitOrderSettings
{
    constructor(address _usd) LimitOrderInternal(_usd) {}

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

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function setVault(address _vault) external onlyOwner {
        _setVault(LimitOrderStorage.layout(), _vault);
    }

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function setVaults(address[] memory _vaults) external onlyOwner {
        LimitOrderStorage.Layout storage l = LimitOrderStorage.layout();
        uint256 length = _vaults.length;

        unchecked {
            for (uint256 i; i < length; ) {
                _setVault(l, _vaults[i]);
                ++i;
            }
        }
    }

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function unsetVault(address _vault) external onlyOwner {
        _unsetVault(LimitOrderStorage.layout(), _vault);
    }

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function unsetVaults(address[] memory _vaults) external onlyOwner {
        LimitOrderStorage.Layout storage l = LimitOrderStorage.layout();
        uint256 length = _vaults.length;

        unchecked {
            for (uint256 i; i < length; ) {
                _unsetVault(l, _vaults[i]);
                ++i;
            }
        }
    }

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function setOps(address _ops) external onlyOwner {
        _setOps(LimitOrderStorage.layout(), _ops);
    }

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function setExchangeRouter(address _exchangeRouter) external onlyOwner {
        _setExchangeRouter(LimitOrderStorage.layout(), _exchangeRouter);
    }
}
