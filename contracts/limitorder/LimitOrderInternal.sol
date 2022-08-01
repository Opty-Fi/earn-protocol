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
     * @param _swapParams swap params
     */
    function _execute(
        LimitOrderStorage.Layout storage _l,
        address _maker,
        address _vault,
        DataTypes.SwapParams calldata _swapParams
    ) internal {
        DataTypes.Order memory order = _l.userVaultOrder[_maker][_vault];
        address token = IVault(_vault).underlyingToken();
        address oracle = _l.oracle;

        //check order execution criteria
        _canExecute(_l, order, _maker, _vault, token, oracle);

        (uint256 tokens, uint256 limit) = _liquidate(
            _l,
            _vault,
            _maker,
            token,
            oracle,
            order.liquidationShare
        );

        uint256 usdc = _exchange(
            _l,
            _toSwapData(_swapParams, token, tokens, limit),
            _maker,
            limit
        );

        uint256 usdcAfterFee = _collectFee(_l, usdc, _vaultFee(_l, _vault));

        _deliver(_l, order.depositUSDC, usdcAfterFee, _maker);
    }

    /**
     * @notice liquidates an amount of shares in the target opVault
     * @param _l LimitOrderStorage Layout struct
     * @param _vault address of opVault
     * @param _maker address providing shares to liquidate - Limit Order maker
     * @param _shareBP liquidation share in basis points
     * @param _token the address of the underlying token of the _vault
     * @return tokens amount of underlying tokens provided by opVault withdrawal
     */
    function _liquidate(
        LimitOrderStorage.Layout storage _l,
        address _vault,
        address _maker,
        address _token,
        address _oracle,
        uint256 _shareBP
    ) internal returns (uint256 tokens, uint256 limit) {
        uint256 amount = _liquidationAmount(
            IERC20(_vault).balanceOf(_maker),
            _shareBP
        );

        IERC20(_vault).safeTransferFrom(_maker, address(this), amount);

        IVault(_vault).userWithdrawVault(
            amount,
            _l.accountProofs[_vault],
            _l.codeProofs[_vault]
        );

        tokens = IERC20(_token).balanceOf(address(this));

        limit = _returnLimit(
            tokens,
            _priceUSDC(_oracle, _token),
            _l.returnLimitBP
        );
    }

    /**
     * @notice exchanges tokens for USDC via swap diamond
     * @param _l LimitOrderStorage Layout struct
     * @param _swapData data to perform a swap via swap diamond
     * @param _maker address of LimitOrder maker
     * @param _limit the minimum amount of tokens returned as output of the swap
     * @return output output amount of USDC
     */
    function _exchange(
        LimitOrderStorage.Layout storage _l,
        SwapDataTypes.SwapData memory _swapData,
        address _maker,
        uint256 _limit
    ) internal returns (uint256 output) {
        IERC20(_swapData.fromToken).approve(
            ISwapper(_l.swapDiamond).tokenTransferProxy(),
            _swapData.fromAmount
        );

        uint256 leftOver;

        (output, leftOver) = ISwapper(_l.swapDiamond).swap(_swapData);

        if (_limit > output) {
            revert Errors.InsufficientReturn();
        }

        if (leftOver > 0) {
            IERC20(_swapData.fromToken).safeTransfer(_maker, leftOver);
        }
    }

    /**
     * @notice collects liquidation fee and sends to treasury
     * @param _amount amount to deduct fee from
     * @param _feeBP in basis poitns
     */
    function _collectFee(
        LimitOrderStorage.Layout storage _l,
        uint256 _amount,
        uint256 _feeBP
    ) internal returns (uint256 amountAfterFee) {
        uint256 fee = _applyLiquidationFee(_amount, _feeBP);
        amountAfterFee = _amount - fee;

        IERC20(USDC).safeTransfer(_treasury(_l), fee);
    }

    /**
     * @notice either deposits USDC into opUSDC and sends shares to _maker, or sends USDC directly to maker
     * @param _l LimitOrderStorage Layout struct
     * @param _depositUSDC bool determining whether to deposit and send shares, or send USDC directly
     * @param _amount amount of USDC
     * @param _maker address to deliver final shares or USDC to
     */
    function _deliver(
        LimitOrderStorage.Layout storage _l,
        bool _depositUSDC,
        uint256 _amount,
        address _maker
    ) internal {
        if (_depositUSDC) {
            IERC20(USDC).approve(OPUSDC_VAULT, _amount);
            try
                IVault(OPUSDC_VAULT).userDepositVault(
                    _amount,
                    _l.accountProofs[OPUSDC_VAULT],
                    _l.codeProofs[OPUSDC_VAULT]
                )
            {
                IERC20(OPUSDC_VAULT).transfer(
                    _maker,
                    IERC20(OPUSDC_VAULT).balanceOf(address(this))
                );
            } catch {
                IERC20(USDC).transfer(_maker, _amount);
            }
        } else {
            IERC20(USDC).transfer(_maker, _amount);
        }
    }

    /**
     * @notice sets liquidation fee for a target vault
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
     * @notice sets code merkle proof required for the contract to make withdrawals/deposits from the vault
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
     * @notice sets account merkle proof required for the contract to make withdrawals/deposits from the vault
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
        DataTypes.Order memory _order,
        address _maker,
        address _vault,
        address _token,
        address _oracle
    ) internal view {
        if (!_l.userVaultOrderActive[_maker][_vault]) {
            revert Errors.NoActiveOrder(msg.sender);
        }

        if (_order.expiration <= _timestamp()) {
            revert Errors.Expired(_timestamp(), _order.expiration);
        }
        _isPriceBound(_price(_oracle, _token), _order);
    }

    /**
     * @notice returns price of underlying vault token in USD
     * @dev fetched from OptyFiOracle which uses Chainlink as a default source of truth. A fallback oracle
     * is used in case Chainlink does not provide one.
     * @param _oracle address of the OptyFiOracle
     * @param _token address of the underlying vault token of the made LimitOrder
     * @return price the price of the underlying vault token in USD
     */
    function _price(address _oracle, address _token)
        internal
        view
        returns (uint256 price)
    {
        price = IOptyFiOracle(_oracle).getTokenPrice(_token, USD);
    }

    /**
     * @notice returns price of a token in USDC
     * @dev fetched from OptyFiOracle which uses Chainlink as a default source of truth. A fallback oracle
     * is used in case Chainlink does not provide one.
     * @param _oracle address of the OptyFiOracle
     * @param _token address of the underlying vault token of the made LimitOrder
     * @return price the price of the token in USDC
     */
    function _priceUSDC(address _oracle, address _token)
        internal
        view
        returns (uint256 price)
    {
        price = IOptyFiOracle(_oracle).getTokenPrice(_token, USDC);
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
     * @param _vault address of OptyFi vault to get accountProof for
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
     * @param _order the limit order containing the target price to check the latest price against
     */
    function _isPriceBound(uint256 _price, DataTypes.Order memory _order)
        internal
        pure
    {
        //note: may be done inline
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
     * @return fee the total fee
     */
    function _applyLiquidationFee(uint256 _amount, uint256 _vaultFee)
        internal
        pure
        returns (uint256 fee)
    {
        fee = (_amount * _vaultFee) / BASIS;
    }

    function _toSwapData(
        DataTypes.SwapParams calldata _swapParams,
        address _fromToken,
        uint256 _fromAmount,
        uint256 _limit
    ) internal view returns (SwapDataTypes.SwapData memory swapData) {
        swapData.deadline = _swapParams.deadline;
        swapData.startIndexes = _swapParams.startIndexes;
        swapData.values = _swapParams.values;
        swapData.callees = _swapParams.callees;
        swapData.exchangeData = _swapParams.exchangeData;
        swapData.permit = _swapParams.permit;
        swapData.beneficiary = payable(address(this));
        swapData.toToken = USDC;
        swapData.toAmount = _limit;
        swapData.fromToken = _fromToken;
        swapData.fromAmount = _fromAmount;
    }

    function _returnLimit(
        uint256 _amount,
        uint256 _priceUSDC,
        uint256 _limitBP
    ) internal pure returns (uint256 limit) {
        limit = (_limitBP * _priceUSDC * _amount) / (BASIS * BASIS * 10**12);
    }
}
