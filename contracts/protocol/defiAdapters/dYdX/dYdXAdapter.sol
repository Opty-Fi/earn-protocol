// solhint-disable no-unused-vars
// SPDX-License-Identifier:MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

//  libraries
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { DataTypes } from "../../../libraries/types/DataTypes.sol";

//  helper contracts
import { Modifiers } from "../../configuration/Modifiers.sol";

//  interfaces
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    IdYdX,
    AccountInfo,
    AssetAmount,
    AssetDenomination,
    AssetReference,
    ActionArgs,
    AssetReference,
    ActionType
} from "../../../interfaces/dydx/IdYdX.sol";
import { IAdapter } from "../../../interfaces/opty/IAdapter.sol";

/**
 * @title Adapter for dYdX protocol
 * @author Opty.fi
 * @dev Abstraction layer to dYdX's pools
 */
contract DyDxAdapter is IAdapter, Modifiers {
    using SafeMath for uint256;

    /** @notice  Maps liquidityPool to max deposit value in percentage */
    mapping(address => uint256) public maxDepositPoolPct; // basis points
    /** @notice  Maps liquidityPool to max deposit value in absolute value */
    mapping(address => uint256) public maxDepositAmount;
    /** @notice Maps underlyingToken address to its market index in dYdX protocol */
    mapping(address => uint256) public marketToIndexes;
    /** @notice Maps liquidityPool to the list of underlyingTokens */
    mapping(address => address[]) public liquidityPoolToUnderlyingTokens;

    address public constant DYDX_LIQUIIDTY_POOL = address(0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e);
    address public constant WETH = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    address public constant SAI = address(0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359);
    address public constant USDC = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    address public constant DAI = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);

    /** @notice max deposit value datatypes */
    DataTypes.MaxExposure public maxExposureType;
    /** @notice max deposit's default value in percentage */
    uint256 public maxDepositPoolPctDefault; // basis points
    /** @notice max deposit's default value in number */
    uint256 public maxDepositAmountDefault;

    constructor(address _registry) public Modifiers(_registry) {
        address[] memory _dYdXUnderlyingTokens = new address[](4);
        _dYdXUnderlyingTokens[0] = WETH;
        _dYdXUnderlyingTokens[1] = SAI;
        _dYdXUnderlyingTokens[2] = USDC;
        _dYdXUnderlyingTokens[3] = DAI;
        setLiquidityPoolToUnderlyingTokens(DYDX_LIQUIIDTY_POOL, _dYdXUnderlyingTokens);
        addMarket(WETH, 0);
        addMarket(SAI, 1);
        addMarket(USDC, 2);
        addMarket(DAI, 3);
        setMaxDepositPoolPctDefault(uint256(10000)); // 100%
        setMaxDepositPoolType(DataTypes.MaxExposure.Number);
    }

    /**
     * @notice Sets the percentage of max deposit value for the given liquidity pool
     * @param _liquidityPool liquidity pool address
     * @param _maxDepositPoolPct liquidity pool's max deposit percentage (in basis points, For eg: 50% means 5000)
     */
    function setMaxDepositPoolPct(address _liquidityPool, uint256 _maxDepositPoolPct) external onlyGovernance {
        maxDepositPoolPct[_liquidityPool] = _maxDepositPoolPct;
    }

    /**
     * @notice Sets the default absolute max deposit value in underlying
     * @param _maxDepositAmountDefault absolute max deposit value in underlying to be set as default value
     */
    function setMaxDepositAmountDefault(uint256 _maxDepositAmountDefault) external onlyGovernance {
        maxDepositAmountDefault = _maxDepositAmountDefault;
    }

    /**
     * @notice Sets the absolute max deposit value in underlying for the given liquidity pool
     * @param _liquidityPool liquidity pool address for which to set max deposit value (in absolute value)
     * @param _maxDepositAmount absolute max deposit amount in underlying to be set for given liquidity pool
     */
    function setMaxDepositAmount(address _liquidityPool, uint256 _maxDepositAmount) external onlyGovernance {
        maxDepositAmount[_liquidityPool] = _maxDepositAmount;
    }

    /**
     * @notice Maps the index of market used corresponding to the underlying token
     * @param _underlyingToken token address for which to set the market index
     * @param _marketIndex market index of the given underlying token
     */
    function addMarket(address _underlyingToken, uint256 _marketIndex) public onlyOperator {
        marketToIndexes[_underlyingToken] = _marketIndex;
    }

    /**
     * @notice Maps the liquidity pool to the list of underlyingTokens supported by the given lp
     * @param _liquidityPool liquidity pool address for which to map the underlying tokens supported
     * @param _tokens list of underlying tokens linked to the given liquidity pool
     */
    function setLiquidityPoolToUnderlyingTokens(address _liquidityPool, address[] memory _tokens) public onlyOperator {
        liquidityPoolToUnderlyingTokens[_liquidityPool] = _tokens;
    }

    /**
     * @notice Sets the type of investment limit
     *                  1. Percentage of pool value
     *                  2. Amount in underlying token
     * @dev Types (can be number or percentage) supported for the maxDeposit value
     * @param _type Type of maxDeposit to be set (can be absolute value or percentage)
     */
    function setMaxDepositPoolType(DataTypes.MaxExposure _type) public onlyGovernance {
        maxExposureType = _type;
    }

    /**
     * @notice Sets the default percentage of max deposit pool value
     * @param _maxDepositPoolPctDefault Pool's max deposit percentage (in basis points, For eg: 50% means 5000)
     * to be set as default value
     */
    function setMaxDepositPoolPctDefault(uint256 _maxDepositPoolPctDefault) public onlyGovernance {
        maxDepositPoolPctDefault = _maxDepositPoolPctDefault;
    }

    /**
     * @inheritdoc IAdapter
     */
    function getDepositAllCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256[] memory _amounts = new uint256[](liquidityPoolToUnderlyingTokens[_liquidityPool].length);
        for (uint256 i = 0; i < liquidityPoolToUnderlyingTokens[_liquidityPool].length; i++) {
            if (liquidityPoolToUnderlyingTokens[_liquidityPool][i] == _underlyingTokens[0]) {
                _amounts[i] = IERC20(_underlyingTokens[0]).balanceOf(_vault);
            }
        }
        return getDepositSomeCodes(_vault, liquidityPoolToUnderlyingTokens[_liquidityPool], _liquidityPool, _amounts);
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in dYdX protocol
     */
    function getBorrowAllCodes(
        address payable,
        address[] memory,
        address,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in dYdX protocol
     */
    function getRepayAndWithdrawAllCodes(
        address payable,
        address[] memory,
        address,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     */
    function getWithdrawAllCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _redeemAmount = getAllAmountInToken(_vault, _underlyingTokens[0], _liquidityPool);
        return getWithdrawSomeCodes(_vault, _underlyingTokens, _liquidityPool, _redeemAmount);
    }

    /**
     * @inheritdoc IAdapter
     */
    function getLiquidityPoolToken(address, address) public view override returns (address) {
        return address(0);
    }

    /**
     * @inheritdoc IAdapter
     */
    function getUnderlyingTokens(address _liquidityPool, address)
        public
        view
        override
        returns (address[] memory _underlyingTokens)
    {
        _underlyingTokens = liquidityPoolToUnderlyingTokens[_liquidityPool];
    }

    /**
     * @inheritdoc IAdapter
     */
    function getLiquidityPoolTokenBalance(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (uint256) {
        return getAllAmountInToken(_vault, _underlyingToken, _liquidityPool);
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in dYdX protocol
     */
    function getSomeAmountInToken(
        address,
        address,
        uint256
    ) public view override returns (uint256) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in dYdX protocol
     */
    function getSomeAmountInTokenBorrow(
        address payable,
        address,
        address,
        uint256,
        address,
        uint256
    ) public view override returns (uint256) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in dYdX protocol
     */
    function getAllAmountInTokenBorrow(
        address payable,
        address,
        address,
        address,
        uint256
    ) public view override returns (uint256) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in dYdX protocol
     */
    function calculateAmountInLPToken(
        address,
        address,
        uint256
    ) public view override returns (uint256) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     */
    function calculateRedeemableLPTokenAmount(
        address payable,
        address,
        address,
        uint256 _redeemAmount
    ) public view override returns (uint256) {
        return _redeemAmount;
    }

    /**
     * @inheritdoc IAdapter
     */
    function isRedeemableAmountSufficient(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bool) {
        uint256 _balanceInToken = getAllAmountInToken(_vault, _underlyingToken, _liquidityPool);
        return _balanceInToken >= _redeemAmount;
    }

    /**
     * @inheritdoc IAdapter
     */
    function getRewardToken(address) public view override returns (address) {
        return address(0);
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in dYdX protocol
     */
    function getUnclaimedRewardTokenAmount(address payable, address) public view override returns (uint256) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in dYdX protocol
     */
    function getClaimRewardTokenCode(address payable, address) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in dYdX protocol
     */
    function getHarvestSomeCodes(
        address payable,
        address,
        address,
        uint256
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in dYdX protocol
     */
    function getHarvestAllCodes(
        address payable,
        address,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     */
    function canStake(address) public view override returns (bool) {
        return false;
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in dYdX protocol
     */
    function getStakeSomeCodes(address, uint256) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in dYdX protocol
     */
    function getStakeAllCodes(
        address payable,
        address[] memory,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in dYdX protocol
     */
    function getUnstakeSomeCodes(address, uint256) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in dYdX protocol
     */
    function getUnstakeAllCodes(address payable, address) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in dYdX protocol
     */
    function getAllAmountInTokenStake(
        address payable,
        address,
        address
    ) public view override returns (uint256) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in dYdX protocol
     */
    function getLiquidityPoolTokenBalanceStake(address payable, address) public view override returns (uint256) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in dYdX protocol
     */
    function calculateRedeemableLPTokenAmountStake(
        address payable,
        address,
        address,
        uint256
    ) public view override returns (uint256) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in dYdX protocol
     */
    function isRedeemableAmountSufficientStake(
        address payable,
        address,
        address,
        uint256
    ) public view override returns (bool) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in dYdX protocol
     */
    function getUnstakeAndWithdrawSomeCodes(
        address payable,
        address[] memory,
        address,
        uint256
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in dYdX protocol
     */
    function getUnstakeAndWithdrawAllCodes(
        address payable,
        address[] memory,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     */
    function getDepositSomeCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256[] memory _amounts
    ) public view override returns (bytes[] memory _codes) {
        uint256 _underlyingTokenIndex;
        bool _isAmount = false;
        for (uint256 i = 0; i < _amounts.length; i++) {
            if (_amounts[i] > 0) {
                _isAmount = true;
                _underlyingTokenIndex = marketToIndexes[_underlyingTokens[i]];
            }
        }
        if (_isAmount) {
            uint256 _depositAmount =
                _getDepositAmount(
                    _liquidityPool,
                    _underlyingTokens[_underlyingTokenIndex],
                    _amounts[_underlyingTokenIndex]
                );
            AccountInfo[] memory _accountInfos = new AccountInfo[](1);
            _accountInfos[0] = AccountInfo(_vault, uint256(0));
            AssetAmount memory _amt = AssetAmount(true, AssetDenomination.Wei, AssetReference.Delta, _depositAmount);
            ActionArgs memory _actionArg;
            _actionArg.actionType = ActionType.Deposit;
            _actionArg.accountId = 0;
            _actionArg.amount = _amt;
            _actionArg.primaryMarketId = _underlyingTokenIndex;
            _actionArg.otherAddress = _vault;
            ActionArgs[] memory _actionArgs = new ActionArgs[](1);
            _actionArgs[0] = _actionArg;
            _codes = new bytes[](3);
            _codes[0] = abi.encode(
                _underlyingTokens[_underlyingTokenIndex],
                abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, uint256(0))
            );
            _codes[1] = abi.encode(
                _underlyingTokens[_underlyingTokenIndex],
                abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _amounts[_underlyingTokenIndex])
            );
            _codes[2] = abi.encode(
                _liquidityPool,
                abi.encodeWithSignature(
                    // solhint-disable-next-line max-line-length
                    "operate((address,uint256)[],(uint8,uint256,(bool,uint8,uint8,uint256),uint256,uint256,address,uint256,bytes)[])",
                    _accountInfos,
                    _actionArgs
                )
            );
        }
    }

    /**
     * @inheritdoc IAdapter
     */
    function getWithdrawSomeCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256 _amount
    ) public view override returns (bytes[] memory _codes) {
        if (_amount > 0) {
            uint256 _underlyingTokenIndex = marketToIndexes[_underlyingTokens[0]];
            AccountInfo[] memory _accountInfos = new AccountInfo[](1);
            _accountInfos[0] = AccountInfo(_vault, uint256(0));
            AssetAmount memory _amt = AssetAmount(false, AssetDenomination.Wei, AssetReference.Delta, _amount);
            ActionArgs memory _actionArg;
            _actionArg.actionType = ActionType.Withdraw;
            _actionArg.accountId = 0;
            _actionArg.amount = _amt;
            _actionArg.primaryMarketId = _underlyingTokenIndex;
            _actionArg.otherAddress = _vault;
            ActionArgs[] memory _actionArgs = new ActionArgs[](1);
            _actionArgs[0] = _actionArg;
            _codes = new bytes[](1);
            _codes[0] = abi.encode(
                _liquidityPool,
                abi.encodeWithSignature(
                    // solhint-disable-next-line max-line-length
                    "operate((address,uint256)[],(uint8,uint256,(bool,uint8,uint8,uint256),uint256,uint256,address,uint256,bytes)[])",
                    _accountInfos,
                    _actionArgs
                )
            );
        }
    }

    /**
     * @inheritdoc IAdapter
     */
    function getPoolValue(address _liquidityPool, address _underlyingToken) public view override returns (uint256) {
        return uint256(IdYdX(_liquidityPool).getMarketTotalPar(marketToIndexes[_underlyingToken]).supply);
    }

    /**
     * @inheritdoc IAdapter
     */
    function getAllAmountInToken(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (uint256) {
        uint256 _underlyingTokenIndex = marketToIndexes[_underlyingToken];
        AccountInfo memory _accountInfo = AccountInfo(_vault, uint256(0));
        (, uint256 value) = IdYdX(_liquidityPool).getAccountWei(_accountInfo, _underlyingTokenIndex);
        return value;
    }

    function _getDepositAmount(
        address _liquidityPool,
        address _underlyingToken,
        uint256 _amount
    ) internal view returns (uint256 _depositAmount) {
        _depositAmount = _amount;
        uint256 _limit =
            maxExposureType == DataTypes.MaxExposure.Pct
                ? _getMaxDepositAmountByPct(_liquidityPool, _underlyingToken, _amount)
                : _getMaxDepositAmount(_liquidityPool, _amount);
        if (_limit != 0 && _depositAmount > _limit) {
            _depositAmount = _limit;
        }
    }

    function _getMaxDepositAmountByPct(
        address _liquidityPool,
        address _underlyingToken,
        uint256 _amount
    ) internal view returns (uint256 _depositAmount) {
        _depositAmount = _amount;
        uint256 _poolValue = getPoolValue(_liquidityPool, _underlyingToken);
        uint256 maxPct = maxDepositPoolPct[_liquidityPool];
        if (maxPct == 0) {
            maxPct = maxDepositPoolPctDefault;
        }
        uint256 _limit = (_poolValue.mul(maxPct)).div(uint256(10000));
        if (_depositAmount > _limit) {
            _depositAmount = _limit;
        }
    }

    function _getMaxDepositAmount(address _liquidityPool, uint256 _amount)
        internal
        view
        returns (uint256 _depositAmount)
    {
        _depositAmount = _amount;
        uint256 maxDeposit = maxDepositAmount[_liquidityPool];
        if (maxDeposit == 0) {
            maxDeposit = maxDepositAmountDefault;
        }
        if (_depositAmount > maxDeposit) {
            _depositAmount = maxDeposit;
        }
    }
}
