// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from './DataTypes.sol';
import { ILimitOrderView } from './ILimitOrderView.sol';
import { ILimitOrderActions } from './ILimitOrderActions.sol';
import { LimitOrderInternal } from './LimitOrderInternal.sol';
import { LimitOrderStorage } from './LimitOrderStorage.sol';
import { IVault } from '../earn-interfaces/IVault.sol';
import { IERC20 } from '@solidstate/contracts/token/ERC20/IERC20.sol';

/**
 * @title LimitOrderView facet for LimitOrderDiamond
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
    function treasury() external view returns (address treasuryAddress) {
        treasuryAddress = _treasury(LimitOrderStorage.layout());
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function codeProof(address _vault)
        external
        view
        returns (bytes32[] memory proof)
    {
        proof = _codeProof(LimitOrderStorage.layout(), _vault);
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function accountProof(address _vault)
        external
        view
        returns (bytes32[] memory proof)
    {
        proof = _accountProof(LimitOrderStorage.layout(), _vault);
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function swapDiamond() external view returns (address swapDiamondAddress) {
        swapDiamondAddress = _swapDiamond(LimitOrderStorage.layout());
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function oracle() external view returns (address oracleAddress) {
        oracleAddress = _oracle(LimitOrderStorage.layout());
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function ops() external view returns (address opsAddress) {
        opsAddress = _ops(LimitOrderStorage.layout());
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function exchangeRouter()
        external
        view
        returns (address exchangeRouterAddress)
    {
        exchangeRouterAddress = _exchangeRouter(LimitOrderStorage.layout());
    }

    /**
     * @inheritdoc ILimitOrderView
     */
    function canExecuteOrder(address _maker, address _vault)
        external
        view
        returns (bool, bytes memory)
    {
        return _canExecuteOrder(_maker, _vault);
    }
}
