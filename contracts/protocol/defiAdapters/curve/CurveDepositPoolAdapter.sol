// solhint-disable no-unused-vars
// SPDX-License-Identifier:MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

// libraries
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { DataTypes } from "../../../libraries/types/DataTypes.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";

// helper contracts
import { Modifiers } from "../../configuration/Modifiers.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// interfaces
import { IAdapter } from "../../../interfaces/opty/defiAdapters/IAdapter.sol";
import { IAdapterHarvestReward } from "../../../interfaces/opty/defiAdapters/IAdapterHarvestReward.sol";
import { IAdapterStaking } from "../../../interfaces/opty/defiAdapters/IAdapterStaking.sol";
import { IAdapterStakingCurve } from "../../../interfaces/opty/defiAdapters/IAdapterStakingCurve.sol";
import { IAdapterInvestLimit } from "../../../interfaces/opty/defiAdapters/IAdapterInvestLimit.sol";
import { ICurveDeposit } from "../../../interfaces/curve/ICurveDeposit.sol";
import { ICurveGauge } from "../../../interfaces/curve/ICurveGauge.sol";
import { ICurveAddressProvider } from "../../../interfaces/curve/ICurveAddressProvider.sol";
import { ICurveRegistry } from "../../../interfaces/curve/ICurveRegistry.sol";
import { ICurveSwap } from "../../../interfaces/curve/ICurveSwap.sol";
import { ITokenMinter } from "../../../interfaces/curve/ITokenMinter.sol";
import { IHarvestCodeProvider } from "../../../interfaces/opty/IHarvestCodeProvider.sol";

/**
 * @title Adapter for Curve Deposit pools
 * @author Opty.fi
 * @dev Abstraction layer to Curve's deposit pools
 *      Note 1 : In this adapter, a liquidity pool is defined as a single sided liquidity pool
 *      Note 2 : In this adapter, lp token can be redemeed into more than one underlying token
 */
