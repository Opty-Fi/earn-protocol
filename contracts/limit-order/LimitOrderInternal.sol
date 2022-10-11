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
import { SafeERC20 } from "@solidstate/contracts/utils/SafeERC20.sol";
import { IOps } from "../vendor/gelato/IOps.sol";
import { IUniswapV2Router01 } from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router01.sol";
import { ISwapRouter } from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

/**
 * @title Contract for writing limit orders
 * @author OptyFi
 */
abstract contract LimitOrderInternal is ILimitOrderInternal {
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
    function _createOrder(LimitOrderStorage.Layout storage _l, DataTypes.OrderParams memory _orderParams)
        internal
        returns (DataTypes.Order memory order)
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

        order.liquidationAmountVT = _orderParams.liquidationAmountVT;
        order.expectedOutputUT = _orderParams.expectedOutputUT;
        order.expiration = _orderParams.expiration;
        order.lowerBound = _lowerBound;
        order.upperBound = _upperBound;
        order.direction = _orderParams.direction;
        order.returnLimitUT = _orderParams.returnLimitUT;
        order.expectedOutputVT = _orderParams.expectedOutputVT;
        order.vault = _vault;
        order.stablecoinVault = _stablecoinVault;
        order.maker = payable(msg.sender);
        order.taskId = _taskId;
        order.dexRouter = _orderParams.dexRouter;
        order.swapOnUniV3 = _orderParams.swapOnUniV3;
        if (order.swapOnUniV3) {
            order.uniV3Path = _orderParams.uniV3Path;
        } else {
            order.uniV2Path = _orderParams.uniV2Path;
        }

        _l.userVaultOrder[msg.sender][_vault] = order;
        _l.userVaultOrderActive[msg.sender][_vault] = true;

        emit LimitOrderCreated(order);
    }

    /*solhint-disable code-complexity*/
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
        if (!_l.userVaultOrderActive[sender][_vault]) {
            revert Errors.NoActiveOrder(sender);
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
        if (!_vaultWhitelisted(_l, _orderParams.stablecoinVault)) {
            revert Errors.ForbiddenVault();
        }

        DataTypes.Order memory order = _l.userVaultOrder[sender][_vault];

        if (_orderParams.vault != address(0) && _orderParams.vault != order.vault) {
            order.vault = _orderParams.vault;
        }

        order.liquidationAmountVT = _orderParams.liquidationAmountVT;
        order.expectedOutputUT = _orderParams.expectedOutputUT;
        order.expiration = _orderParams.expiration;
        order.lowerBound = _orderParams.lowerBound;
        order.upperBound = _orderParams.upperBound;
        order.direction = _orderParams.direction;
        order.returnLimitUT = _orderParams.returnLimitUT;
        order.expectedOutputVT = _orderParams.expectedOutputVT;
        order.swapOnUniV3 = _orderParams.swapOnUniV3;
        order.dexRouter = _orderParams.dexRouter;

        if (_orderParams.swapOnUniV3) {
            if (_orderParams.uniV3Path.length != 0) {
                order.uniV3Path = _orderParams.uniV3Path;
                order.uniV2Path = new address[](1);
            }
        } else {
            if (_orderParams.uniV2Path.length != 0) {
                order.uniV2Path = _orderParams.uniV2Path;
                order.uniV3Path = bytes("");
            }
        }

        _l.userVaultOrder[sender][order.vault] = order;
    }

    /*solhint-enable code-complexity*/

    /**
     * @notice executes a limit order
     * @param _l the layout of the limit order contract
     * @param _maker address of order maker
     * @param _vault address of vault that order pertains to
     */
    function _execute(
        LimitOrderStorage.Layout storage _l,
        address _maker,
        address _vault
    ) internal {
        DataTypes.Order memory _order = _l.userVaultOrder[_maker][_vault];
        address _vaultUnderlyingToken = IVault(_vault).underlyingToken();
        address _stablecoinVaultUnderlyingToken = IVault(_order.stablecoinVault).underlyingToken();

        //check order execution criteria
        (bool _isExecutable, string memory _reason) =
            _canExecute(_order, _l.userVaultOrderActive[_order.maker][_vault], _vaultUnderlyingToken, _l.oracle);

        require(_isExecutable, _reason);

        if (msg.sender != _l.ops) {
            IOps(_l.ops).cancelTask(_order.taskId);
        }

        uint256 _vaultUnderlyingTokenAmount =
            _liquidate(_l, _vault, _maker, _order.liquidationAmountVT, _order.expectedOutputUT);

        uint256 _numOfCoins = _exchange(_order, _vaultUnderlyingTokenAmount, _order.returnLimitUT);

        uint256 coinsAfterFee = _collectFee(_l, _stablecoinVaultUnderlyingToken, _numOfCoins, _l.vaultFee[_vault]);

        _deliver(_l, coinsAfterFee, _order.expectedOutputVT, _order.stablecoinVault, _maker);
    }

    /**
     * @notice liquidates an amount of shares in the target opVault
     * @param _l LimitOrderStorage Layout struct
     * @param _vault address of opVault
     * @param _maker address providing shares to liquidate - Limit Order maker
     * @param _withdrawAmountVT amount of shares to liquidate
     * @param _expectedOutputUT minimum amount of underlying tokens that must be received
     *         to not revert transaction
     * @return _withdrawAmountUT amount of underlying tokens provided by opVault withdrawal
     */
    function _liquidate(
        LimitOrderStorage.Layout storage _l,
        address _vault,
        address _maker,
        uint256 _withdrawAmountVT,
        uint256 _expectedOutputUT
    ) internal returns (uint256 _withdrawAmountUT) {
        IERC20(_vault).safeTransferFrom(_maker, address(this), _withdrawAmountVT);

        _withdrawAmountUT = IVault(_vault).userWithdrawVault(
            address(this),
            _withdrawAmountVT,
            _expectedOutputUT,
            _l.accountProofs[_vault]
        );
    }

    /**
     * @notice exchanges tokens for USDC via swap diamond
     * @param _order the order to swap
     * @param _vaultUnderlyingTokenAmount token received on liquidation
     * @param _limit the minimum amount of tokens returned as output of the swap
     * @return stablecoin amount
     */
    function _exchange(
        DataTypes.Order memory _order,
        uint256 _vaultUnderlyingTokenAmount,
        uint256 _limit
    ) internal returns (uint256) {
        address _toToken = IVault(_order.stablecoinVault).underlyingToken();
        address _fromToken = IVault(_order.vault).underlyingToken();
        uint256 _toAmountBalanceBeforeSwap = IERC20(_toToken).balanceOf(address(this));
        if (_order.swapOnUniV3) {
            ISwapRouter(_order.dexRouter).exactInput(
                ISwapRouter.ExactInputParams({
                    path: _order.uniV3Path,
                    recipient: address(this),
                    deadline: _timestamp() + 10 minutes,
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
                _timestamp() + 10 minutes
            );
        }
        uint256 _fromAmountBalanceAfterSwap = IERC20(_fromToken).balanceOf(address(this));
        uint256 _leftOverFromAmountUT = _vaultUnderlyingTokenAmount - _fromAmountBalanceAfterSwap;
        if (_leftOverFromAmountUT > 0) {
            IERC20(_fromToken).transfer(_order.maker, _leftOverFromAmountUT);
        }
        uint256 _toAmountBalanceAfterSwap = IERC20(_toToken).balanceOf(address(this));
        return _toAmountBalanceAfterSwap - _toAmountBalanceBeforeSwap;
    }

    /**
     * @notice collects liquidation fee and sends to treasury
     * @param _amount amount to deduct fee from
     * @param _coin address of underlying vault stable coin
     * @param _feeBP in basis poitns
     */
    function _collectFee(
        LimitOrderStorage.Layout storage _l,
        address _coin,
        uint256 _amount,
        uint256 _feeBP
    ) internal returns (uint256 amountAfterFee) {
        uint256 fee = _applyLiquidationFee(_amount, _feeBP);
        amountAfterFee = _amount - fee;

        IERC20(_coin).safeTransfer(_treasury(_l), fee);
    }

    /**
     * @notice either deposits USDC into opUSDC and sends shares to _maker, or sends USDC directly to maker
     * @param _l LimitOrderStorage Layout struct
     * @param _depositAmountUT amount of stable coin to deposit
     * @param _expectedOutputVT the minimum amount of vault tokens that must be minted
     *         for the transaction to not revert
     * @param _vault address of stable coin vault
     * @param _maker address to deliver final shares or USDC to
     */
    function _deliver(
        LimitOrderStorage.Layout storage _l,
        uint256 _depositAmountUT,
        uint256 _expectedOutputVT,
        address _vault,
        address _maker
    ) internal {
        IVault(_vault).userDepositVault(_maker, _depositAmountUT, _expectedOutputVT, "0x", _l.accountProofs[_vault]);

        emit DeliverShares(_maker);
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
     */
    function _canExecute(
        DataTypes.Order memory _order,
        bool _activeOrder,
        address _token,
        address _oracleAddress
    ) internal view returns (bool, string memory) {
        if (!_activeOrder) {
            return (false, "no active order");
        }

        if (_order.expiration <= _timestamp()) {
            return (false, "expired");
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
    function _price(address _oracleAddress, address _token) internal view returns (uint256 price) {
        price = IOptyFiOracle(_oracleAddress).getTokenPrice(_token, USD);
    }

    /**
     * @notice returns price of a token in stablecoin
     * @dev fetched from OptyFiOracle which uses Chainlink as a default source of truth. A fallback oracle
     * is used in case Chainlink does not provide one.
     * @param _oracleAddress address of the OptyFiOracle
     * @param _token address of the underlying vault token of the made LimitOrder
     * @param _stablecoin address of underlying vault stable coin
     * @return price the price of the token in _coin stablecoins
     */
    function _priceStablecoin(
        address _oracleAddress,
        address _token,
        address _stablecoin
    ) internal view returns (uint256 price) {
        price = IOptyFiOracle(_oracleAddress).getTokenPrice(_token, _stablecoin);
    }

    /**
     * @notice checks whether a limit order may be created or not
     * @param _l the layout of the limit order contract
     * @param _user the address of the user making the limit order
     * @param _vault the vault the limit order pertains to
     * @param _destination the opVault with stable coins as underlying to send liquidated shares to
     * @param _expiration the expiration timestamp of the limit order
     */
    function _permitOrderCreation(
        LimitOrderStorage.Layout storage _l,
        address _user,
        address _vault,
        address _destination,
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
        if (_l.stablecoinVaults[_destination] == false) {
            revert Errors.ForbiddenStablecoinVault();
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
    function _vaultFee(LimitOrderStorage.Layout storage _l, address _vault) internal view returns (uint256 fee) {
        fee = _l.vaultFee[_vault];
    }

    /**
     * @notice returns address of the treasury
     * @param _l the layout of the limit order contract
     * @return treasury address
     */
    function _treasury(LimitOrderStorage.Layout storage _l) internal view returns (address treasury) {
        treasury = _l.treasury;
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
     * @notice returns address of the OptyFi Oracle
     * @param _l the layout of the limit order contract
     * @return oracle address
     */
    function _oracle(LimitOrderStorage.Layout storage _l) internal view returns (address oracle) {
        oracle = _l.oracle;
    }

    /**
     * @notice returns address of the operations contract that assists limit order
     * @param _l the layout of the limit order contract
     * @return ops address
     */
    function _ops(LimitOrderStorage.Layout storage _l) internal view returns (address ops) {
        ops = _l.ops;
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
     */
    function _areBoundsSatisfied(uint256 _latestPrice, DataTypes.Order memory _order)
        internal
        pure
        returns (bool, string memory)
    {
        uint256 lowerBound = _order.lowerBound;
        uint256 upperBound = _order.upperBound;

        if (_order.direction == DataTypes.BoundDirection.Out) {
            if (!(lowerBound >= _latestPrice || _latestPrice >= upperBound)) {
                return (false, "price within bounds");
            }
        } else {
            if (!(lowerBound <= _latestPrice && _latestPrice <= upperBound)) {
                return (false, "price out with bounds");
            }
        }
        return (true, "");
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
    function _applyLiquidationFee(uint256 _amount, uint256 _vaultFeeUT) internal pure returns (uint256 fee) {
        fee = (_amount * _vaultFeeUT) / BASIS;
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

        if (IERC20(_vault).balanceOf(_maker) < _order.liquidationAmountVT) {
            return (false, bytes("Not enough shares"));
        }

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

        return (true, abi.encodeCall(ILimitOrderActions.execute, (_maker, _vault)));
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
