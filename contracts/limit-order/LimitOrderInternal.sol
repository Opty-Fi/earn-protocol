// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { LimitOrderStorage } from "./LimitOrderStorage.sol";
import { DataTypes } from "./DataTypes.sol";
import { Errors } from "./Errors.sol";
import { ILimitOrderInternal } from "../interfaces/limit-order/ILimitOrderInternal.sol";
import { ILimitOrderActions } from "../interfaces/limit-order/ILimitOrderActions.sol";
import { ILimitOrderView } from "../interfaces/limit-order/ILimitOrderView.sol";
import { IOptyFiOracle } from "../optyfi-oracle/contracts/interfaces/IOptyFiOracle.sol";
import { IVault } from "../interfaces/limit-order/IVault.sol";
import { IERC20 } from "@solidstate/contracts/token/ERC20/IERC20.sol";
import { OwnableStorage } from "@solidstate/contracts/access/ownable/OwnableStorage.sol";
import { ISolidStateERC20 } from "@solidstate/contracts/token/ERC20/ISolidStateERC20.sol";
import { IERC2612 } from "@solidstate/contracts/token/ERC20/permit/IERC2612.sol";
import { SafeERC20 } from "@solidstate/contracts/utils/SafeERC20.sol";
import { SafeOwnable } from "@solidstate/contracts/access/ownable/SafeOwnable.sol";
import { IOps } from "../vendor/gelato/IOps.sol";
import { IUniswapV2Router01 } from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router01.sol";
import { ISwapRouter } from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

/**
 * @title Contract for writing limit orders
 * @author OptyFi
 */