contract CurveDepositPoolAdapter is
    IAdapter,
    IAdapterHarvestReward,
    IAdapterStaking,
    IAdapterStakingCurve,
    IAdapterInvestLimit,
    Modifiers
{
    using SafeMath for uint256;
    using Address for address;

    /** @notice max deposit value datatypes */
    DataTypes.MaxExposure public maxDepositProtocolMode;

    /** @notice  Curve Registry Address Provider */
    address public constant ADDRESS_PROVIDER = address(0x0000000022D53366457F9d5E68Ec105046FC4383);

    /** @notice HBTC token contract address */
    address public constant HBTC = address(0x0316EB71485b0Ab14103307bf65a021042c6d380);

    /** @notice Curve's compound zap deposit contract address */
    address public constant COMPOUND_DEPOSIT_POOL = address(0xeB21209ae4C2c9FF2a86ACA31E123764A3B6Bc06);

    /** @notice Curve's usdt zap deposit contract address */
    address public constant USDT_DEPOSIT_POOL = address(0xac795D2c97e60DF6a99ff1c814727302fD747a80);

    /** @notice Curve's pax zap deposit contract address */
    address public constant PAX_DEPOSIT_POOL = address(0xA50cCc70b6a011CffDdf45057E39679379187287);

    /** @notice Curve's y zap deposit contract address */
    address public constant Y_DEPOSIT_POOL = address(0xbBC81d23Ea2c3ec7e56D39296F0cbB648873a5d3);

    /** @notice Curve's busd zap deposit contract address */
    address public constant BUSD_DEPOSIT_POOL = address(0xb6c057591E073249F2D9D88Ba59a46CFC9B59EdB);

    /** @notice Curve's susd zap deposit contract address */
    address public constant SUSD_DEPOSIT_POOL = address(0xFCBa3E75865d2d561BE8D220616520c171F12851);

    /** @notice Curve's aToken swap contract address */
    address public constant A_SWAP_POOL = address(0xDeBF20617708857ebe4F679508E7b7863a8A8EeE);

    /** @notice Curve's saToken swap contract address */
    address public constant SA_SWAP_POOL = address(0xEB16Ae0052ed37f479f7fe63849198Df1765a733);

    /** @notice Curve's saToken swap contract address */
    address public constant Y_SWAP_POOL = address(0x2dded6Da1BF5DBdF597C45fcFaa3194e53EcfeAF);

    /** @notice max deposit's default value in percentage */
    uint256 public maxDepositProtocolPct; // basis points

    /** @dev deposit addresses that uses old API */
    mapping(address => bool) public isOldDepositZap;

    /** @dev swap pool addresses*/
    mapping(address => bool) public isSwapPool;

    /** @notice Maps liquidityPool to absolute max deposit values in underlying */
    mapping(address => uint256) public maxDepositAmount;

    /** @notice  Maps liquidityPool to max deposit value in percentage */
    mapping(address => uint256) public maxDepositPoolPct;

    /**
     * @dev Configures the CurveDeposit pools according old and new API
     */
    constructor(address _registry) public Modifiers(_registry) {
        setIsOldDepositZap(COMPOUND_DEPOSIT_POOL, true); // curve-compound
        setIsOldDepositZap(USDT_DEPOSIT_POOL, true); // curve-usdt
        setIsOldDepositZap(PAX_DEPOSIT_POOL, true); // curve-pax
        setIsOldDepositZap(Y_DEPOSIT_POOL, true); // curve-y
        setIsOldDepositZap(BUSD_DEPOSIT_POOL, true); // curve-busd
        setIsOldDepositZap(SUSD_DEPOSIT_POOL, true); // curve-susd
        setIsSwapPool(A_SWAP_POOL, true); // aToken
        setIsSwapPool(SA_SWAP_POOL, true); // saToken
        setIsSwapPool(Y_SWAP_POOL, true); // yToken
        setMaxDepositProtocolPct(uint256(10000)); // 100% (basis points)
        setMaxDepositProtocolMode(DataTypes.MaxExposure.Pct);
    }

    /**
     * @inheritdoc IAdapterInvestLimit
     */
    function setMaxDepositPoolPct(address _liquidityPool, uint256 _maxDepositPoolPct)
        external
        override
        onlyRiskOperator
    {
        require(_liquidityPool.isContract(), "!isContract");
        maxDepositPoolPct[_liquidityPool] = _maxDepositPoolPct;
        emit LogMaxDepositPoolPct(maxDepositPoolPct[_liquidityPool], msg.sender);
    }

    /**
     * @inheritdoc IAdapterInvestLimit
     */
    function setMaxDepositAmount(
        address _liquidityPool,
        address,
        uint256 _maxDepositAmount
    ) external override onlyRiskOperator {
        require(_liquidityPool.isContract(), "!isContract");
        // Note: We are using 18 as decimals for USD and BTC
        maxDepositAmount[_liquidityPool] = _maxDepositAmount;
        emit LogMaxDepositAmount(maxDepositAmount[_liquidityPool], msg.sender);
    }

    /**
     * @inheritdoc IAdapterStakingCurve
     */
    function getAllAmountInTokenStakeWrite(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) external override returns (uint256) {
        address[8] memory _underlyingTokens;
        uint256 _liquidityPoolTokenAmount;
        address _swapPool = _getSwapPool(_liquidityPool);
        {
            address _curveRegistry = _getCurveRegistry();
            _underlyingTokens = _getUnderlyingTokens(_swapPool, _curveRegistry);
            address _gauge = _getLiquidityGauge(_swapPool, _curveRegistry);
            _liquidityPoolTokenAmount = ICurveGauge(_gauge).balanceOf(_vault);
        }
        uint256 _b;
        if (_liquidityPoolTokenAmount > 0) {
            _b = ICurveDeposit(_liquidityPool).calc_withdraw_one_coin(
                _liquidityPoolTokenAmount,
                _getTokenIndex(_swapPool, _underlyingToken)
            );
        }
        _b = _b.add(
            IHarvestCodeProvider(registryContract.getHarvestCodeProvider()).rewardBalanceInUnderlyingTokens(
                getRewardToken(_liquidityPool),
                _underlyingToken,
                _getUnclaimedRewardTokenAmountWrite(_vault, _liquidityPool)
            )
        );
        return _b;
    }

    /**
     * @dev Maps true to a liquidity pool if it is swap pool
     * @param _liquidityPool swap pool address
     * @param _isSwap set true if the _liquidityPool is a swap pool
     */
    function setIsSwapPool(address _liquidityPool, bool _isSwap) public onlyOperator {
        isSwapPool[_liquidityPool] = _isSwap;
    }

    /**
     * @dev Maps true to a liquidity pool if it uses old deposit zap API
     * @param _liquidityPool liquidity pool address
     * @param _isOld set true if the liquidity pool uses old deposit zap's API
     */
    function setIsOldDepositZap(address _liquidityPool, bool _isOld) public onlyOperator {
        isOldDepositZap[_liquidityPool] = _isOld;
    }

    /**
     * @inheritdoc IAdapterInvestLimit
     */
    function setMaxDepositProtocolPct(uint256 _maxDepositProtocolPct) public override onlyRiskOperator {
        maxDepositProtocolPct = _maxDepositProtocolPct;
        emit LogMaxDepositProtocolPct(maxDepositProtocolPct, msg.sender);
    }

    /**
     * @inheritdoc IAdapterInvestLimit
     */
    function setMaxDepositProtocolMode(DataTypes.MaxExposure _mode) public override onlyRiskOperator {
        maxDepositProtocolMode = _mode;
        emit LogMaxDepositProtocolMode(maxDepositProtocolMode, msg.sender);
    }

    /**
     * @inheritdoc IAdapter
     */
    function getPoolValue(address _liquidityPool, address) public view override returns (uint256) {
        address _swapPool = _getSwapPool(_liquidityPool);
        uint256 _virtualPrice = ICurveSwap(_swapPool).get_virtual_price();
        uint256 _totalSupply = ERC20(getLiquidityPoolToken(address(0), _liquidityPool)).totalSupply();
        // the pool value will be in USD for US dollar stablecoin pools
        // the pool value will be in BTC for BTC pools
        return (_virtualPrice.mul(_totalSupply)).div(10**18);
    }

    /**
     * @inheritdoc IAdapter
     */
    function getDepositAllCodes(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (bytes[] memory) {
        uint256 _amount = ERC20(_underlyingToken).balanceOf(_vault);
        return _getDepositCode(_underlyingToken, _liquidityPool, _amount);
    }

    /**
     * @inheritdoc IAdapter
     */
    function getWithdrawAllCodes(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (bytes[] memory) {
        uint256 _amount = getLiquidityPoolTokenBalance(_vault, _underlyingToken, _liquidityPool);
        return getWithdrawSomeCodes(_vault, _underlyingToken, _liquidityPool, _amount);
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
        address _swapPool = _getSwapPool(_liquidityPool);
        address _curveRegistry = _getCurveRegistry();
        address[8] memory _underlyingCoins = _getUnderlyingTokens(_swapPool, _curveRegistry);
        uint256 _nCoins = _getNCoins(_swapPool, _curveRegistry);
        _underlyingTokens = new address[](_nCoins);
        for (uint256 _i = 0; _i < _nCoins; _i++) {
            _underlyingTokens[_i] = _underlyingCoins[_i];
        }
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in CurveDeposit pool
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
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (uint256) {
        uint256 _liquidityPoolTokenBalance = getLiquidityPoolTokenBalance(_vault, _underlyingToken, _liquidityPool);
        uint256 _balanceInToken = getAllAmountInToken(_vault, _underlyingToken, _liquidityPool);
        // can have unintentional rounding errors
        return (_liquidityPoolTokenBalance.mul(_redeemAmount)).div(_balanceInToken).add(1);
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
     * @inheritdoc IAdapterHarvestReward
     */
    function getClaimRewardTokenCode(address payable, address _liquidityPool)
        public
        view
        override
        returns (bytes[] memory _codes)
    {
        address _liquidityGauge = _getLiquidityGauge(_getSwapPool(_liquidityPool), _getCurveRegistry());
        if (_liquidityGauge != address(0)) {
            _codes = new bytes[](1);
            _codes[0] = abi.encode(
                _getMinter(_liquidityGauge),
                abi.encodeWithSignature("mint(address)", _liquidityGauge)
            );
        }
    }

    /**
     * @inheritdoc IAdapterHarvestReward
     */
    function getHarvestAllCodes(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (bytes[] memory) {
        uint256 _rewardTokenAmount = ERC20(getRewardToken(_liquidityPool)).balanceOf(_vault);
        return getHarvestSomeCodes(_vault, _underlyingToken, _liquidityPool, _rewardTokenAmount);
    }

    /**
     * @inheritdoc IAdapter
     */
    function canStake(address _liquidityPool) public view override returns (bool) {
        if (_getLiquidityGauge(_getSwapPool(_liquidityPool), _getCurveRegistry()) != address(0)) {
            return true;
        }
        return false;
    }

    /**
     * @inheritdoc IAdapterStaking
     */
    function getStakeAllCodes(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (bytes[] memory) {
        uint256 _stakeAmount = getLiquidityPoolTokenBalance(_vault, _underlyingToken, _liquidityPool);
        return getStakeSomeCodes(_liquidityPool, _stakeAmount);
    }

    /**
     * @inheritdoc IAdapterStaking
     */
    function getUnstakeAllCodes(address payable _vault, address _liquidityPool)
        public
        view
        override
        returns (bytes[] memory)
    {
        uint256 _unstakeAmount = getLiquidityPoolTokenBalanceStake(_vault, _liquidityPool);
        return getUnstakeSomeCodes(_liquidityPool, _unstakeAmount);
    }

    /**
     * @inheritdoc IAdapterStaking
     */
    function calculateRedeemableLPTokenAmountStake(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (uint256) {
        uint256 _liquidityPoolTokenBalance = getLiquidityPoolTokenBalanceStake(_vault, _liquidityPool);
        uint256 _balanceInToken = getAllAmountInTokenStake(_vault, _underlyingToken, _liquidityPool);
        // can have unintentional rounding errors
        return (_liquidityPoolTokenBalance.mul(_redeemAmount)).div(_balanceInToken).add(1);
    }

    /**
     * @inheritdoc IAdapterStaking
     */
    function isRedeemableAmountSufficientStake(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bool) {
        uint256 _balanceInToken = getAllAmountInTokenStake(_vault, _underlyingToken, _liquidityPool);
        return _balanceInToken >= _redeemAmount;
    }

    /**
     * @inheritdoc IAdapterStaking
     */
    function getUnstakeAndWithdrawAllCodes(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (bytes[] memory) {
        uint256 _redeemAmount = getLiquidityPoolTokenBalanceStake(_vault, _liquidityPool);
        return getUnstakeAndWithdrawSomeCodes(_vault, _underlyingToken, _liquidityPool, _redeemAmount);
    }

    /**
     * @inheritdoc IAdapter
     */
    function getDepositSomeCodes(
        address payable,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _amount
    ) public view override returns (bytes[] memory) {
        return _getDepositCode(_underlyingToken, _liquidityPool, _amount);
    }

    /**
     * @inheritdoc IAdapter
     */
    function getWithdrawSomeCodes(
        address payable,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _amount
    ) public view override returns (bytes[] memory _codes) {
        if (_amount > 0) {
            address _swapPool = _getSwapPool(_liquidityPool);
            address _liquidityPoolToken = getLiquidityPoolToken(address(0), _liquidityPool);

            _codes = new bytes[](3);
            _codes[0] = abi.encode(
                _liquidityPoolToken,
                abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, uint256(0))
            );
            _codes[1] = abi.encode(
                _liquidityPoolToken,
                abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _amount)
            );

            _codes[2] = isSwapPool[_liquidityPool]
                ? abi.encode(
                    _liquidityPool,
                    abi.encodeWithSignature(
                        "remove_liquidity_one_coin(uint256,int128,uint256,bool)",
                        _amount,
                        _getTokenIndex(_swapPool, _underlyingToken),
                        uint256(0),
                        true
                    )
                )
                : abi.encode(
                    _liquidityPool,
                    abi.encodeWithSignature(
                        "remove_liquidity_one_coin(uint256,int128,uint256)",
                        _amount,
                        _getTokenIndex(_swapPool, _underlyingToken),
                        uint256(0)
                    )
                );
        }
    }

    /**
     * @inheritdoc IAdapter
     */
    function getLiquidityPoolToken(address, address _liquidityPool) public view override returns (address) {
        return ICurveRegistry(_getCurveRegistry()).get_lp_token(_getSwapPool(_liquidityPool));
    }

    /**
     * @inheritdoc IAdapter
     */
    function getAllAmountInToken(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (uint256) {
        uint256 _liquidityPoolTokenAmount = getLiquidityPoolTokenBalance(_vault, _underlyingToken, _liquidityPool);
        return getSomeAmountInToken(_underlyingToken, _liquidityPool, _liquidityPoolTokenAmount);
    }

    /**
     * @inheritdoc IAdapter
     */
    function getLiquidityPoolTokenBalance(
        address payable _vault,
        address,
        address _liquidityPool
    ) public view override returns (uint256) {
        return ERC20(getLiquidityPoolToken(address(0), _liquidityPool)).balanceOf(_vault);
    }

    /**
     * @inheritdoc IAdapter
     */
    function getSomeAmountInToken(
        address _underlyingToken,
        address _liquidityPool,
        uint256 _liquidityPoolTokenAmount
    ) public view override returns (uint256) {
        if (_liquidityPoolTokenAmount > 0) {
            return
                ICurveDeposit(_liquidityPool).calc_withdraw_one_coin(
                    _liquidityPoolTokenAmount,
                    _getTokenIndex(_getSwapPool(_liquidityPool), _underlyingToken)
                );
        }
        return 0;
    }

    /**
     * @inheritdoc IAdapter
     */
    function getRewardToken(address _liquidityPool) public view override returns (address) {
        address _liquidityGauge = _getLiquidityGauge(_getSwapPool(_liquidityPool), _getCurveRegistry());
        if (_liquidityGauge != address(0)) {
            return ITokenMinter(_getMinter(_liquidityGauge)).token();
        }
        return address(0);
    }

    /**
     * @inheritdoc IAdapterHarvestReward
     */
    function getUnclaimedRewardTokenAmount(
        address payable,
        address _liquidityPool,
        address
    ) public view override returns (uint256) {
        if (_getLiquidityGauge(_getSwapPool(_liquidityPool), _getCurveRegistry()) != address(0)) {
            // TODO : get the amount of unclaimed CRV tokens
            return uint256(1000000000000000000);
        }
        return uint256(0);
    }

    /**
     * @inheritdoc IAdapterHarvestReward
     */
    function getHarvestSomeCodes(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _rewardTokenAmount
    ) public view override returns (bytes[] memory) {
        return
            IHarvestCodeProvider(registryContract.getHarvestCodeProvider()).getHarvestCodes(
                _vault,
                getRewardToken(_liquidityPool),
                _underlyingToken,
                _rewardTokenAmount
            );
    }

    /* solhint-disable no-empty-blocks */

    /**
     * @inheritdoc IAdapterHarvestReward
     */
    function getAddLiquidityCodes(address payable, address) public view override returns (bytes[] memory) {}

    /* solhint-enable no-empty-blocks */

    /**
     * @inheritdoc IAdapterStaking
     */
    function getStakeSomeCodes(address _liquidityPool, uint256 _stakeAmount)
        public
        view
        override
        returns (bytes[] memory _codes)
    {
        if (_stakeAmount > 0) {
            address _liquidityGauge = _getLiquidityGauge(_getSwapPool(_liquidityPool), _getCurveRegistry());
            address _liquidityPoolToken = getLiquidityPoolToken(address(0), _liquidityPool);
            _codes = new bytes[](3);
            _codes[0] = abi.encode(
                _liquidityPoolToken,
                abi.encodeWithSignature("approve(address,uint256)", _liquidityGauge, uint256(0))
            );
            _codes[1] = abi.encode(
                _liquidityPoolToken,
                abi.encodeWithSignature("approve(address,uint256)", _liquidityGauge, _stakeAmount)
            );
            _codes[2] = abi.encode(_liquidityGauge, abi.encodeWithSignature("deposit(uint256)", _stakeAmount));
        }
    }

    /**
     * @inheritdoc IAdapterStaking
     */
    function getUnstakeSomeCodes(address _liquidityPool, uint256 _unstakeAmount)
        public
        view
        override
        returns (bytes[] memory _codes)
    {
        if (_unstakeAmount > 0) {
            address _liquidityGauge = _getLiquidityGauge(_getSwapPool(_liquidityPool), _getCurveRegistry());
            _codes = new bytes[](1);
            _codes[0] = abi.encode(_liquidityGauge, abi.encodeWithSignature("withdraw(uint256)", _unstakeAmount));
        }
    }

    /**
     * @inheritdoc IAdapterStaking
     */
    function getAllAmountInTokenStake(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (uint256) {
        address _swapPool = _getSwapPool(_liquidityPool);

        uint256 _liquidityPoolTokenAmount =
            ICurveGauge(_getLiquidityGauge(_swapPool, _getCurveRegistry())).balanceOf(_vault);
        uint256 _b = 0;
        if (_liquidityPoolTokenAmount > 0) {
            _b = ICurveDeposit(_liquidityPool).calc_withdraw_one_coin(
                _liquidityPoolTokenAmount,
                _getTokenIndex(_swapPool, _underlyingToken)
            );
        }
        IHarvestCodeProvider _harvesCodeProviderContract =
            IHarvestCodeProvider(registryContract.getHarvestCodeProvider());
        uint256 _unclaimedRewwardTokenAmount = getUnclaimedRewardTokenAmount(_vault, _liquidityPool, _underlyingToken);
        _b = _b.add(
            _harvesCodeProviderContract.rewardBalanceInUnderlyingTokens(
                getRewardToken(_liquidityPool),
                _underlyingToken,
                _unclaimedRewwardTokenAmount
            )
        );
        return _b;
    }

    /**
     * @inheritdoc IAdapterStaking
     */
    function getLiquidityPoolTokenBalanceStake(address payable _vault, address _liquidityPool)
        public
        view
        override
        returns (uint256)
    {
        return ICurveGauge(_getLiquidityGauge(_getSwapPool(_liquidityPool), _getCurveRegistry())).balanceOf(_vault);
    }

    /**
     * @inheritdoc IAdapterStaking
     */
    function getUnstakeAndWithdrawSomeCodes(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bytes[] memory _codes) {
        if (_redeemAmount > 0) {
            _codes = new bytes[](4);
            _codes[0] = getUnstakeSomeCodes(_liquidityPool, _redeemAmount)[0];
            bytes[] memory _withdrawCodes =
                getWithdrawSomeCodes(_vault, _underlyingToken, _liquidityPool, _redeemAmount);
            _codes[1] = _withdrawCodes[0];
            _codes[2] = _withdrawCodes[1];
            _codes[3] = _withdrawCodes[2];
        }
    }

    /**
     * @notice Get the Curve Minter's address
     * @param _gauge the liquidity gauge address
     * @return address the address of the minter
     */
    function _getMinter(address _gauge) internal view returns (address) {
        return ICurveGauge(_gauge).minter();
    }

    /**
     * @dev This functions returns the token index for a underlying token
     * @param _underlyingToken address of the underlying asset
     * @param _swapPool swap pool address
     * @return _tokenIndex index of coin in swap pool
     */
    function _getTokenIndex(address _swapPool, address _underlyingToken) internal view returns (int128) {
        address[8] memory _underlyingTokens = _getUnderlyingTokens(_swapPool, _getCurveRegistry());
        for (uint256 _i = 0; _i < _underlyingTokens.length; _i++) {
            if (_underlyingTokens[_i] == _underlyingToken) {
                return int128(_i);
            }
        }
        return int128(0);
    }

    /*
     * @dev Returns the amount of accrued reward tokens for a specific OptyFi's vault
     * @param _vault Address of the OptyFi's vault contract
     * @param _liquidityPool Address of the pool deposit contract
     * @return Returns the amount of accrued reward tokens
     */
    function _getUnclaimedRewardTokenAmountWrite(address payable _vault, address _liquidityPool)
        internal
        returns (uint256)
    {
        address _liquidityGauge = _getLiquidityGauge(_getSwapPool(_liquidityPool), _getCurveRegistry());
        if (_liquidityGauge != address(0)) {
            return ICurveGauge(_liquidityGauge).claimable_tokens(_vault);
        }
        return uint256(0);
    }

    /**
     * @dev This functions composes the function calls to deposit asset into deposit pool
     * @param _underlyingToken address of the underlying asset
     * @param _liquidityPool liquidity pool address
     * @param _amount the amount in underlying token
     * @return _codes bytes array of function calls to be executed from vault
     * */
    function _getDepositCode(
        address _underlyingToken,
        address _liquidityPool,
        uint256 _amount
    ) internal view returns (bytes[] memory _codes) {
        (uint256 _nCoins, address[8] memory _underlyingTokens, uint256[] memory _amounts, uint256 _codeLength) =
            _getDepositCodeConfig(_underlyingToken, _liquidityPool, _amount);
        if (_codeLength > 1) {
            _codes = new bytes[](_codeLength);
            uint256 _j = 0;
            for (uint256 i = 0; i < _nCoins; i++) {
                if (_amounts[i] > 0) {
                    if (_underlyingTokens[i] == HBTC) {
                        _codes[_j++] = abi.encode(
                            _underlyingTokens[i],
                            abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _amounts[i])
                        );
                    } else {
                        _codes[_j++] = abi.encode(
                            _underlyingTokens[i],
                            abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, uint256(0))
                        );
                        _codes[_j++] = abi.encode(
                            _underlyingTokens[i],
                            abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _amounts[i])
                        );
                    }
                }
            }
            if (_nCoins == uint256(2)) {
                uint256[2] memory _depositAmounts = [_amounts[0], _amounts[1]];
                _codes[_j] = isSwapPool[_liquidityPool]
                    ? abi.encode(
                        _liquidityPool,
                        abi.encodeWithSignature(
                            "add_liquidity(uint256[2],uint256,bool)",
                            _depositAmounts,
                            uint256(0),
                            true
                        )
                    )
                    : abi.encode(
                        _liquidityPool,
                        abi.encodeWithSignature("add_liquidity(uint256[2],uint256)", _depositAmounts, uint256(0))
                    );
            } else if (_nCoins == uint256(3)) {
                uint256[3] memory _depositAmounts = [_amounts[0], _amounts[1], _amounts[2]];
                _codes[_j] = isSwapPool[_liquidityPool]
                    ? abi.encode(
                        _liquidityPool,
                        abi.encodeWithSignature(
                            "add_liquidity(uint256[3],uint256,bool)",
                            _depositAmounts,
                            uint256(0),
                            true
                        )
                    )
                    : abi.encode(
                        _liquidityPool,
                        abi.encodeWithSignature("add_liquidity(uint256[3],uint256)", _depositAmounts, uint256(0))
                    );
            } else if (_nCoins == uint256(4)) {
                uint256[4] memory _depositAmounts = [_amounts[0], _amounts[1], _amounts[2], _amounts[3]];
                _codes[_j] = isSwapPool[_liquidityPool]
                    ? abi.encode(
                        _liquidityPool,
                        abi.encodeWithSignature(
                            "add_liquidity(uint256[4],uint256,bool)",
                            _depositAmounts,
                            uint256(0),
                            true
                        )
                    )
                    : abi.encode(
                        _liquidityPool,
                        abi.encodeWithSignature("add_liquidity(uint256[4],uint256)", _depositAmounts, uint256(0))
                    );
            }
        }
    }

    /**
     * @dev This function composes the configuration required to construct fuction calls
     * @param _underlyingToken address of the underlying asset
     * @param _liquidityPool liquidity pool address
     * @param _amount amount in underlying token
     * @return _nCoins number of underlying tokens in liquidity pool
     * @return _underlyingTokens underlying tokens in a liquidity pool
     * @return _amounts value in an underlying token for each underlying token
     * @return _codeLength number of function call required for deposit
     */
    function _getDepositCodeConfig(
        address _underlyingToken,
        address _liquidityPool,
        uint256 _amount
    )
        internal
        view
        returns (
            uint256 _nCoins,
            address[8] memory _underlyingTokens,
            uint256[] memory _amounts,
            uint256 _codeLength
        )
    {
        address _curveRegistry = _getCurveRegistry();
        address _swapPool = _getSwapPool(_liquidityPool);
        _nCoins = _getNCoins(_swapPool, _curveRegistry);
        _underlyingTokens = _getUnderlyingTokens(_swapPool, _curveRegistry);
        _amounts = new uint256[](_nCoins);
        _codeLength = 1;
        for (uint256 _i = 0; _i < _nCoins; _i++) {
            if (_underlyingTokens[_i] == _underlyingToken) {
                _amounts[_i] = _getDepositAmount(_liquidityPool, _underlyingToken, _amount);
                if (_amounts[_i] > 0) {
                    if (_underlyingTokens[_i] == HBTC) {
                        _codeLength++;
                    } else {
                        _codeLength += 2;
                    }
                }
            }
        }
    }

    /**
     * @dev Get the underlying tokens within a liquidity pool
     * @param _swapPool the swap pool address
     * @param _curveRegistry the address of the Curve registry
     * @return list of underlying token addresses
     */
    function _getUnderlyingTokens(address _swapPool, address _curveRegistry) internal view returns (address[8] memory) {
        return ICurveRegistry(_curveRegistry).get_underlying_coins(_swapPool);
    }

    /**
     * @dev Get a liquidity gauge address associated with a liquidity pool
     * @param _swapPool the swap pool address
     * @param _curveRegistry the Curve registry's address
     * @return gauge address
     */
    function _getLiquidityGauge(address _swapPool, address _curveRegistry) internal view returns (address) {
        (address[10] memory _liquidityGauges, ) = ICurveRegistry(_curveRegistry).get_gauges(_swapPool);
        return _liquidityGauges[0];
    }

    /**
     * @dev Get the address of swap pool associated with the liquidity pool
     * @param _liquidityPool liquidity pool address
     * @return  Address of the swap pool
     */
    function _getSwapPool(address _liquidityPool) internal view returns (address) {
        return
            isSwapPool[_liquidityPool] ? _liquidityPool : isOldDepositZap[_liquidityPool]
                ? ICurveDeposit(_liquidityPool).curve()
                : ICurveDeposit(_liquidityPool).pool();
    }

    /**
     * @dev Get the address of the main registry contract
     * @return Address of the main registry contract
     */
    function _getCurveRegistry() internal view returns (address) {
        return ICurveAddressProvider(ADDRESS_PROVIDER).get_registry();
    }

    /**
     * @dev Get number of underlying tokens in a liquidity pool
     * @param _swapPool swap pool address associated with liquidity pool
     * @param _curveRegistry address of the main registry contract
     * @return  Number of underlying tokens
     */
    function _getNCoins(address _swapPool, address _curveRegistry) internal view returns (uint256) {
        return ICurveRegistry(_curveRegistry).get_n_coins(_swapPool)[1];
    }

    /**
     * @dev Get the final value of amount in underlying token to be deposited
     * @param _liquidityPool liquidity pool address
     * @param _underlyingToken underlying token address
     * @param _amount amount in underlying token
     * @return amount in underlying token to be deposited affected by investment limitation
     */
    function _getDepositAmount(
        address _liquidityPool,
        address _underlyingToken,
        uint256 _amount
    ) internal view returns (uint256) {
        return
            maxDepositProtocolMode == DataTypes.MaxExposure.Pct
                ? _getMaxDepositAmountPct(_liquidityPool, _underlyingToken, _amount)
                : _getMaxDepositAmount(_liquidityPool, _underlyingToken, _amount);
    }

    /**
     * @dev Gets the maximum amount in underlying token limited by percentage
     * @param _liquidityPool liquidity pool address
     * @param _underlyingToken underlying token address
     * @param _amount amount in underlying token
     * @return  amount in underlying token to be deposited affected by
     *          investment limit in percentage
     */
    function _getMaxDepositAmountPct(
        address _liquidityPool,
        address _underlyingToken,
        uint256 _amount
    ) internal view returns (uint256) {
        uint256 _poolValue = getPoolValue(_liquidityPool, _underlyingToken);
        uint256 _poolPct = maxDepositPoolPct[_liquidityPool];
        uint256 _decimals = ERC20(_underlyingToken).decimals();
        uint256 _actualAmount = _amount.mul(10**(uint256(18).sub(_decimals)));
        uint256 _limit =
            _poolPct == 0 ? _poolValue.mul(maxDepositProtocolPct).div(10000) : _poolValue.mul(_poolPct).div(10000);
        return _actualAmount > _limit ? _limit.div(10**(uint256(18).sub(_decimals))) : _amount;
    }

    /**
     * @dev Gets the maximum amount in underlying token affected by investment
     *      limit set for liquidity pool in amount
     * @param _liquidityPool liquidity pool address
     * @param _underlyingToken underlying token address
     * @param _amount amount in underlying token
     * @return amount in underlying token to be deposited affected by
     *         investment limit set for liquidity pool in amount
     */
    function _getMaxDepositAmount(
        address _liquidityPool,
        address _underlyingToken,
        uint256 _amount
    ) internal view returns (uint256) {
        uint256 _decimals = ERC20(_underlyingToken).decimals();
        uint256 _maxAmount = maxDepositAmount[_liquidityPool].div(10**(uint256(18).sub(_decimals)));
        return _amount > _maxAmount ? _maxAmount : _amount;
    }
}
