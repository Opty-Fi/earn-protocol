// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

import { IVault } from './earn/IVault.sol';
import { LimitOrderStorage } from './LimitOrderStorage.sol';
import { DataTypes } from './DataTypes.sol';
import { ILimitOrderInternal } from './ILimitOrderInternal.sol';
import { TokenTransferProxy } from './TokenTransferProxy.sol';
import { ArbitrarySwapper } from './ArbitrarySwapper.sol';

import '@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol';
import { IERC20 } from '@solidstate/contracts/token/ERC20/IERC20.sol';

/**
 * @title Contract for writing limit orders
 * @author OptyFi
 */
contract LimitOrderInternal is ILimitOrderInternal {
    using LimitOrderStorage for LimitOrderStorage.Layout;

    uint256 public constant BASIS = 1 ether;
    uint256 public immutable LIMIT_ORDER_FEE;
    address public immutable USDC;
    address public immutable OPUSDC_VAULT;
    address public immutable TREASURY;
    bytes32[] private PROOF;
    bytes32[] private EMPTYPROOF = [bytes32('0x')];
    TokenTransferProxy public immutable TRANSFER_PROXY;
    ArbitrarySwapper public immutable SWAPPER;

    constructor(
        uint256 _limitOrderFee,
        address _arbitrarySwapper,
        address _usdc,
        address _opUSDCVault,
        address _treasury
    ) {
        LIMIT_ORDER_FEE = _limitOrderFee;
        TRANSFER_PROXY = new TokenTransferProxy();
        SWAPPER = ArbitrarySwapper(_arbitrarySwapper);
        USDC = _usdc;
        OPUSDC_VAULT = _opUSDCVault;
        TREASURY = _treasury;
    }

    function _permitOrderCreation(
        LimitOrderStorage.Layout storage _l,
        address _user,
        address _vault,
        uint256 _startTime,
        uint256 _endTime
    ) internal view {
        require(
            _l.userVaultOrderActive[_user][_vault] == false,
            'user already has an active limit order'
        );
        require(_startTime < _endTime, 'end time < start time');
    }

    function _cancelOrder(
        LimitOrderStorage.Layout storage _l,
        address _user,
        address _vault
    ) internal {
        _l.userVaultOrderActive[_user][_vault] = false;
    }

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

    function _createOrder(
        LimitOrderStorage.Layout storage _l,
        address _vault,
        AggregatorV3Interface _priceFeed,
        uint256 _priceTarget,
        uint256 _liquidationShare,
        uint256 _endTime,
        uint256 _lowerBound,
        uint256 _upperBound,
        DataTypes.Side _side
    ) internal returns (DataTypes.Order memory order) {
        uint256 startTime = block.timestamp;

        _permitOrderCreation(_l, msg.sender, _vault, startTime, _endTime);

        order.priceTarget = _priceTarget;
        order.liquidationShare = _liquidationShare;
        order.startTime = startTime;
        order.endTime = _endTime;
        order.lowerBound = _lowerBound;
        order.upperBound = _upperBound;
        order.vault = _vault;
        order.maker = msg.sender;
        order.priceFeed = _priceFeed;
        order.side = _side;

        _l.userVaultOrder[msg.sender][_vault] = order;
        _l.userVaultOrderActive[msg.sender][_vault] = true;

        emit LimitOrderCreated(order);
    }

    function _canExecute(
        LimitOrderStorage.Layout storage _l,
        DataTypes.Order memory _order
    ) internal view {
        require(
            _l.userVaultOrderActive[_order.maker][_order.vault] == true,
            'user does not have an active order'
        );
        require(_order.endTime > block.timestamp, 'order expired');
        _isSpotPriceBound(_fetchSpotPrice(_order), _order);
    }

    /**
  * TODO: executeOrder
  * 1. Check that order criteria are fulfilled:
    - order is active
    - price target is met
     - fetch spotPrice ==> getPricePerFullShare() from Vault/Adapter * oracle USD price
     - check spotPrice vs targetPrice
  * 2. Liquidate a liquidationShare of user tokens
     - send tokens to uniswapv2/sushiswap lp to extract usdc => what if tokens do not have usdc or dai or stablecoin pool?
     - receive returned tokens extract fee
     - deposit tokens to op-vault
     - send shares to user
 * 3. Set all params of the order appropriately
 * token transfer proxy contract, this will be the one which will handle all token transfers
  * 
  */

    function _fetchSpotPrice(DataTypes.Order memory _order)
        internal
        view
        returns (uint256 spotPrice)
    {
        (, int256 price, , , ) = _order.priceFeed.latestRoundData();
        spotPrice = uint256(price);
    }
}
