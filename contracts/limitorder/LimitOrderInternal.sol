// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { LimitOrderStorage } from './LimitOrderStorage.sol';
import { DataTypes } from './DataTypes.sol';
import { Errors } from './Errors.sol';
import { ILimitOrderInternal } from './ILimitOrderInternal.sol';
import { ILimitOrderActions } from './ILimitOrderActions.sol';
import { ILimitOrderView } from './ILimitOrderView.sol';

import { IVault } from '../earn-interfaces/IVault.sol';
import { IOptyFiOracle } from '../optyfi-oracle/contracts/interfaces/IOptyFiOracle.sol';
import { DataTypes as SwapDataTypes } from '../optyfi-swapper/contracts/swap/DataTypes.sol';
import { ISwapper } from '../optyfi-swapper/contracts/swap/ISwapper.sol';
import { ITokenTransferProxy } from '../optyfi-swapper/contracts/utils/ITokenTransferProxy.sol';
import { IERC20 } from '@solidstate/contracts/token/ERC20/IERC20.sol';
import { ISolidStateERC20 } from '@solidstate/contracts/token/ERC20/ISolidStateERC20.sol';
import { SafeERC20 } from '@solidstate/contracts/utils/SafeERC20.sol';
import { IOps } from '../vendor/gelato/IOps.sol';
import { IUniswapV2Router01 } from '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router01.sol';

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

        IOps(_l.ops).cancelTask(order.taskId);
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
        uint256 upperBound = _orderParams.upperBound;
        uint256 lowerBound = _orderParams.lowerBound;
        _permitOrderCreation(
            _l,
            msg.sender,
            vault,
            _orderParams.expiration,
            lowerBound,
            upperBound
        );

        bytes32 _taskId = IOps(_l.ops).createTask(
            address(this),
            ILimitOrderActions.execute.selector,
            address(this),
            abi.encodeWithSelector(
                ILimitOrderView.canExecuteOrder.selector,
                msg.sender,
                vault
            )
        );

        order.liquidationAmount = _orderParams.liquidationAmount;
        order.expiration = _orderParams.expiration;
        order.lowerBound = lowerBound;
        order.upperBound = upperBound;
        order.direction = _orderParams.direction;
        order.returnLimitBP = _orderParams.returnLimitBP;
        order.vault = vault;
        order.maker = payable(msg.sender);
        order.taskId = _taskId;

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

        order.liquidationAmount = _orderParams.liquidationAmount;

        if (_orderParams.expiration != 0) {
            order.expiration = _orderParams.expiration;
        }
        if (_orderParams.lowerBound != 0) {
            order.lowerBound = _orderParams.lowerBound;
        }
        if (_orderParams.upperBound != 0) {
            order.upperBound = _orderParams.upperBound;
        }
        if (_orderParams.direction != order.direction) {
            order.direction = _orderParams.direction;
        }
        if (_orderParams.returnLimitBP != 0) {
            order.returnLimitBP = _orderParams.returnLimitBP;
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

        //check order execution criteria
        (bool _isExecutable, string memory _reason) = _canExecute(
            _l,
            order,
            _maker,
            _vault,
            token,
            _l.oracle
        );

        require(_isExecutable, _reason);

        if (msg.sender != _l.ops) {
            IOps(_l.ops).cancelTask(order.taskId);
        }

        (uint256 tokens, uint256 limit) = _liquidate(
            _l,
            _vault,
            _maker,
            token,
            _l.oracle,
            order.liquidationAmount,
            order.returnLimitBP
        );

        uint256 usdc = _exchange(
            _l,
            _toSwapData(_swapParams, token, tokens, limit),
            _maker,
            limit
        );

        uint256 usdcAfterFee = _collectFee(_l, usdc, _vaultFee(_l, _vault));

        _deliver(_l, usdcAfterFee, _maker);
    }

    /**
     * @notice liquidates an amount of shares in the target opVault
     * @param _l LimitOrderStorage Layout struct
     * @param _vault address of opVault
     * @param _maker address providing shares to liquidate - Limit Order maker
     * @param _amount amount of shares to liquidate
     * @param _token the address of the underlying token of the _vault
     * @return tokens amount of underlying tokens provided by opVault withdrawal
     */
    function _liquidate(
        LimitOrderStorage.Layout storage _l,
        address _vault,
        address _maker,
        address _token,
        address _oracleAddress,
        uint256 _amount,
        uint256 _limitBP
    ) internal returns (uint256 tokens, uint256 limit) {
        IERC20(_vault).safeTransferFrom(_maker, address(this), _amount);

        tokens = IVault(_vault).userWithdrawVault(
            address(this),
            _amount,
            _l.accountProofs[_vault],
            _l.codeProofs[_vault]
        );

        limit = _returnLimit(
            tokens,
            _priceUSDC(_oracleAddress, _token),
            _limitBP
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
     * @param _amount amount of USDC
     * @param _maker address to deliver final shares or USDC to
     */
    function _deliver(
        LimitOrderStorage.Layout storage _l,
        uint256 _amount,
        address _maker
    ) internal {
        IERC20(USDC).approve(OPUSDC_VAULT, _amount);
        try
            IVault(OPUSDC_VAULT).userDepositVault(
                _maker,
                _amount,
                '0x',
                _l.accountProofs[OPUSDC_VAULT],
                _l.codeProofs[OPUSDC_VAULT]
            )
        {
            emit DeliverShares(_maker);
        } catch {
            IERC20(USDC).transfer(_maker, _amount);
            emit DeliverUSDC(_maker, _amount);
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
     * @param _treasuryAddress the address of the treasury
     */
    function _setTreasury(
        LimitOrderStorage.Layout storage _l,
        address _treasuryAddress
    ) internal {
        _l.treasury = _treasuryAddress;
    }

    /**
     * @notice sets the address of the OptyFiSwapper diamond
     * @param _l the layout of the limit order contract
     * @param _swapDiamondAddress the address of the OptyFiSwapper
     */
    function _setSwapDiamond(
        LimitOrderStorage.Layout storage _l,
        address _swapDiamondAddress
    ) internal {
        _l.swapDiamond = _swapDiamondAddress;
    }

    /**
     * @notice sets the address of the OptyFiOracle to read prices from
     * @param _l the layout of the limit order contract
     * @param _oracleAddress the address of the OptyFiOracle
     */
    function _setOracle(
        LimitOrderStorage.Layout storage _l,
        address _oracleAddress
    ) internal {
        _l.oracle = _oracleAddress;
    }

    /**
     * @notice sets the address of the operations contract that automated limit order execution
     * @param _l the layout of the limit order contract
     * @param _opsAddress the address of the operations contract
     */
    function _setOps(LimitOrderStorage.Layout storage _l, address _opsAddress)
        internal
    {
        _l.ops = _opsAddress;
    }

    /**
     * @notice sets the address of the DEX for swapping tokens
     * @param _l the layout of the limit order contract
     * @param _exchangeRouterAddress the address of DEX
     */
    function _setExchangeRouter(
        LimitOrderStorage.Layout storage _l,
        address _exchangeRouterAddress
    ) internal {
        _l.exchangeRouter = _exchangeRouterAddress;
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
        address _oracleAddress
    ) internal view returns (bool, string memory) {
        if (!_l.userVaultOrderActive[_maker][_vault]) {
            return (false, 'no active order');
        }

        if (_order.expiration <= _timestamp()) {
            return (false, 'expired');
        }
        return _areBoundsSatisfied(_price(_oracleAddress, _token), _order);
    }

    /**
     * @notice returns price of underlying vault token in USD
     * @dev fetched from OptyFiOracle which uses Chainlink as a default source of truth. A fallback oracle
     * is used in case Chainlink does not provide one.
     * @param _oracleAddress address of the OptyFiOracle
     * @param _token address of the underlying vault token of the made LimitOrder
     * @return price the price of the underlying vault token in USD
     */
    function _price(address _oracleAddress, address _token)
        internal
        view
        returns (uint256 price)
    {
        price = IOptyFiOracle(_oracleAddress).getTokenPrice(_token, USD);
    }

    /**
     * @notice returns price of a token in USDC
     * @dev fetched from OptyFiOracle which uses Chainlink as a default source of truth. A fallback oracle
     * is used in case Chainlink does not provide one.
     * @param _oracleAddress address of the OptyFiOracle
     * @param _token address of the underlying vault token of the made LimitOrder
     * @return price the price of the token in USDC
     */
    function _priceUSDC(address _oracleAddress, address _token)
        internal
        view
        returns (uint256 price)
    {
        price = IOptyFiOracle(_oracleAddress).getTokenPrice(_token, USDC);
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
        uint256 _expiration,
        uint256 _lowerBound,
        uint256 _upperBound
    ) internal view {
        if (_l.userVaultOrderActive[_user][_vault]) {
            revert Errors.ActiveOrder(_user, _vault);
        }
        if (_timestamp() > _expiration) {
            revert Errors.PastExpiration(_timestamp(), _expiration);
        }
        if (_lowerBound >= _upperBound) {
            revert Errors.ReverseBounds();
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
     * @notice returns address of the operations contract that assists limit order
     * @param _l the layout of the limit order contract
     * @return ops address
     */
    function _ops(LimitOrderStorage.Layout storage _l)
        internal
        view
        returns (address ops)
    {
        ops = _l.ops;
    }

    /**
     * @notice returns address of the DEX
     * @param _l the layout of the limit order contract
     * @return exchangeRouter address
     */
    function _exchangeRouter(LimitOrderStorage.Layout storage _l)
        internal
        view
        returns (address exchangeRouter)
    {
        exchangeRouter = _l.exchangeRouter;
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
     * @param _latestPrice the latest price of the underlying token of the limit order
     * @param _order the limit order containing the target price to check the latest price against
     */
    function _areBoundsSatisfied(
        uint256 _latestPrice,
        DataTypes.Order memory _order
    ) internal pure returns (bool, string memory) {
        uint256 lowerBound = _order.lowerBound;
        uint256 upperBound = _order.upperBound;

        if (_order.direction == DataTypes.BoundDirection.Out) {
            if (!(lowerBound >= _latestPrice || _latestPrice >= upperBound)) {
                return (false, 'price within bounds');
            }
        } else {
            if (!(lowerBound <= _latestPrice && _latestPrice <= upperBound)) {
                return (false, 'price out with bounds');
            }
        }
        return (true, '');
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
     * @param _vaultFeeUT the fee in basis points pertaining to the particular vault
     * @return fee the total fee
     */
    function _applyLiquidationFee(uint256 _amount, uint256 _vaultFeeUT)
        internal
        pure
        returns (uint256 fee)
    {
        fee = (_amount * _vaultFeeUT) / BASIS;
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

    /**
     * @notice resolver function for automation relayer
     * @param _maker address of limit order creator
     * @param _vault address of the vault
     * @return canExec whether Ops should execute the task
     * @return execPayload data that executors should use for the execution
     */
    function _canExecuteOrder(address _maker, address _vault)
        internal
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

        (bool _isExecutable, string memory _reason) = _canExecute(
            LimitOrderStorage.layout(),
            _order,
            _maker,
            _vault,
            _vaultUnderlyingToken,
            LimitOrderStorage.layout().oracle
        );
        if (!_isExecutable) {
            return (false, bytes(_reason));
        }

        address[] memory _addrs = new address[](2);
        _addrs[0] = _vaultUnderlyingToken;
        _addrs[1] = USDC;

        bytes memory _swapData = abi.encodeCall(
            IUniswapV2Router01.swapExactTokensForTokens,
            (
                _amountIn,
                (((_amountIn *
                    _priceUSDC(
                        LimitOrderStorage.layout().oracle,
                        _vaultUnderlyingToken
                    ) *
                    10**ISolidStateERC20(USDC).decimals()) /
                    10 **
                        (18 +
                            ISolidStateERC20(_vaultUnderlyingToken)
                                .decimals())) * 99) / 100,
                _addrs,
                LimitOrderStorage.layout().swapDiamond,
                _timestamp() + 20 minutes
            )
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

        return (
            true,
            abi.encodeCall(
                ILimitOrderActions.execute,
                (
                    _maker,
                    _vault,
                    DataTypes.SwapParams({
                        deadline: _timestamp() + 10 minutes,
                        startIndexes: _startIndexes,
                        values: _values,
                        callees: _callees,
                        exchangeData: _exchangeData,
                        permit: bytes('')
                    })
                )
            )
        );
    }

    function _returnLimit(
        uint256 _amount,
        uint256 _priceInUSDC,
        uint256 _limitBP
    ) internal pure returns (uint256 limit) {
        limit = (_limitBP * _priceInUSDC * _amount) / (BASIS * BASIS * 10**12);
    }
}
