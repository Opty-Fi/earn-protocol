// solhint-disable no-unused-vars
// SPDX-License-Identifier:MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

//  libraries
import { DataTypes } from "../../../libraries/types/DataTypes.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";

//  helper contracts
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Modifiers } from "../../configuration/Modifiers.sol";
import { HarvestCodeProvider } from "../../configuration/HarvestCodeProvider.sol";

//  interfaces
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IAaveV1PriceOracle } from "../../../interfaces/aave/v1/IAaveV1PriceOracle.sol";
import {
    IAaveV1LendingPoolAddressesProvider
} from "../../../interfaces/aave/v1/IAaveV1LendingPoolAddressesProvider.sol";
import {
    IAaveV1,
    UserReserveData,
    ReserveConfigurationData,
    ReserveDataV1,
    UserAccountData
} from "../../../interfaces/aave/v1/IAaveV1.sol";
import { IAaveV1Token } from "../../../interfaces/aave/v1/IAaveV1Token.sol";
import { IAdapterMinimal } from "../../../interfaces/opty/IAdapterMinimal.sol";
import { IAdapterBorrow } from "../../../interfaces/opty/IAdapterBorrow.sol";
import { IAdapterProtocolConfig } from "../../../interfaces/opty/IAdapterProtocolConfig.sol";
import { IAdapterInvestLimit } from "../../../interfaces/opty/IAdapterInvestLimit.sol";

/**
 * @title Adapter for AaveV1 protocol
 * @author Opty.fi
 * @dev Abstraction layer to Aave V1's pools
 */
