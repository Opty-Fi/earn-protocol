// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from './DataTypes.sol';
import { ILimitOrderView } from './ILimitOrderView.sol';
import { ILimitOrderActions } from './ILimitOrderActions.sol';
import { LimitOrderInternal } from './LimitOrderInternal.sol';
import { LimitOrderStorage } from './LimitOrderStorage.sol';
import { IVault } from '../earn-interfaces/IVault.sol';
import { IERC20 } from '@solidstate/contracts/token/ERC20/IERC20.sol';

import { IUniswapV2Router01 } from '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router01.sol';

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
        DataTypes.Order memory _order = LimitOrderStorage
            .layout()
            .userVaultOrder[_maker][_vault];
        address _vaultUnderlyingToken = IVault(_vault).underlyingToken();

        if (IERC20(_vault).balanceOf(_maker) < _order.liquidationAmount) {
            return (false, bytes('Not enough shares'));
        }

        uint256 _amountIn = (_order.liquidationAmount *
            IVault(_vault).getPricePerFullShare()) / 10**18;

        if (!LimitOrderStorage.layout().userVaultOrderActive[_maker][_vault]) {
            return (false, bytes('No active order'));
        }

        if (_order.expiration <= _timestamp()) {
            return (false, bytes('Order is expired'));
        }

        if (_order.direction == DataTypes.BoundDirection.Out) {
            if (
                !(_order.lowerBound >=
                    _price(
                        LimitOrderStorage.layout().oracle,
                        _vaultUnderlyingToken
                    ) ||
                    _price(
                        LimitOrderStorage.layout().oracle,
                        _vaultUnderlyingToken
                    ) >=
                    _order.upperBound)
            ) {
                return (false, bytes('Price out of bounds'));
            }
        } else {
            if (
                !(_order.lowerBound <=
                    _price(
                        LimitOrderStorage.layout().oracle,
                        _vaultUnderlyingToken
                    ) &&
                    _price(
                        LimitOrderStorage.layout().oracle,
                        _vaultUnderlyingToken
                    ) <=
                    _order.upperBound)
            ) {
                return (false, bytes('Price out of bounds'));
            }
        }

        bytes memory _swapData = abi.encodeWithSelector(
            IUniswapV2Router01.swapExactTokensForTokens.selector,
            _amountIn,
            _priceUSDC(
                LimitOrderStorage.layout().oracle,
                _vaultUnderlyingToken
            ),
            [_vaultUnderlyingToken, USDC],
            address(this),
            _timestamp() + 20 minutes
        );

        uint256[] memory _startIndexes;
        address[] memory _callees;
        uint256[] memory _values;
        bytes memory _exchangeData;

        if (
            IERC20(_vaultUnderlyingToken).allowance(
                address(this),
                LimitOrderStorage.layout().exchangeRouter
            ) >= _amountIn
        ) {
            _startIndexes = new uint256[](2);
            _callees = new address[](1);
            _values = new uint256[](1);
            _startIndexes[0] = 0;
            _startIndexes[1] = _swapData.length;
            _callees[1] = LimitOrderStorage.layout().exchangeRouter;
            _values[0] = 0;
            _exchangeData = _swapData;
        } else {
            bytes memory _approveData = abi.encodeWithSelector(
                IERC20.approve.selector,
                LimitOrderStorage.layout().exchangeRouter,
                type(uint256).max
            );
            _startIndexes = new uint256[](3);
            _callees = new address[](2);
            _values = new uint256[](2);
            _startIndexes[0] = 0;
            _startIndexes[1] = _approveData.length;
            _startIndexes[2] = _startIndexes[1] + _swapData.length;
            _callees[0] = _vaultUnderlyingToken;
            _callees[1] = LimitOrderStorage.layout().exchangeRouter;
            _values[0] = 0;
            _values[1] = 0;
            _exchangeData = bytes.concat(_approveData, _swapData);
        }

        DataTypes.SwapParams memory _swapParams = DataTypes.SwapParams({
            deadline: _timestamp() + 10 minutes,
            startIndexes: _startIndexes,
            values: _values,
            callees: _callees,
            exchangeData: _exchangeData,
            permit: bytes('0x')
        });

        bytes memory _execPayload = abi.encodeWithSelector(
            ILimitOrderActions.execute.selector,
            _maker,
            _vault,
            _swapParams
        );

        return (true, _execPayload);
    }
}
