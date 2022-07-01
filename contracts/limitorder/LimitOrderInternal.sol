// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { IVault } from '../earn/IVault.sol';
import { LimitOrderStorage } from './LimitOrderStorage.sol';
import { DataTypes } from './DataTypes.sol';
import { DataTypes as SwapDataTypes } from '../swap/DataTypes.sol';
import { ILimitOrderInternal } from './ILimitOrderInternal.sol';
import { ITokenTransferProxy } from '../utils/ITokenTransferProxy.sol';
import { ERC20Utils } from '../utils/ERC20Utils.sol';
import { ISwap } from '../swap/ISwap.sol';

import { IOptyFiOracle } from './IOptyFiOracle.sol';
import { IERC20 } from '@solidstate/contracts/token/ERC20/IERC20.sol';
import { SafeERC20 } from '@solidstate/contracts/utils/SafeERC20.sol';

/**
 * @title Contract for writing limit orders
 * @author OptyFi
 */
abstract contract LimitOrderInternal is ILimitOrderInternal {
    using LimitOrderStorage for LimitOrderStorage.Layout;
    using SafeERC20 for IERC20;

    uint256 public constant BASIS = 1 ether;
    address public constant USD =
        address(0x0000000000000000000000000000000000000348);
    address public constant USDC =
        address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    address public constant OPUSDC_VAULT =
        address(0x6d8BfdB4c4975bB086fC9027e48D5775f609fF88);

    /**
     * @notice cancels an active order
     * @param _l the layout of the limit order contract
     * @param _maker the address of the order maker
     * @param _vault the address of the vault the order pertains to
     */
    function _cancelOrder(
        LimitOrderStorage.Layout storage _l,
        address _maker,
        address _vault
    ) internal {
        DataTypes.Order memory order = _l.userVaultOrder[_maker][_vault];
        require(order.maker != address(0), 'Order non-existent');
        require(msg.sender == order.maker, 'Only callable by order maker');
        _l.userVaultOrderActive[_maker][_vault] = false;
    }

    /**
     * @notice creates a limit order
     * @param _l the layout of the limit order contract
     * @param _vault the vault the order pertains to
     * @param _priceTarget the priceTarget at which the order may be executed
     * @param _liquidationShare the % in basis points of the users vault shares to liquidate
     * @param _endTime the expiration time of the limit order
     * @param _lowerBound the percentage lower bound of the priceTarget in Basis Points
     * @param _upperBound the percentage upper bound of the priceTarget in Basis Points
     * @param _side the side of the order (PROFIT|LOSS)
     * @return order the created limit order
     */
    function _createOrder(
        LimitOrderStorage.Layout storage _l,
        address _vault,
        uint256 _priceTarget,
        uint256 _liquidationShare,
        uint256 _endTime,
        uint256 _lowerBound,
        uint256 _upperBound,
        DataTypes.Side _side
    ) internal returns (DataTypes.Order memory order) {
        _permitOrderCreation(_l, msg.sender, _vault, _endTime);

        order.priceTarget = _priceTarget;
        order.liquidationShare = _liquidationShare;
        order.id = _l.id;
        order.endTime = _endTime;
        order.lowerBound = _lowerBound;
        order.upperBound = _upperBound;
        order.vault = _vault;
        order.maker = payable(msg.sender);
        order.side = _side;

        _l.userVaultOrder[msg.sender][_vault] = order;
        _l.userVaultOrderActive[msg.sender][_vault] = true;
        ++_l.id;

        emit LimitOrderCreated(order);
    }

    /**
     * @notice executes a limit order
     * @param _l the layout of the limit order contract
     * @param _order the limit order to execute
     * @param _swapData token swap data
     */
    function _execute(
        LimitOrderStorage.Layout storage _l,
        DataTypes.Order memory _order,
        SwapDataTypes.SwapData memory _swapData
    ) internal {
        //check order execution critera
        _canExecute(_l, _order);

        address vault = _order.vault;

        //calculate liquidation amount
        uint256 liquidationAmount = _liquidationAmount(
            IERC20(vault).balanceOf(_order.maker),
            _order.liquidationShare
        );

        //transfer vault shares from user
        ITokenTransferProxy(_l.transferProxy).transferFrom(
            vault,
            _order.maker,
            address(this),
            liquidationAmount
        );

        //withdraw vault shares for underlying
        IVault(_order.vault).userWithdrawVault(
            liquidationAmount,
            _l.emptyProof,
            _l.proof
        );

        //perform swap for USDC via swapDiamond
        (uint256 swapOutput, uint256 leftOver) = ISwap(_l.swapDiamond).swap(
            _swapData
        );

        IERC20(_swapData.fromToken).safeTransfer(_order.maker, leftOver);

        //calculate fee and transfer to treasury
        (
            uint256 finalUSDCAmount,
            uint256 liquidationFee
        ) = _applyLiquidationFee(swapOutput, _l.vaultFee[vault]);
        IERC20(USDC).transfer(_l.treasury, liquidationFee);

        //deposit remaining tokens to OptyFi USDC vault and send shares to user
        IVault(OPUSDC_VAULT).userDepositVault(
            finalUSDCAmount,
            _l.emptyProof,
            _l.proof
        );
        IERC20(OPUSDC_VAULT).transfer(
            _order.maker,
            IERC20(OPUSDC_VAULT).balanceOf(address(this))
        );
    }

    /**
     * @notice sets the liquidation fee for a target vault
     * @param _l the layout of the limit order contract
     * @param _fee the fee in basis point
     * @param _vault the target vault
     */
    function _setVaultLiquidationFee(
        LimitOrderStorage.Layout storage _l,
        uint256 _fee,
        address _vault
    ) internal {
        _l.vaultFee[_vault] = _fee;
    }

    /**
     * @notice sets the merkle proof required for the contract to make withdrawals/deposits from the vault
     * @param _l the layout of the limit order contract
     * @param _proof the merkle proof
     */
    function _setProof(
        LimitOrderStorage.Layout storage _l,
        bytes32[] memory _proof
    ) internal {
        _l.proof = _proof;
    }

    /**
     * @notice sets the address of the treasury to send limit order fees to
     * @param _l the layout of the limit order contract
     * @param _treasury the address of the treasury
     */
    function _setTreasury(
        LimitOrderStorage.Layout storage _l,
        address _treasury
    ) internal {
        _l.treasury = _treasury;
    }

    /**
     * @notice checks whether a limit order may be executed
     * @param _l the layout of the limit order contract
     * @param _order the order to check
     */
    function _canExecute(
        LimitOrderStorage.Layout storage _l,
        DataTypes.Order memory _order
    ) internal view {
        require(
            _l.userVaultOrderActive[_order.maker][_order.vault] == true,
            'user does not have an active order'
        );
        require(_order.endTime >= block.timestamp, 'order expired');
        require(
            _l.userVaultOrder[_order.maker][_order.vault].id == _order.id,
            'order to execute is not current order'
        );
        _isSpotPriceBound(_fetchSpotPrice(_l, _order), _order);
    }

    /**
     * @notice returns spotPrice of underlying vault token
     * @param _order the order containing the underlying vault token to fetch the spot price for
     * @return spotPrice the spotPrice of the underlying vault token
     */
    function _fetchSpotPrice(
        LimitOrderStorage.Layout storage _l,
        DataTypes.Order memory _order
    ) internal view returns (uint256 spotPrice) {
        spotPrice = IOptyFiOracle(_l.oracle).getTokenPrice(
            IVault(_order.vault).underlyingToken(),
            USD
        );
    }

    /**
     * @notice checks whether a limit order may be created or not
     * @param _l the layout of the limit order contract
     * @param _user the address of the user making the limit order
     * @param _vault the vault the limit order pertains to
     * @param _endTime the end time of the limit order
     */
    function _permitOrderCreation(
        LimitOrderStorage.Layout storage _l,
        address _user,
        address _vault,
        uint256 _endTime
    ) internal view {
        require(
            _l.userVaultOrderActive[_user][_vault] == false,
            'user already has an active limit order'
        );
        require(block.timestamp < _endTime, 'end time in past');
    }

    /**
     * @notice checks whether spotPrice is within an absolute bound of the target price of a limit order
     * @param _spotPrice the spotPrice of the underlying token of the limit order
     * @param _order the limit order containig the target price to check the spot price against
     */
    function _isSpotPriceBound(
        uint256 _spotPrice,
        DataTypes.Order memory _order
    ) internal pure {
        uint256 target = _order.priceTarget;
        uint256 lowerBound = (target - (target * _order.lowerBound) / BASIS);
        uint256 upperBound = (target + (target * _order.upperBound) / BASIS);
        require(
            lowerBound <= _spotPrice && _spotPrice <= upperBound,
            'spotPrice not bound'
        );
    }

    /**
     * @notice returns the total liquidation amount
     * @param _total the total amount to calculate the liquidation amount from
     * @param _liquidationShare the liquidation percentage in basis points
     * @return liquidationAmount the total amount of vault shares to be liquidated
     */
    function _liquidationAmount(uint256 _total, uint256 _liquidationShare)
        internal
        pure
        returns (uint256 liquidationAmount)
    {
        liquidationAmount = (_total * _liquidationShare) / BASIS;
    }

    /**
     * @notice applies the liquidation fee on an amount
     * @param _amount the total amount to apply the fee on
     * @param _vaultFee the fee in basis points pertaining to the particular vault
     * @return finalAmount the left over amount after applying the fee
     * @return fee the total fee
     */
    function _applyLiquidationFee(uint256 _amount, uint256 _vaultFee)
        internal
        pure
        returns (uint256 finalAmount, uint256 fee)
    {
        fee = (_amount * _vaultFee) / BASIS;
        finalAmount = (_amount - fee);
    }
}
