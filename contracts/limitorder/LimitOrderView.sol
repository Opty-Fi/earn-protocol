// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from './DataTypes.sol';
import { ILimitOrderView } from './ILimitOrderView.sol';
import { ILimitOrderActions } from './ILimitOrderActions.sol';
import { LimitOrderInternal } from './LimitOrderInternal.sol';
import { LimitOrderStorage } from './LimitOrderStorage.sol';
import { IVault } from '../earn-interfaces/IVault.sol';

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
    function treasury() external view returns (address treasury) {
        treasury = _treasury(LimitOrderStorage.layout());
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
    function canExecuteOrder(address _maker, address _vault)
        external
        view
        returns (bool, bytes memory)
    {
        if (!LimitOrderStorage.layout().userVaultOrderActive[_maker][_vault]) {
            return (false, bytes('No active order'));
        }

        if (
            LimitOrderStorage
            .layout()
            .userVaultOrder[_maker][_vault].expiration <= _timestamp()
        ) {
            return (false, bytes('Order is expired'));
        }

        if (
            LimitOrderStorage
            .layout()
            .userVaultOrder[_maker][_vault].direction ==
            DataTypes.BoundDirection.Out
        ) {
            if (
                !(LimitOrderStorage
                .layout()
                .userVaultOrder[_maker][_vault].lowerBound >=
                    _price(
                        LimitOrderStorage.layout().oracle,
                        IVault(_vault).underlyingToken()
                    ) ||
                    _price(
                        LimitOrderStorage.layout().oracle,
                        IVault(_vault).underlyingToken()
                    ) >=
                    LimitOrderStorage
                    .layout()
                    .userVaultOrder[_maker][_vault].upperBound)
            ) {
                return (false, bytes('Price out of bounds'));
            }
        } else {
            if (
                !(LimitOrderStorage
                .layout()
                .userVaultOrder[_maker][_vault].lowerBound <=
                    _price(
                        LimitOrderStorage.layout().oracle,
                        IVault(_vault).underlyingToken()
                    ) &&
                    _price(
                        LimitOrderStorage.layout().oracle,
                        IVault(_vault).underlyingToken()
                    ) <=
                    LimitOrderStorage
                    .layout()
                    .userVaultOrder[_maker][_vault].upperBound)
            ) {
                return (false, bytes('Price out of bounds'));
            }
        }

        uint256[] memory _startIndexes = new uint256[](3);
        uint256[] memory _values = new uint256[](2);
        address[] memory _callees = new address[](2);

        DataTypes.SwapParams memory _swapParams = DataTypes.SwapParams({
            deadline: _timestamp() + 10 minutes,
            startIndexes: _startIndexes,
            values: _values,
            callees: _callees,
            exchangeData: bytes('0x'),
            permit: bytes('0x')
        });

        bytes memory _execPayload = abi.encodeWithSelector(
            ILimitOrderActions.execute.selector,
            _maker,
            _vault
        );

        return (true, _execPayload);
    }
}