contract AaveV1Adapter is IAdapterMinimal, IAdapterBorrow, IAdapterProtocolConfig, IAdapterInvestLimit, Modifiers {
    using SafeMath for uint256;

    /** @notice  Maps liquidityPool to max deposit value in percentage */
    mapping(address => uint256) public maxDepositPoolPct; // basis points

    /** @notice  Maps liquidityPool to max deposit value in number */
    mapping(address => uint256) public maxDepositAmount;

    /** @notice HarvestCodeProvider contract instance */
    HarvestCodeProvider public harvestCodeProviderContract;

    /** @notice max deposit value datatypes */
    DataTypes.MaxExposure public maxExposureType;

    /**
     * @notice numeric representation of the safety of vault's deposited assets against the borrowed assets
     * and its underlying value
     */
    uint256 public healthFactor = 2;

    /**
     * @notice  Pct of the value in USD of the collateral we can borrow
     * @dev ltv defines as loan-to-value
     */
    uint256 public ltv = 65;

    /** @notice Max percentage value i.e. 100% */
    uint256 public max = 100;

    /** @notice max deposit's default value in percentage */
    uint256 public maxDepositPoolPctDefault; // basis points

    /** @notice max deposit's default value in number */
    uint256 public maxDepositAmountDefault;

    constructor(address _registry, address _harvestCodeProvider) public Modifiers(_registry) {
        setHarvestCodeProvider(_harvestCodeProvider);
        setMaxDepositPoolPctDefault(uint256(10000)); // 100%
        setMaxDepositPoolType(DataTypes.MaxExposure.Number);
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function setMaxDepositPoolPct(address _liquidityPool, uint256 _maxDepositPoolPct) external override onlyGovernance {
        maxDepositPoolPct[_liquidityPool] = _maxDepositPoolPct;
    }

    /**
     * @inheritdoc IAdapterInvestLimit
     */
    function setMaxDepositAmountDefault(uint256 _maxDepositAmountDefault) external override onlyGovernance {
        maxDepositAmountDefault = _maxDepositAmountDefault;
    }

    /**
     * @inheritdoc IAdapterInvestLimit
     */
    function setMaxDepositAmount(address _liquidityPool, uint256 _maxDepositAmount) external override onlyGovernance {
        maxDepositAmount[_liquidityPool] = _maxDepositAmount;
    }

    /**
     * @inheritdoc IAdapterProtocolConfig
     */
    function setHarvestCodeProvider(address _harvestCodeProvider) public override onlyOperator {
        harvestCodeProviderContract = HarvestCodeProvider(_harvestCodeProvider);
    }

    /**
     * @inheritdoc IAdapterInvestLimit
     */
    function setMaxDepositPoolType(DataTypes.MaxExposure _type) public override onlyGovernance {
        maxExposureType = _type;
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function setMaxDepositPoolPctDefault(uint256 _maxDepositPoolPctDefault) public override onlyGovernance {
        maxDepositPoolPctDefault = _maxDepositPoolPctDefault;
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function getDepositAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProvider
    ) public view override returns (bytes[] memory _codes) {
        uint256[] memory _amounts = new uint256[](1);
        _amounts[0] = IERC20(_underlyingTokens[0]).balanceOf(_optyVault);
        return getDepositSomeCodes(_optyVault, _underlyingTokens, _liquidityPoolAddressProvider, _amounts);
    }

    /**
     * @inheritdoc IAdapterBorrow
     */
    function getBorrowAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProvider,
        address _outputToken
    ) public view override returns (bytes[] memory _codes) {
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProvider);
        ReserveConfigurationData memory _inputTokenReserveConfigurationData =
            IAaveV1(_lendingPool).getReserveConfigurationData(_underlyingTokens[0]);
        ReserveConfigurationData memory _outputTokenReserveConfigurationData =
            IAaveV1(_lendingPool).getReserveConfigurationData(_outputToken);
        require(
            _inputTokenReserveConfigurationData.isActive &&
                _inputTokenReserveConfigurationData.usageAsCollateralEnabled &&
                _outputTokenReserveConfigurationData.isActive &&
                _outputTokenReserveConfigurationData.borrowingEnabled,
            "!borrow"
        );
        uint256 _borrow = _availableToBorrowReserve(_optyVault, _liquidityPoolAddressProvider, _outputToken);
        if (_borrow > 0) {
            bool _isUserCollateralEnabled =
                IAaveV1(_lendingPool).getUserReserveData(_underlyingTokens[0], _optyVault).enabled;
            uint256 _interestRateMode =
                _outputTokenReserveConfigurationData.stableBorrowRateEnabled ? uint256(1) : uint256(2);
            if (_isUserCollateralEnabled) {
                _codes = new bytes[](1);
                _codes[0] = abi.encode(
                    _lendingPool,
                    abi.encodeWithSignature(
                        "borrow(address,uint256,uint256,uint16)",
                        _outputToken,
                        _borrow,
                        _interestRateMode,
                        uint16(0)
                    )
                );
            } else {
                _codes = new bytes[](2);
                _codes[0] = abi.encode(
                    _lendingPool,
                    abi.encodeWithSignature("setUserUseReserveAsCollateral(address,bool)", _underlyingTokens[0], true)
                );
                _codes[1] = abi.encode(
                    _lendingPool,
                    abi.encodeWithSignature(
                        "borrow(address,uint256,uint256,uint16)",
                        _outputToken,
                        _borrow,
                        _interestRateMode,
                        uint16(0)
                    )
                );
            }
        }
    }

    /**
     * @inheritdoc IAdapterBorrow
     */
    function getRepayAndWithdrawAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProvider,
        address _outputToken
    ) public view override returns (bytes[] memory _codes) {
        address _lendingPoolCore = _getLendingPoolCore(_liquidityPoolAddressProvider);
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProvider);
        uint256 _liquidityPoolTokenBalance =
            getLiquidityPoolTokenBalance(_optyVault, _underlyingTokens[0], _liquidityPoolAddressProvider);

        // borrow token amount
        uint256 _borrowAmount = IERC20(_outputToken).balanceOf(_optyVault);

        uint256 _aTokenAmount =
            _maxWithdrawal(_optyVault, _lendingPool, _liquidityPoolTokenBalance, _outputToken, _borrowAmount);

        uint256 _outputTokenRepayable =
            _over(_optyVault, _underlyingTokens[0], _liquidityPoolAddressProvider, _outputToken, _aTokenAmount);

        if (_outputTokenRepayable > 0) {
            if (_outputTokenRepayable > _borrowAmount) {
                _outputTokenRepayable = _borrowAmount;
            }
            if (_outputTokenRepayable > 0) {
                _codes = new bytes[](4);
                _codes[0] = abi.encode(
                    _outputToken,
                    abi.encodeWithSignature("approve(address,uint256)", _lendingPoolCore, uint256(0))
                );
                _codes[1] = abi.encode(
                    _outputToken,
                    abi.encodeWithSignature("approve(address,uint256)", _lendingPoolCore, _borrowAmount)
                );
                _codes[2] = abi.encode(
                    _lendingPool,
                    abi.encodeWithSignature("repay(address,uint256,address)", _outputToken, _borrowAmount, _optyVault)
                );
                _codes[3] = abi.encode(
                    getLiquidityPoolToken(_underlyingTokens[0], _liquidityPoolAddressProvider),
                    abi.encodeWithSignature("redeem(uint256)", _aTokenAmount)
                );
            }
        }
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function getWithdrawAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProvider
    ) public view override returns (bytes[] memory _codes) {
        uint256 _redeemAmount =
            getLiquidityPoolTokenBalance(_optyVault, _underlyingTokens[0], _liquidityPoolAddressProvider);
        return getWithdrawSomeCodes(_optyVault, _underlyingTokens, _liquidityPoolAddressProvider, _redeemAmount);
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function getUnderlyingTokens(address, address _liquidityPoolToken)
        public
        view
        override
        returns (address[] memory _underlyingTokens)
    {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = IAaveV1Token(_liquidityPoolToken).underlyingAssetAddress();
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function getSomeAmountInToken(
        address,
        address,
        uint256 _liquidityPoolTokenAmount
    ) public view override returns (uint256) {
        return _liquidityPoolTokenAmount;
    }

    /**
     * @inheritdoc IAdapterBorrow
     */
    function getAllAmountInTokenBorrow(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPoolAddressProvider,
        address _borrowToken,
        uint256 _borrowAmount
    ) public view override returns (uint256) {
        uint256 _liquidityPoolTokenBalance =
            getLiquidityPoolTokenBalance(_optyVault, _underlyingToken, _liquidityPoolAddressProvider);
        return
            getSomeAmountInTokenBorrow(
                _optyVault,
                _underlyingToken,
                _liquidityPoolAddressProvider,
                _liquidityPoolTokenBalance,
                _borrowToken,
                _borrowAmount
            );
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function calculateAmountInLPToken(
        address,
        address,
        uint256 _underlyingTokenAmount
    ) public view override returns (uint256) {
        return _underlyingTokenAmount;
    }

    /**
     * @inheritdoc IAdapterMinimal
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
     * @inheritdoc IAdapterMinimal
     */
    function isRedeemableAmountSufficient(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bool) {
        uint256 _balanceInToken = getAllAmountInToken(_optyVault, _underlyingToken, _liquidityPool);
        return _balanceInToken >= _redeemAmount;
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function getRewardToken(address) public view override returns (address) {
        return address(0);
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function canStake(address) public view override returns (bool) {
        return false;
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function getPoolValue(address _liquidityPoolAddressProvider, address _underlyingToken)
        public
        view
        override
        returns (uint256)
    {
        return
            IAaveV1(_getLendingPool(_liquidityPoolAddressProvider)).getReserveData(_underlyingToken).availableLiquidity;
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function getDepositSomeCodes(
        address payable,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProvider,
        uint256[] memory _amounts
    ) public view override returns (bytes[] memory _codes) {
        if (_amounts[0] > 0) {
            address _lendingPool = _getLendingPool(_liquidityPoolAddressProvider);
            ReserveConfigurationData memory _inputTokenReserveConfigurationData =
                IAaveV1(_lendingPool).getReserveConfigurationData(_underlyingTokens[0]);
            require(_inputTokenReserveConfigurationData.isActive, "!isActive");
            address _lendingPoolCore = _getLendingPoolCore(_liquidityPoolAddressProvider);
            uint256 _depositAmount =
                _getDepositAmount(_liquidityPoolAddressProvider, _underlyingTokens[0], _amounts[0]);
            _codes = new bytes[](3);
            _codes[0] = abi.encode(
                _underlyingTokens[0],
                abi.encodeWithSignature("approve(address,uint256)", _lendingPoolCore, uint256(0))
            );
            _codes[1] = abi.encode(
                _underlyingTokens[0],
                abi.encodeWithSignature("approve(address,uint256)", _lendingPoolCore, _depositAmount)
            );
            _codes[2] = abi.encode(
                _lendingPool,
                abi.encodeWithSignature(
                    "deposit(address,uint256,uint16)",
                    _underlyingTokens[0],
                    _depositAmount,
                    uint16(0)
                )
            );
        }
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function getWithdrawSomeCodes(
        address payable,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProvider,
        uint256 _amount
    ) public view override returns (bytes[] memory _codes) {
        if (_amount > 0) {
            _codes = new bytes[](1);
            _codes[0] = abi.encode(
                getLiquidityPoolToken(_underlyingTokens[0], _liquidityPoolAddressProvider),
                abi.encodeWithSignature("redeem(uint256)", _amount)
            );
        }
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function getLiquidityPoolToken(address _underlyingToken, address _liquidityPoolAddressProvider)
        public
        view
        override
        returns (address)
    {
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProvider);
        ReserveDataV1 memory _reserveData = IAaveV1(_lendingPool).getReserveData(_underlyingToken);
        return _reserveData.aTokenAddress;
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function getAllAmountInToken(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPoolAddressProvider
    ) public view override returns (uint256) {
        return getLiquidityPoolTokenBalance(_optyVault, _underlyingToken, _liquidityPoolAddressProvider);
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function getLiquidityPoolTokenBalance(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPoolAddressProvider
    ) public view override returns (uint256) {
        return IERC20(getLiquidityPoolToken(_underlyingToken, _liquidityPoolAddressProvider)).balanceOf(_optyVault);
    }

    /**
     * @inheritdoc IAdapterBorrow
     */
    function getSomeAmountInTokenBorrow(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPoolAddressProvider,
        uint256 _liquidityPoolTokenBalance,
        address _borrowToken,
        uint256 _borrowAmount
    ) public view override returns (uint256) {
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProvider);
        uint256 _aTokenAmount =
            _maxWithdrawal(_optyVault, _lendingPool, _liquidityPoolTokenBalance, _borrowToken, _borrowAmount);
        uint256 _outputTokenRepayable =
            _over(_optyVault, _underlyingToken, _liquidityPoolAddressProvider, _borrowToken, _aTokenAmount);
        if (_outputTokenRepayable > _borrowAmount) {
            return _aTokenAmount;
        } else {
            return
                _aTokenAmount.add(
                    harvestCodeProviderContract.getOptimalTokenAmount(
                        _borrowToken,
                        _underlyingToken,
                        _borrowAmount.sub(_outputTokenRepayable)
                    )
                );
        }
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

    function _getLendingPool(address _lendingPoolAddressProvider) internal view returns (address) {
        return IAaveV1LendingPoolAddressesProvider(_lendingPoolAddressProvider).getLendingPool();
    }

    function _getLendingPoolCore(address _lendingPoolAddressProvider) internal view returns (address) {
        return IAaveV1LendingPoolAddressesProvider(_lendingPoolAddressProvider).getLendingPoolCore();
    }

    function _getPriceOracle(address _lendingPoolAddressProvider) internal view returns (address) {
        return IAaveV1LendingPoolAddressesProvider(_lendingPoolAddressProvider).getPriceOracle();
    }

    function _maxSafeETH(address _optyVault, address _liquidityPoolAddressProvider)
        internal
        view
        returns (
            uint256 maxBorrowsETH,
            uint256 totalBorrowsETH,
            uint256 availableBorrowsETH
        )
    {
        UserAccountData memory _userAccountData =
            IAaveV1(_getLendingPool(_liquidityPoolAddressProvider)).getUserAccountData(_optyVault);
        uint256 _totalBorrowsETH = _userAccountData.totalBorrowsETH;
        uint256 _availableBorrowsETH = _userAccountData.availableBorrowsETH;
        uint256 _maxBorrowETH = (_totalBorrowsETH.add(_availableBorrowsETH));
        return (_maxBorrowETH.div(healthFactor), _totalBorrowsETH, _availableBorrowsETH);
    }

    function _availableToBorrowETH(address _optyVault, address _liquidityPoolAddressProvider)
        internal
        view
        returns (uint256)
    {
        (uint256 _maxSafeETH_, uint256 _totalBorrowsETH, uint256 _availableBorrowsETH) =
            _maxSafeETH(_optyVault, _liquidityPoolAddressProvider);
        _maxSafeETH_ = _maxSafeETH_.mul(95).div(100); // 5% buffer so we don't go into a earn/rebalance loop
        if (_maxSafeETH_ > _totalBorrowsETH) {
            return _availableBorrowsETH.mul(_maxSafeETH_.sub(_totalBorrowsETH)).div(_availableBorrowsETH);
        } else {
            return 0;
        }
    }

    function _getReservePrice(address _liquidityPoolAddressProvider, address _token) internal view returns (uint256) {
        return _getReservePriceETH(_liquidityPoolAddressProvider, _token);
    }

    function _getReservePriceETH(address _liquidityPoolAddressProvider, address _token)
        internal
        view
        returns (uint256)
    {
        return IAaveV1PriceOracle(_getPriceOracle(_liquidityPoolAddressProvider)).getAssetPrice(_token);
    }

    function _availableToBorrowReserve(
        address _optyVault,
        address _liquidityPoolAddressProvider,
        address _outputToken
    ) internal view returns (uint256) {
        uint256 _available = _availableToBorrowETH(_optyVault, _liquidityPoolAddressProvider);
        if (_available > 0) {
            return
                _available.mul(uint256(10)**ERC20(_outputToken).decimals()).div(
                    _getReservePrice(_liquidityPoolAddressProvider, _outputToken)
                );
        } else {
            return 0;
        }
    }

    function _getUnderlyingPrice(address _liquidityPoolAddressProvider, address _underlyingToken)
        internal
        view
        returns (uint256)
    {
        return _getReservePriceETH(_liquidityPoolAddressProvider, _underlyingToken);
    }

    function _getUnderlyingPriceETH(
        address _underlyingToken,
        address _liquidityPoolAddressProvider,
        uint256 _amount
    ) internal view returns (uint256) {
        address _liquidityPoolToken = getLiquidityPoolToken(_underlyingToken, _liquidityPoolAddressProvider);
        _amount = _amount.mul(_getUnderlyingPrice(_liquidityPoolAddressProvider, _underlyingToken)).div(
            uint256(10)**ERC20(address(_liquidityPoolToken)).decimals()
        ); // Calculate the amount we are withdrawing in ETH
        return _amount.mul(ltv).div(max).div(healthFactor);
    }

    function _over(
        address _optyVault,
        address _underlyingToken,
        address _liquidityPoolAddressProvider,
        address _outputToken,
        uint256 _amount
    ) internal view returns (uint256) {
        uint256 _eth = _getUnderlyingPriceETH(_underlyingToken, _liquidityPoolAddressProvider, _amount);
        (uint256 _maxSafeETH_, uint256 _totalBorrowsETH, ) = _maxSafeETH(_optyVault, _liquidityPoolAddressProvider);
        _maxSafeETH_ = _maxSafeETH_.mul(105).div(100); // 5% buffer so we don't go into a earn/rebalance loop
        if (_eth > _maxSafeETH_) {
            _maxSafeETH_ = 0;
        } else {
            _maxSafeETH_ = _maxSafeETH_.sub(_eth); // Add the ETH we are withdrawing
        }
        if (_maxSafeETH_ < _totalBorrowsETH) {
            uint256 _over_ = _totalBorrowsETH.mul(_totalBorrowsETH.sub(_maxSafeETH_)).div(_totalBorrowsETH);
            _over_ = _over_.mul(uint256(10)**ERC20(_outputToken).decimals()).div(
                _getReservePrice(_liquidityPoolAddressProvider, _outputToken)
            );
            return _over_;
        } else {
            return 0;
        }
    }

    function _getUserReserveData(
        address _lendingPool,
        address _underlyingToken,
        address _optyVault
    ) internal view returns (UserReserveData memory) {
        return IAaveV1(_lendingPool).getUserReserveData(_underlyingToken, _optyVault);
    }

    function _debt(
        address _optyVault,
        address _lendingPool,
        address _outputToken
    ) internal view returns (uint256) {
        return IAaveV1(_lendingPool).getUserReserveData(_outputToken, _optyVault).currentBorrowBalance;
    }

    // % of tokens locked and cannot be withdrawn per user
    // this is impermanent locked, unless the debt out accrues the strategy
    function _locked(
        address _optyVault,
        address _lendingPool,
        address _borrowToken,
        uint256 _borrowAmount
    ) internal view returns (uint256) {
        return _borrowAmount.mul(1e18).div(_debt(_optyVault, _lendingPool, _borrowToken));
    }

    // Calculates in impermanent lock due to debt
    function _maxWithdrawal(
        address _optyVault,
        address _lendingPool,
        uint256 _aTokenAmount,
        address _borrowToken,
        uint256 _borrowAmount
    ) internal view returns (uint256) {
        uint256 _safeWithdraw =
            _aTokenAmount.mul(_locked(_optyVault, _lendingPool, _borrowToken, _borrowAmount)).div(1e18);
        if (_safeWithdraw > _aTokenAmount) {
            return _aTokenAmount;
        } else {
            uint256 _diff = _aTokenAmount.sub(_safeWithdraw);
            return _aTokenAmount.sub(_diff.mul(healthFactor)); // technically 150%, not 200%, but adding buffer
        }
    }
}
