// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { IVault } from '../earn/IVault.sol';
import { LimitOrderStorage } from './LimitOrderStorage.sol';
import { DataTypes } from './DataTypes.sol';
import { Errors } from './Errors.sol';
import { DataTypes as SwapDataTypes } from '../swap/DataTypes.sol';
import { ILimitOrderInternal } from './ILimitOrderInternal.sol';
import { ITokenTransferProxy } from '../utils/ITokenTransferProxy.sol';
import { ERC20Utils } from '../utils/ERC20Utils.sol';
import { ISwapper } from '../swap/ISwapper.sol';

import { IOptyFiOracle } from './IOptyFiOracle.sol';
import { IERC20 } from '@solidstate/contracts/token/ERC20/IERC20.sol';
import { SafeERC20 } from '@solidstate/contracts/utils/SafeERC20.sol';

/**
 * @title Contract for writing limit orders
 * @author OptyFi
 */
contract LimitOrderInternal is ILimitOrderInternal {
    using LimitOrderStorage for LimitOrderStorage.Layout;
    using SafeERC20 for IERC20;

    uint256 public constant BASIS = 1 ether;
    address public immutable USD;
    address public immutable USDC;
    address public immutable OPUSDC_VAULT;

    constructor(
        address _usd,
        address _usdc,
        address _opUSDCVault
    ) {
        USD = _usd;
        USDC = _usdc;
        OPUSDC_VAULT = _opUSDCVault;
    }

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
        DataTypes.Order memory order = _userVaultOrder(_l, _maker, _vault);
        if (order.maker == address(0)) {
            revert Errors.OrderNonExistent();
        }
        _l.userVaultOrderActive[_maker][_vault] = false;
    }

    /**
     * @notice creates a limit order
     * @param _l the layout of the limit order contract
     * @param _orderParams the parameters to create the order with
     * @return order the created limit order
     */
    function _createOrder(
        LimitOrderStorage.Layout storage _l,
        DataTypes.OrderParams memory _orderParams
    ) internal returns (DataTypes.Order memory order) {
        address vault = _orderParams.vault;
        _permitOrderCreation(_l, msg.sender, vault, _orderParams.expiration);

        order.priceTarget = _orderParams.priceTarget;
        order.liquidationShare = _orderParams.liquidationShare;
        order.expiration = _orderParams.expiration;
        order.lowerBound = _orderParams.lowerBound;
        order.upperBound = _orderParams.upperBound;
        order.vault = vault;
        order.maker = payable(msg.sender);
        order.depositUSDC = _orderParams.depositUSDC;

        _l.userVaultOrder[msg.sender][vault] = order;
        _l.userVaultOrderActive[msg.sender][vault] = true;

        emit LimitOrderCreated(order);
    }

    /**
     * @notice modifies an existing order
     * @param _l the layout of the limit order contract
     * @param _vault the address of the vault the order pertains to
     * @param _orderParams the parameters to modify the exited order with
     */
    function _modifyOrder(
        LimitOrderStorage.Layout storage _l,
        address _vault,
        DataTypes.OrderParams memory _orderParams
    ) internal {
        address sender = msg.sender;
        if (_l.userVaultOrderActive[sender][_vault] == false) {
            revert Errors.NoActiveOrder(sender);
        }

        DataTypes.Order memory order = _l.userVaultOrder[sender][_vault];

        if (_orderParams.vault != address(0)) {
            order.vault = _orderParams.vault;
        }
        if (_orderParams.priceTarget != 0) {
            order.priceTarget = _orderParams.priceTarget;
        }
        if (_orderParams.liquidationShare != 0) {
            order.liquidationShare = _orderParams.liquidationShare;
        }
        if (_orderParams.expiration != 0) {
            order.expiration = _orderParams.expiration;
        }
        if (_orderParams.lowerBound != 0) {
            order.lowerBound = _orderParams.lowerBound;
        }
        if (_orderParams.upperBound != 0) {
            order.upperBound = _orderParams.upperBound;
        }
        if (_orderParams.depositUSDC != order.depositUSDC) {
            order.depositUSDC = _orderParams.depositUSDC;
        }

        _l.userVaultOrder[sender][order.vault] = order;
    }

    /**
     * @notice executes a limit order
     * @param _l the layout of the limit order contract
     * @param _maker address of order maker
     * @param _vault address of vault that order pertains to
     * @param _swapData token swap data
     */
    function _execute(
        LimitOrderStorage.Layout storage _l,
        address _maker,
        address _vault,
        SwapDataTypes.SwapData memory _swapData
    ) internal {
        DataTypes.Order memory order = _l.userVaultOrder[_maker][_vault];
        //check order execution critera
        _canExecute(_l, order);

        address vault = order.vault;

        //calculate liquidation amount
        uint256 liquidationAmount = _liquidationAmount(
            IERC20(vault).balanceOf(order.maker),
            order.liquidationShare
        );

        //transfer vault shares from user
        ITokenTransferProxy(_l.transferProxy).transferFrom(
            vault,
            _maker, //TODO: make it so that anyone can execute this function.
            address(this),
            liquidationAmount
        );

        //withdraw vault shares for underlying
        IVault(vault).userWithdrawVault(
            liquidationAmount,
            _l.accountProofs[vault],
            _l.codeProofs[vault]
        );

        uint256 balance = IERC20(IVault(vault).underlyingToken()).balanceOf(
            address(this)
        );

        IERC20(IVault(vault).underlyingToken()).approve(
            // address(0xb14B07CB647e6b60C9d3a86355a575AF0F1d85A8)
            ISwapper(_l.swapDiamond).tokenTransferProxy(),
            balance
        ); //must approve address of ttfp for swapDiamond

        _swapData.fromAmount = balance;
        //perform swap for USDC via swapDiamond
        (uint256 swapOutput, uint256 leftOver) = ISwapper(_l.swapDiamond).swap(
            _swapData
        );

        if (leftOver > 0) {
            IERC20(_swapData.fromToken).safeTransfer(order.maker, leftOver);
        }

        //calculate fee and transfer to treasury
        (
            uint256 finalUSDCAmount,
            uint256 liquidationFee
        ) = _applyLiquidationFee(swapOutput, _vaultFee(_l, vault));

        IERC20(USDC).transfer(_treasury(_l), liquidationFee);

        //deposit remaining tokens to OptyFi USDC vault and send returned shares to user
        //if unsuccessful transfer USDC to user directly
        if (order.depositUSDC) {
            IERC20(USDC).approve(OPUSDC_VAULT, finalUSDCAmount);
            try
                IVault(OPUSDC_VAULT).userDepositVault(
                    finalUSDCAmount,
                    _l.accountProofs[OPUSDC_VAULT],
                    _l.codeProofs[OPUSDC_VAULT]
                )
            {
                IERC20(OPUSDC_VAULT).transfer(
                    order.maker,
                    IERC20(OPUSDC_VAULT).balanceOf(address(this))
                );
            } catch {
                IERC20(USDC).transfer(order.maker, finalUSDCAmount);
            }
        } else {
            IERC20(USDC).transfer(order.maker, finalUSDCAmount);
        }
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
     * @notice set code merkle proof required for the contract to make withdrawals/deposits from the vault
     * @param _l the layout of the limit order contract
     * @param _proof the merkle proof
     * @param _vault address of OptyFi vault to get codeProof for
     */
    function _setCodeProof(
        LimitOrderStorage.Layout storage _l,
        bytes32[] memory _proof,
        address _vault
    ) internal {
        _l.codeProofs[_vault] = _proof;
    }

    /**
     * @notice set account merkle proof required for the contract to make withdrawals/deposits from the vault
     * @param _l the layout of the limit order contract
     * @param _proof the merkle proof
     * @param _vault address of OptyFi vault to set accountProof for
     */
    function _setAccountProof(
        LimitOrderStorage.Layout storage _l,
        bytes32[] memory _proof,
        address _vault
    ) internal {
        _l.accountProofs[_vault] = _proof;
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
     * @notice sets the address of the OptyFiSwapper diamond
     * @param _l the layout of the limit order contract
     * @param _swapDiamond the address of the OptyFiSwapper
     */
    function _setSwapDiamond(
        LimitOrderStorage.Layout storage _l,
        address _swapDiamond
    ) internal {
        _l.swapDiamond = _swapDiamond;
    }

    /**
     * @notice sets the address of the OptyFiOracle to read prices from
     * @param _l the layout of the limit order contract
     * @param _oracle the address of the OptyFiOracle
     */
    function _setOracle(LimitOrderStorage.Layout storage _l, address _oracle)
        internal
    {
        _l.oracle = _oracle;
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
        if (!_l.userVaultOrderActive[_order.maker][_order.vault]) {
            revert Errors.NoActiveOrder(msg.sender);
        }

        if (_order.expiration <= _timestamp()) {
            revert Errors.Expired(_timestamp(), _order.expiration);
        }
        _isPriceBound(_price(_l, _order), _order);
    }

    /**
     * @notice returns price of underlying vault token in stablecoin
     * @dev fetched from OptyFi oracle which uses Chainlink as a default source of truth.
     * @param _order the order containing the underlying vault token to fetch the spot price for
     * @return price the price of the underlying vault token in stablecoin
     */
    function _price(
        LimitOrderStorage.Layout storage _l,
        DataTypes.Order memory _order
    ) internal view returns (uint256 price) {
        price = IOptyFiOracle(_l.oracle).getTokenPrice(
            IVault(_order.vault).underlyingToken(),
            USD
        );
    }

    /**
     * @notice checks whether a limit order may be created or not
     * @param _l the layout of the limit order contract
     * @param _user the address of the user making the limit order
     * @param _vault the vault the limit order pertains to
     * @param _expiration the expiration timestamp of the limit order
     */
    function _permitOrderCreation(
        LimitOrderStorage.Layout storage _l,
        address _user,
        address _vault,
        uint256 _expiration
    ) internal view {
        if (_l.userVaultOrderActive[_user][_vault]) {
            revert Errors.ActiveOrder(_user, _vault);
        }
        if (_timestamp() > _expiration) {
            revert Errors.PastExpiration(_timestamp(), _expiration);
        }
    }

    /**
     * @notice returns a users active limit order for a target vault
     * @param _l the layout of the limit order contract
     * @param _user address of user
     * @param _vault address of vault
     * @return order the active limit order
     */
    function _userVaultOrder(
        LimitOrderStorage.Layout storage _l,
        address _user,
        address _vault
    ) internal view returns (DataTypes.Order memory order) {
        order = _l.userVaultOrder[_user][_vault];
    }

    /**
     * @notice returns a boolean indicating whether a user has an active limit order on a vault
     * @param _l the layout of the limit order contract
     * @param _user address of user
     * @param _vault address of vault
     * @return hasActiveOrder boolean indicating whether user has an active order
     */
    function _userVaultOrderActive(
        LimitOrderStorage.Layout storage _l,
        address _user,
        address _vault
    ) internal view returns (bool hasActiveOrder) {
        hasActiveOrder = _l.userVaultOrderActive[_user][_vault];
    }

    /**
     * @notice returns the liquidation fee for a given vault
     * @param _l the layout of the limit order contract
     * @param _vault address of the vault
     * @return fee in basis points
     */
    function _vaultFee(LimitOrderStorage.Layout storage _l, address _vault)
        internal
        view
        returns (uint256 fee)
    {
        fee = _l.vaultFee[_vault];
    }

    /**
     * @notice returns address of the treasury
     * @param _l the layout of the limit order contract
     * @return treasury address
     */
    function _treasury(LimitOrderStorage.Layout storage _l)
        internal
        view
        returns (address treasury)
    {
        treasury = _l.treasury;
    }

    /**
     * @notice returns LimitOrderDiamond code merkle proof
     * @param _l the layout of the limit order contract
     * @param _vault address of OptyFi vault to get codeProof for
     * @return proof LimitOrder code merkle proof for target vault
     */
    function _codeProof(LimitOrderStorage.Layout storage _l, address _vault)
        internal
        view
        returns (bytes32[] memory proof)
    {
        proof = _l.codeProofs[_vault];
    }

    /**
     * @notice returns LimitOrderDiamond account merkle proof
     * @param _l the layout of the limit order contract
     * @param _vault address of OptyFi vault to get codeProof for
     * @return proof LimitOrder account merkle proof for target vault
     */
    function _accountProof(LimitOrderStorage.Layout storage _l, address _vault)
        internal
        view
        returns (bytes32[] memory proof)
    {
        proof = _l.accountProofs[_vault];
    }

    /**
     * @notice returns address of the OptyFiSwapper diamond
     * @param _l the layout of the limit order contract
     * @return swapDiamond address
     */
    function _swapDiamond(LimitOrderStorage.Layout storage _l)
        internal
        view
        returns (address swapDiamond)
    {
        swapDiamond = _l.swapDiamond;
    }

    /**
     * @notice returns address of the OptyFi Oracle
     * @param _l the layout of the limit order contract
     * @return oracle address
     */
    function _oracle(LimitOrderStorage.Layout storage _l)
        internal
        view
        returns (address oracle)
    {
        oracle = _l.oracle;
    }

    /**
     * @notice returns address of the TokenTransferProxy
     * @param _l the layout of the limit order contract
     * @return transferProxy address
     */
    function _transferProxy(LimitOrderStorage.Layout storage _l)
        internal
        view
        returns (address transferProxy)
    {
        transferProxy = _l.transferProxy;
    }

    /**
     * @notice returns the block timestamp
     * @return uint256 current block timestamp
     */
    function _timestamp() internal view virtual returns (uint256) {
        return block.timestamp;
    }

    /**
     * @notice checks whether price is within an absolute bound of the target price of a limit order
     * @param _price the latest price of the underlying token of the limit order
     * @param _order the limit order containig the target price to check the latest price against
     */
    function _isPriceBound(uint256 _price, DataTypes.Order memory _order)
        internal
        pure
    {
        uint256 target = _order.priceTarget;
        uint256 lowerBound = (target - (target * _order.lowerBound) / BASIS);
        uint256 upperBound = (target + (target * _order.upperBound) / BASIS);

        if (!(lowerBound <= _price && _price <= upperBound)) {
            revert Errors.UnboundPrice(_price, lowerBound, upperBound);
        }
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