abstract contract LimitOrderInternal is ILimitOrderInternal, SafeOwnable {
    using LimitOrderStorage for LimitOrderStorage.Layout;
    using OwnableStorage for OwnableStorage.Layout;
    using SafeERC20 for IERC20;

    uint256 public constant BASIS = 1 ether;
    address public constant USD = address(0x0000000000000000000000000000000000000348);

    constructor() {
        OwnableStorage.layout().setOwner(msg.sender);
    }

    /**
     * @notice cancels an active order
     * @param _l the layout of the limit order contract
     * @param _maker the address of the order maker
     * @param _vault the address of the vault the order pertains to
     * @return taskId of the cancelled order
     */
    function _cancelOrder(
        LimitOrderStorage.Layout storage _l,
        address _maker,
        address _vault
    ) internal returns (bytes32) {
        DataTypes.Order memory _order = _userVaultOrder(_l, _maker, _vault);
        if (_order.maker == address(0)) {
            revert Errors.OrderNonExistent();
        }
        _l.userVaultOrderActive[_maker][_vault] = false;

        IOps(_l.ops).cancelTask(_order.taskId);

        return _order.taskId;
    }

    /**
     * @notice creates a limit order
     * @param _l the layout of the limit order contract
     * @param _orderParams the parameters to create the order with
     * @return _order the created limit order
     */
    function _createOrder(LimitOrderStorage.Layout storage _l, DataTypes.OrderParams memory _orderParams)
        internal
        returns (DataTypes.Order memory _order)
    {
        address _vault = _orderParams.vault;
        address _stablecoinVault = _orderParams.stablecoinVault;
        uint256 _upperBound = _orderParams.upperBound;
        uint256 _lowerBound = _orderParams.lowerBound;
        _permitOrderCreation(
            _l,
            msg.sender,
            _vault,
            _stablecoinVault,
            _orderParams.expiration,
            _lowerBound,
            _upperBound
        );

        bytes32 _taskId =
            IOps(_l.ops).createTask(
                address(this),
                ILimitOrderActions.execute.selector,
                address(this),
                abi.encodeWithSelector(ILimitOrderView.canExecuteOrder.selector, msg.sender, _vault)
            );

        _order.liquidationAmountVT = _orderParams.liquidationAmountVT;
        _order.expectedOutputUT = _orderParams.expectedOutputUT;
        _order.expiration = _orderParams.expiration;
        _order.lowerBound = _lowerBound;
        _order.upperBound = _upperBound;
        _order.direction = _orderParams.direction;
        _order.returnLimitUT = _orderParams.returnLimitUT;
        _order.expectedOutputVT = _orderParams.expectedOutputVT;
        _order.swapDeadlineAdjustment = _orderParams.swapDeadlineAdjustment;
        _order.vault = _vault;
        _order.stablecoinVault = _stablecoinVault;
        _order.maker = payable(msg.sender);
        _order.taskId = _taskId;
        _order.dexRouter = _orderParams.dexRouter;
        _order.swapOnUniV3 = _orderParams.swapOnUniV3;
        _order.permitParams = _orderParams.permitParams;
        if (_order.swapOnUniV3) {
            _order.uniV3Path = _orderParams.uniV3Path;
        } else {
            _order.uniV2Path = _orderParams.uniV2Path;
        }

        _l.userVaultOrder[msg.sender][_vault] = _order;
        _l.userVaultOrderActive[msg.sender][_vault] = true;
    }

    /*solhint-disable code-complexity*/
    /**
     * @notice modifies an existing order
     * @param _l the layout of the limit order contract
     * @param _vault the address of the vault the order pertains to
     * @param _orderParams the parameters to modify the exited order with
     * @return _order the modified limit order
     */
    function _modifyOrder(
        LimitOrderStorage.Layout storage _l,
        address _vault,
        DataTypes.OrderParams memory _orderParams
    ) internal returns (DataTypes.Order memory _order) {
        address _sender = msg.sender;

        if (!_l.userVaultOrderActive[_sender][_vault]) {
            revert Errors.NoActiveOrder(_sender);
        }
        if (_timestamp() > _orderParams.expiration) {
            revert Errors.PastExpiration(_timestamp(), _orderParams.expiration);
        }
        if (_orderParams.lowerBound >= _orderParams.upperBound) {
            revert Errors.ReverseBounds();
        }
        if (!_stablecoinVaultWhitelisted(_l, _orderParams.stablecoinVault)) {
            revert Errors.ForbiddenStablecoinVault();
        }
        if (!_vaultWhitelisted(_l, _orderParams.vault)) {
            revert Errors.ForbiddenVault();
        }

        _order = _l.userVaultOrder[_sender][_vault];

        _order.liquidationAmountVT = _orderParams.liquidationAmountVT;
        _order.expectedOutputUT = _orderParams.expectedOutputUT;
        _order.expiration = _orderParams.expiration;
        _order.lowerBound = _orderParams.lowerBound;
        _order.upperBound = _orderParams.upperBound;
        _order.direction = _orderParams.direction;
        _order.returnLimitUT = _orderParams.returnLimitUT;
        _order.expectedOutputVT = _orderParams.expectedOutputVT;
        _order.swapDeadlineAdjustment = _orderParams.swapDeadlineAdjustment;
        _order.swapOnUniV3 = _orderParams.swapOnUniV3;
        _order.dexRouter = _orderParams.dexRouter;
        _order.permitParams = _orderParams.permitParams;

        if (_orderParams.swapOnUniV3) {
            if (_orderParams.uniV3Path.length != 0) {
                _order.uniV3Path = _orderParams.uniV3Path;
                _order.uniV2Path = new address[](1);
            }
        } else {
            if (_orderParams.uniV2Path.length != 0) {
                _order.uniV2Path = _orderParams.uniV2Path;
                _order.uniV3Path = bytes("");
            }
        }

        _l.userVaultOrder[_sender][_order.vault] = _order;
    }

    /*solhint-enable code-complexity*/

    /**
     * @notice executes a limit order
     * @param _l the layout of the limit order contract
     * @param _maker address of order maker
     * @param _vault address of vault that order pertains to
     * @param _deadline deadline for the swap
     * @return unique identifier of the limit order
     * @return the amount of shares to be liquidated by the limit order
     * @return the fee collected during order fulfillment
     * @return amount in underlying token deposited to stablecoin vault
     * @return amount minted by stablecoin vault
     * @return address of stablecoin vault
     */
    function _execute(
        LimitOrderStorage.Layout storage _l,
        address _maker,
        address _vault,
        uint256 _deadline
    )
        internal
        returns (
            bytes32,
            uint256,
            uint256,
            uint256,
            uint256,
            address
        )
    {
        DataTypes.Order memory _order = _l.userVaultOrder[_maker][_vault];
        address _stablecoinVaultUnderlyingToken = IVault(_order.stablecoinVault).underlyingToken();

        _checkOrder(_order);

        if (msg.sender != _l.ops) {
            IOps(_l.ops).cancelTask(_order.taskId);
        }

        uint256 _vaultUnderlyingTokenAmount = _liquidate(_l, _order);

        uint256 _numOfCoins = _exchange(_order, _vaultUnderlyingTokenAmount, _order.returnLimitUT, _deadline);

        uint256 _feeBP = _l.vaultLiquidationFee[_vault];
        address _treasuryAddress = _l.treasury;
        uint256 _coinsAfterFee = _collectFee(_treasuryAddress, _stablecoinVaultUnderlyingToken, _numOfCoins, _feeBP);

        uint256 _stablecoinAmountVT = _deliver(_coinsAfterFee, _order);

        return (
            _order.taskId,
            _order.liquidationAmountVT,
            _numOfCoins - _coinsAfterFee,
            _coinsAfterFee,
            _stablecoinAmountVT,
            _order.stablecoinVault
        );
    }

    /**
     * @notice internal function to check whether is executable or not
     * @param _order the order to check
     */
    function _checkOrder(DataTypes.Order memory _order) internal view {
        //check order execution criteria
        (bool _isExecutable, string memory _reason) =
            _canExecute(
                _order,
                LimitOrderStorage.layout().userVaultOrderActive[_order.maker][_order.vault],
                IVault(_order.vault).underlyingToken(),
                LimitOrderStorage.layout().oracle
            );

        require(_isExecutable, _reason);
    }

    /**
     * @notice liquidates an amount of shares in the target opVault
     * @param _l LimitOrderStorage Layout struct
     * @param _order the order on which liquidation happens
     * @return _withdrawAmountUT amount in underlying token received upon liquidation
     */
    function _liquidate(LimitOrderStorage.Layout storage _l, DataTypes.Order memory _order)
        internal
        returns (uint256 _withdrawAmountUT)
    {
        if (IERC20(_order.vault).allowance(_order.maker, address(this)) < _order.liquidationAmountVT) {
            (bool success, ) = _order.vault.call(abi.encodePacked(IERC2612.permit.selector, _order.permitParams));
            if (!success) {
                revert Errors.InvalidPermit();
            }
        }
        IERC20(_order.vault).safeTransferFrom(_order.maker, address(this), _order.liquidationAmountVT);
        _withdrawAmountUT = IVault(_order.vault).userWithdrawVault(
            address(this),
            _order.liquidationAmountVT,
            _order.expectedOutputUT,
            _l.accountProofs[_order.vault]
        );
    }

    /**
     * @notice exchanges tokens for USDC via swap diamond
     * @param _order the order to swap
     * @param _vaultUnderlyingTokenAmount token received on liquidation
     * @param _limit the minimum amount of tokens returned as output of the swap
     * @param _deadline deadline for the swap
     * @return stablecoin amount after swap
     */
    function _exchange(
        DataTypes.Order memory _order,
        uint256 _vaultUnderlyingTokenAmount,
        uint256 _limit,
        uint256 _deadline
    ) internal returns (uint256) {
        address _toToken = IVault(_order.stablecoinVault).underlyingToken();
        address _fromToken = IVault(_order.vault).underlyingToken();
        uint256 _toAmountBalanceBeforeSwap = IERC20(_toToken).balanceOf(address(this));
        uint256 _fromAmountBalanceBeforeSwap = IERC20(_fromToken).balanceOf(address(this));
        if (_order.swapOnUniV3) {
            ISwapRouter(_order.dexRouter).exactInput(
                ISwapRouter.ExactInputParams({
                    path: _order.uniV3Path,
                    recipient: address(this),
                    deadline: _deadline,
                    amountIn: _vaultUnderlyingTokenAmount,
                    amountOutMinimum: _limit
                })
            );
        } else {
            IUniswapV2Router01(_order.dexRouter).swapExactTokensForTokens(
                _vaultUnderlyingTokenAmount,
                _limit,
                _order.uniV2Path,
                address(this),
                _deadline
            );
        }
        uint256 _fromAmountBalanceAfterSwap = IERC20(_fromToken).balanceOf(address(this));
        uint256 _leftOverFromAmountUT =
            _fromAmountBalanceBeforeSwap - _vaultUnderlyingTokenAmount - _fromAmountBalanceAfterSwap;
        if (_leftOverFromAmountUT > 0) {
            IERC20(_fromToken).transfer(_order.maker, _leftOverFromAmountUT);
        }
        uint256 _toAmountBalanceAfterSwap = IERC20(_toToken).balanceOf(address(this));
        return _toAmountBalanceAfterSwap - _toAmountBalanceBeforeSwap;
    }

    /**
     * @notice collects liquidation fee and sends to treasury
     * @param _treasuryAddress address of the treasury account
     * @param _stablecoinAmount amount on which liquidation fee is applied
     * @param _stablecoin address of underlying vault stable coin
     * @param _feeBP in basis poitns
     * @return _amountAfterFee amount to be deposited into stablecoin vault
     */
    function _collectFee(
        address _treasuryAddress,
        address _stablecoin,
        uint256 _stablecoinAmount,
        uint256 _feeBP
    ) internal returns (uint256 _amountAfterFee) {
        uint256 _fee = _applyLiquidationFee(_stablecoinAmount, _feeBP);
        _amountAfterFee = _stablecoinAmount - _fee;

        IERC20(_stablecoin).safeTransfer(_treasuryAddress, _fee);
    }

    /**
     * @notice either deposits USDC into opUSDC and sends shares to _maker, or sends USDC directly to maker
     * @param _depositAmountUT amount of stablecoin to be deposited to stablecoin vault
     * @param _order the limit order
     * @return stablecoin vault tokens received
     */
    function _deliver(uint256 _depositAmountUT, DataTypes.Order memory _order) internal returns (uint256) {
        return
            IVault(_order.stablecoinVault).userDepositVault(
                _order.maker,
                _depositAmountUT,
                _order.expectedOutputVT,
                "0x",
                LimitOrderStorage.layout().accountProofs[_order.stablecoinVault]
            );
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
        _l.vaultLiquidationFee[_vault] = _fee;
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
    function _setTreasury(LimitOrderStorage.Layout storage _l, address _treasuryAddress) internal {
        _l.treasury = _treasuryAddress;
    }

    /**
     * @notice sets the address of the OptyFiOracle to read prices from
     * @param _l the layout of the limit order contract
     * @param _oracleAddress the address of the OptyFiOracle
     */
    function _setOracle(LimitOrderStorage.Layout storage _l, address _oracleAddress) internal {
        _l.oracle = _oracleAddress;
    }

    /**
     * @notice sets the address of the operations contract that automated limit order execution
     * @param _l the layout of the limit order contract
     * @param _opsAddress the address of the operations contract
     */
    function _setOps(LimitOrderStorage.Layout storage _l, address _opsAddress) internal {
        _l.ops = _opsAddress;
    }

    /**
     * @notice whitelists a new non-stable coin vault
     * @param _l the LimitOrderStorage Layout struct
     * @param _vault the address of the non-stable coin opVault
     */
    function _setVault(LimitOrderStorage.Layout storage _l, address _vault) internal {
        _l.vaults[_vault] = true;
    }

    /**
     * @notice removes a vault from whitelist
     * @param _l the LimitOrderStorage Layout struct
     * @param _vault the address of the non-stable coin opVault
     */
    function _unsetVault(LimitOrderStorage.Layout storage _l, address _vault) internal {
        _l.vaults[_vault] = false;
    }

    /**
     * @notice whitelists a new vault
     * @param _l the LimitOrderStorage Layout struct
     * @param _vault the address of the opVault
     */
    function _setStablecoinVault(LimitOrderStorage.Layout storage _l, address _vault) internal {
        _l.stablecoinVaults[_vault] = true;
    }

    /**
     * @notice removes a vault from whitelist
     * @param _l the LimitOrderStorage Layout struct
     * @param _vault the address of the opVault
     */
    function _unsetStablecoinVault(LimitOrderStorage.Layout storage _l, address _vault) internal {
        _l.stablecoinVaults[_vault] = false;
    }

    /**
     * @notice provides allowance to spend stop loss contract owned vault tokens
     * @param _tokens the list of tokens
     * @param _spenders the list of spenders
     */
    function _giveAllowances(IERC20[] calldata _tokens, address[] calldata _spenders) internal {
        uint256 _tokensLen = _tokens.length;
        if (_tokensLen != _spenders.length) {
            revert Errors.LengthMismatch();
        }

        for (uint256 _i; _i < _tokens.length; _i++) {
            _tokens[_i].approve(_spenders[_i], type(uint256).max);
        }
    }

    /**
     * @notice revoke allowance to spend stop loss contract owned vault tokens
     * @param _tokens the list of tokens
     * @param _spenders the list of spenders
     */
    function _removeAllowances(IERC20[] calldata _tokens, address[] calldata _spenders) internal {
        uint256 _tokensLen = _tokens.length;
        if (_tokensLen != _spenders.length) {
            revert Errors.LengthMismatch();
        }
        for (uint256 _i; _i < _tokens.length; _i++) {
            _tokens[_i].approve(_spenders[_i], 0);
        }
    }

    /**
     * @notice checks whether a limit order may be executed
     * @param _order the order to check
     * @param _activeOrder whether the order is active or not
     * @param _underlyingToken underlying token of non-stablecoin vault
     * @param _oracleAddress the address of oracle contract
     */
    function _canExecute(
        DataTypes.Order memory _order,
        bool _activeOrder,
        address _underlyingToken,
        address _oracleAddress
    ) internal view returns (bool, string memory) {
        if (!_activeOrder) {
            return (false, "no active order");
        }

        if (_order.expiration <= _timestamp()) {
            return (false, "expired");
        }

        if (IERC20(_order.vault).balanceOf(_order.maker) < _order.liquidationAmountVT) {
            return (false, "Not enough shares");
        }

        return _areBoundsSatisfied(_price(_oracleAddress, _underlyingToken), _order);
    }

    /**
     * @notice returns price of underlying vault token in USD
     * @dev fetched from OptyFiOracle which uses Chainlink as a default source of truth. A fallback oracle
     * is used in case Chainlink does not provide one.
     * @param _oracleAddress address of the OptyFiOracle
     * @param _token address of the underlying vault token of the made LimitOrder
     * @return _priceInUSD the price of the underlying vault token in USD
     */
    function _price(address _oracleAddress, address _token) internal view returns (uint256 _priceInUSD) {
        _priceInUSD = IOptyFiOracle(_oracleAddress).getTokenPrice(_token, USD);
        if (_priceInUSD == 0) {
            revert Errors.OracleZeroPrice();
        }
    }

    /**
     * @notice checks whether a limit order may be created or not
     * @param _l the layout of the limit order contract
     * @param _user the address of the user making the limit order
     * @param _vault the non-stablecoin vault the limit order pertains to
     * @param _stablecoinVault the opVault with stable coins as underlying to send liquidated shares to
     * @param _expiration the expiration timestamp of the limit order
     * @param _lowerBound the lower bound of the limit order in USD price of the underlying token
     * @param _upperBound the upper bound of the limit order in USD price of the underlying token
     */
    function _permitOrderCreation(
        LimitOrderStorage.Layout storage _l,
        address _user,
        address _vault,
        address _stablecoinVault,
        uint256 _expiration,
        uint256 _lowerBound,
        uint256 _upperBound
    ) internal view {
        if (_l.vaults[_vault] == false) {
            revert Errors.ForbiddenVault();
        }

        if (_l.userVaultOrderActive[_user][_vault]) {
            revert Errors.ActiveOrder(_user, _vault);
        }
        if (_timestamp() > _expiration) {
            revert Errors.PastExpiration(_timestamp(), _expiration);
        }
        if (_lowerBound >= _upperBound) {
            revert Errors.ReverseBounds();
        }
        if (_l.stablecoinVaults[_stablecoinVault] == false) {
            revert Errors.ForbiddenStablecoinVault();
        }
    }

    /**
     * @notice returns a users active limit order for a target vault
     * @param _l the layout of the limit order contract
     * @param _user address of user
     * @param _vault address of vault
     * @return the active limit order
     */
    function _userVaultOrder(
        LimitOrderStorage.Layout storage _l,
        address _user,
        address _vault
    ) internal view returns (DataTypes.Order memory) {
        return _l.userVaultOrder[_user][_vault];
    }

    /**
     * @notice returns a boolean indicating whether a user has an active limit order on a vault
     * @param _l the layout of the limit order contract
     * @param _user address of user
     * @param _vault address of vault
     * @return boolean indicating whether user has an active order
     */
    function _userVaultOrderActive(
        LimitOrderStorage.Layout storage _l,
        address _user,
        address _vault
    ) internal view returns (bool) {
        return _l.userVaultOrderActive[_user][_vault];
    }

    /**
     * @notice returns the liquidation fee for a given vault
     * @param _l the layout of the limit order contract
     * @param _vault address of the vault
     * @return fee in basis points
     */
    function _vaultLiquidationFee(LimitOrderStorage.Layout storage _l, address _vault) internal view returns (uint256) {
        return _l.vaultLiquidationFee[_vault];
    }

    /**
     * @notice returns address of the treasury
     * @param _l the layout of the limit order contract
     * @return treasury address
     */
    function _treasury(LimitOrderStorage.Layout storage _l) internal view returns (address treasury) {
        return _l.treasury;
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
        returns (bytes32[] memory)
    {
        return _l.accountProofs[_vault];
    }

    /**
     * @notice returns address of the OptyFi Oracle
     * @param _l the layout of the limit order contract
     * @return oracle address
     */
    function _oracle(LimitOrderStorage.Layout storage _l) internal view returns (address) {
        return _l.oracle;
    }

    /**
     * @notice returns address of the operations contract that assists limit order
     * @param _l the layout of the limit order contract
     * @return ops address
     */
    function _ops(LimitOrderStorage.Layout storage _l) internal view returns (address) {
        return _l.ops;
    }

    /**
     * @notice returns the block timestamp
     * @return uint256 current block timestamp
     */
    function _timestamp() internal view virtual returns (uint256) {
        return block.timestamp;
    }

    /**
     * @notice returns the whitelisted state of a stablecoin vault
     * @param _l LimitOrderStorage layout struct
     * @param _vault address of stable coin vault
     */
    function _stablecoinVaultWhitelisted(LimitOrderStorage.Layout storage _l, address _vault)
        internal
        view
        virtual
        returns (bool)
    {
        return _l.stablecoinVaults[_vault];
    }

    /**
     * @notice returns the whitelisted state of a non-stable coin vault
     * @param _l LimitOrderStorage layout struct
     * @param _vault address of non-stable coin vault
     */
    function _vaultWhitelisted(LimitOrderStorage.Layout storage _l, address _vault)
        internal
        view
        virtual
        returns (bool)
    {
        return _l.vaults[_vault];
    }

    /**
     * @notice checks whether price is within an absolute bound of the target price of a limit order
     * @param _latestPrice the latest price of the underlying token of the limit order
     * @param _order the limit order containing the target price to check the latest price against
     * @return boolean whether bounds are satisfied or not
     * @return error reason string
     */
    function _areBoundsSatisfied(uint256 _latestPrice, DataTypes.Order memory _order)
        internal
        pure
        returns (bool, string memory)
    {
        uint256 _lowerBound = _order.lowerBound;
        uint256 _upperBound = _order.upperBound;

        if (_order.direction == DataTypes.BoundDirection.Out) {
            if (!(_lowerBound >= _latestPrice || _latestPrice >= _upperBound)) {
                return (false, "price within bounds");
            }
        } else {
            if (!(_lowerBound <= _latestPrice && _latestPrice <= _upperBound)) {
                return (false, "price out with bounds");
            }
        }
        return (true, "");
    }

    /**
     * @notice applies the liquidation fee on an amount
     * @param _amount the total amount to apply the fee on
     * @param _vaultFeeUT the fee in basis points pertaining to the particular vault
     * @return fee the total fee
     */
    function _applyLiquidationFee(uint256 _amount, uint256 _vaultFeeUT) internal pure returns (uint256) {
        return (_amount * _vaultFeeUT) / BASIS;
    }

    /**
     * @notice resolver function for automation relayer
     * @param _maker address of limit order creator
     * @param _vault address of the vault
     * @return canExec whether Ops should execute the task
     * @return execPayload data that executors should use for the execution
     */
    function _canExecuteOrder(address _maker, address _vault) internal view returns (bool, bytes memory) {
        DataTypes.Order memory _order = LimitOrderStorage.layout().userVaultOrder[_maker][_vault];
        address _vaultUnderlyingToken = IVault(_vault).underlyingToken();

        (bool _isExecutable, string memory _reason) =
            _canExecute(
                _order,
                LimitOrderStorage.layout().userVaultOrderActive[_maker][_vault],
                _vaultUnderlyingToken,
                LimitOrderStorage.layout().oracle
            );

        if (!_isExecutable) {
            return (false, bytes(_reason));
        }

        return (
            true,
            abi.encodeCall(ILimitOrderActions.execute, (_maker, _vault, _timestamp() + _order.swapDeadlineAdjustment))
        );
    }

    /**
     * @notice transfer tokens to beneficiary incase it get stuck in this contract
     * @param _token the token address
     * @param _recipient beneficiary address to receive tokens
     * @param _amount amount of tokens to transfer
     */
    function _inCaseTokensGetStuck(
        IERC20 _token,
        address _recipient,
        uint256 _amount
    ) internal {
        if (address(_token) == address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE)) {
            payable(_recipient).transfer(_amount);
        } else {
            _token.transfer(_recipient, _amount);
        }
    }
}
