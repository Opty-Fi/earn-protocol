// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

import { IVault } from './earn/IVault.sol';
import { LimitOrderStorage } from './LimitOrderStorage.sol';
import { DataTypes } from './DataTypes.sol';
import { ILimitOrderInternal } from './ILimitOrderInternal.sol';
import { TokenTransferProxy } from './TokenTransferProxy.sol';
import { ERC20Utils } from './ERC20Utils.sol';

import '@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol';
import { IERC20 } from '@solidstate/contracts/token/ERC20/IERC20.sol';

/**
 * @title Contract for writing limit orders
 * @author OptyFi
 */
contract LimitOrderInternal is ILimitOrderInternal {
    using LimitOrderStorage for LimitOrderStorage.Layout;

    uint256 public constant BASIS = 1 ether;
    address public immutable USDC;
    address public immutable OPUSDC_VAULT;
    TokenTransferProxy public immutable TRANSFER_PROXY;

    constructor(
        address _usdc,
        address _opUSDCVault,
        address _treasury,
        address[] memory _tokens,
        address[] memory _priceFeeds
    ) {
        LimitOrderStorage.Layout storage l = LimitOrderStorage.layout();
        uint256 priceFeedsLength = _priceFeeds.length;

        require(
            priceFeedsLength == _tokens.length,
            'priceFeeds and token lengths mismatch'
        );

        TRANSFER_PROXY = new TokenTransferProxy();
        USDC = _usdc;
        OPUSDC_VAULT = _opUSDCVault;
        l.treasury = _treasury;

        for (uint256 i; i < priceFeedsLength; ) {
            l.tokenPriceFeed[_tokens[i]] = _priceFeeds[i];
            ++i;
        }
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
        order.priceFeed = AggregatorV3Interface(
            _l.tokenPriceFeed[IVault(_vault).underlyingToken()]
        );
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
        DataTypes.SwapData memory _swapData
    ) internal {
        //check order execution critera
        _canExecute(_l, _order);

        //check swap execution criteria
        _canSwap(_swapData);

        address vault = _order.vault;
        address underlyingToken = IVault(vault).underlyingToken();

        //calculate liquidation amount
        uint256 liquidationAmount = _liquidationAmount(
            IERC20(vault).balanceOf(_order.maker),
            _order.liquidationShare
        );

        //transfer vault shares from user
        TRANSFER_PROXY.transferFrom(
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

        //swap underlying for USDC
        uint256 swapOutput = _doSimpleSwap(_swapData);

        retrieveTokens(_swapData.fromToken, _order.maker);

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

    function _doSimpleSwap(DataTypes.SwapData memory _swapData)
        internal
        returns (uint256 receivedAmount)
    {
        require(
            msg.value ==
                (
                    _swapData.fromToken == ERC20Utils.ethAddress()
                        ? _swapData.fromAmount
                        : 0
                ),
            'incorrect msg.value'
        );
        require(_swapData.toAmount > 0, 'toAmount is too low');
        require(
            _swapData.callees.length + 1 == _swapData.startIndexes.length,
            'Start indexes must be 1 greater then number of callees'
        );

        //If source token is not ETH than transfer required amount of tokens
        //from sender to this contract
        transferTokensFromProxy(
            _swapData.fromToken,
            _swapData.fromAmount,
            _swapData.permit
        );
        bytes memory _exchangeData = _swapData.exchangeData;
        for (uint256 i = 0; i < _swapData.callees.length; i++) {
            require(
                _swapData.callees[i] != address(TRANSFER_PROXY),
                'Can not call TokenTransferProxy Contract'
            );

            {
                uint256 dataOffset = _swapData.startIndexes[i];
                bytes32 selector;
                assembly {
                    selector := mload(add(_exchangeData, add(dataOffset, 32)))
                }
                require(
                    bytes4(selector) != IERC20.transferFrom.selector,
                    'transferFrom not allowed for externalCall'
                );
            }

            bool result = externalCall(
                _swapData.callees[i], //destination
                _swapData.values[i], //value to send
                _swapData.startIndexes[i], // start index of call data
                _swapData.startIndexes[i + 1] - (_swapData.startIndexes[i]), // length of calldata
                _swapData.exchangeData // total calldata
            );
            require(result, 'External call failed');
        }

        receivedAmount = ERC20Utils.tokenBalance(
            _swapData.toToken,
            address(this)
        );

        require(
            receivedAmount >= _swapData.toAmount,
            'Received amount of tokens are less then expected'
        );

        return receivedAmount;
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
        _isSpotPriceBound(_fetchSpotPrice(_order), _order);
    }

    function _canSwap(DataTypes.SwapData memory _swapData) internal view {
        require(_swapData.deadline >= block.timestamp, 'Deadline breached');
    }

    /**
     * @notice returns spotPrice of underlying vault token
     * @param _order the order containing the underlying vault token to fetch the spot price for
     * @return spotPrice the spotPrice of the underlying vault token
     */
    function _fetchSpotPrice(DataTypes.Order memory _order)
        internal
        view
        returns (uint256 spotPrice)
    {
        (, int256 price, , , ) = _order.priceFeed.latestRoundData();
        spotPrice = uint256(price);
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

    /**
     * @dev Source take from GNOSIS MultiSigWallet
     * @dev https://github.com/gnosis/MultiSigWallet/blob/master/contracts/MultiSigWallet.sol
     */
    function externalCall(
        address destination,
        uint256 value,
        uint256 dataOffset,
        uint256 dataLength,
        bytes memory data
    ) private returns (bool) {
        bool result = false;

        assembly {
            let x := mload(0x40) // "Allocate" memory for output
            // (0x40 is where "free memory" pointer is stored by convention)

            let d := add(data, 32) // First 32 bytes are the padded length of data, so exclude that
            result := call(
                gas(),
                destination,
                value,
                add(d, dataOffset),
                dataLength, // Size of the input (in bytes) - this is what fixes the padding problem
                x,
                0 // Output is ignored, therefore the output size is zero
            )
        }
        return result;
    }

    function transferTokensFromProxy(
        address token,
        uint256 amount,
        bytes memory permit
    ) private {
        if (token != ERC20Utils.ethAddress()) {
            ERC20Utils.permit(token, permit);

            TRANSFER_PROXY.transferFrom(
                token,
                msg.sender,
                address(this),
                amount
            );
        }
    }

    function retrieveTokens(address token, address payable _receiver) private {
        uint256 balance = ERC20Utils.tokenBalance(token, address(this));
        ERC20Utils.transferTokens(token, _receiver, balance);
    }
}
