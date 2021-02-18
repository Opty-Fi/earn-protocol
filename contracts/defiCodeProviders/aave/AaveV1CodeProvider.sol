// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../interfaces/aave/v1/IAaveV1PriceOracle.sol";
import "../../interfaces/aave/v1/IAaveV1LendingPoolAddressesProvider.sol";
import "../../interfaces/aave/v1/IAaveV1.sol";
import "../../interfaces/aave/v1/IAaveV1Token.sol";
import "../../interfaces/ERC20/IERC20.sol";
import "../../libraries/SafeMath.sol";
import "../../utils/Modifiers.sol";
import "../../utils/ERC20Detailed.sol";
import "../../Gatherer.sol";

contract AaveV1CodeProvider is ICodeProvider, Modifiers {
    using SafeMath for uint256;
    
    Gatherer public gathererContract;

    uint256 public maxExposure; // basis points

    uint256 public healthFactor = 2;
    uint256 public ltv = 65;
    uint256 public max = 100;

    constructor(address _registry, address _gatherer) public Modifiers(_registry) {
        setGatherer(_gatherer);
        setMaxExposure(uint256(5000)); // 50%
    }

    function getPoolValue(address _liquidityPoolAddressProvider, address _underlyingToken) public view override returns (uint256) {
        return IAaveV1(_getLendingPool(_liquidityPoolAddressProvider)).getReserveData(_underlyingToken).availableLiquidity;
    }

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
            uint256 _depositAmount = _getDepositAmount(_liquidityPoolAddressProvider, _underlyingTokens[0], _amounts[0]);
            _codes = new bytes[](3);
            _codes[0] = abi.encode(_underlyingTokens[0], abi.encodeWithSignature("approve(address,uint256)", _lendingPoolCore, uint256(0)));
            _codes[1] = abi.encode(_underlyingTokens[0], abi.encodeWithSignature("approve(address,uint256)", _lendingPoolCore, _depositAmount));
            _codes[2] = abi.encode(
                _lendingPool,
                abi.encodeWithSignature("deposit(address,uint256,uint16)", _underlyingTokens[0], _depositAmount, uint16(0))
            );
        }
    }

    function getDepositAllCodes(
        address payable _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProvider
    ) public view override returns (bytes[] memory _codes) {
        uint256[] memory _amounts = new uint256[](1);
        _amounts[0] = IERC20(_underlyingTokens[0]).balanceOf(_optyPool);
        return getDepositSomeCodes(_optyPool, _underlyingTokens, _liquidityPoolAddressProvider, _amounts);
    }

    function getBorrowAllCodes(
        address payable _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProvider,
        address _outputToken
    ) public view override returns (bytes[] memory _codes) {
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProvider);
        ReserveConfigurationData memory _inputTokenReserveConfigurationData =
            IAaveV1(_lendingPool).getReserveConfigurationData(_underlyingTokens[0]);
        ReserveConfigurationData memory _outputTokenReserveConfigurationData = IAaveV1(_lendingPool).getReserveConfigurationData(_outputToken);
        require(
            _inputTokenReserveConfigurationData.isActive &&
                _inputTokenReserveConfigurationData.usageAsCollateralEnabled &&
                _outputTokenReserveConfigurationData.isActive &&
                _outputTokenReserveConfigurationData.borrowingEnabled,
            "!borrow"
        );
        uint256 _borrow = _availableToBorrowReserve(_optyPool, _liquidityPoolAddressProvider, _outputToken);
        if (_borrow > 0) {
            bool _isUserCollateralEnabled = IAaveV1(_lendingPool).getUserReserveData(_underlyingTokens[0], _optyPool).enabled;
            uint256 _interestRateMode = _outputTokenReserveConfigurationData.stableBorrowRateEnabled ? uint256(1) : uint256(2);
            if (_isUserCollateralEnabled) {
                _codes = new bytes[](1);
                _codes[0] = abi.encode(
                    _lendingPool,
                    abi.encodeWithSignature("borrow(address,uint256,uint256,uint16)", _outputToken, _borrow, _interestRateMode, uint16(0))
                );
            } else {
                _codes = new bytes[](2);
                _codes[0] = abi.encode(
                    _lendingPool,
                    abi.encodeWithSignature("setUserUseReserveAsCollateral(address,bool)", _underlyingTokens[0], true)
                );
                _codes[1] = abi.encode(
                    _lendingPool,
                    abi.encodeWithSignature("borrow(address,uint256,uint256,uint16)", _outputToken, _borrow, _interestRateMode, uint16(0))
                );
            }
        }
    }

    function getRepayAndWithdrawAllCodes(
        address payable _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProvider,
        address _outputToken
    ) public view override returns (bytes[] memory _codes) {
        address _lendingPoolCore = _getLendingPoolCore(_liquidityPoolAddressProvider);
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProvider);
        uint256 _liquidityPoolTokenBalance = getLiquidityPoolTokenBalance(_optyPool, _underlyingTokens[0], _liquidityPoolAddressProvider);

        // borrow token amount
        uint256 _borrowAmount = IERC20(_outputToken).balanceOf(_optyPool);

        uint256 _aTokenAmount = _maxWithdrawal(_optyPool, _lendingPool, _liquidityPoolTokenBalance, _outputToken, _borrowAmount);

        uint256 _outputTokenRepayable = _over(_optyPool, _underlyingTokens[0], _liquidityPoolAddressProvider, _outputToken, _aTokenAmount);

        if (_outputTokenRepayable > 0) {
            if (_outputTokenRepayable > _borrowAmount) {
                _outputTokenRepayable = _borrowAmount;
            }
            if (_outputTokenRepayable > 0) {
                _codes = new bytes[](4);
                _codes[0] = abi.encode(_outputToken, abi.encodeWithSignature("approve(address,uint256)", _lendingPoolCore, uint256(0)));
                _codes[1] = abi.encode(_outputToken, abi.encodeWithSignature("approve(address,uint256)", _lendingPoolCore, _borrowAmount));
                _codes[2] = abi.encode(
                    _lendingPool,
                    abi.encodeWithSignature("repay(address,uint256,address)", _outputToken, _borrowAmount, _optyPool)
                );
                _codes[3] = abi.encode(
                    getLiquidityPoolToken(_underlyingTokens[0], _liquidityPoolAddressProvider),
                    abi.encodeWithSignature("redeem(uint256)", _aTokenAmount)
                );
            }
        }
    }

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

    function getWithdrawAllCodes(
        address payable _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProvider
    ) public view override returns (bytes[] memory _codes) {
        uint256 _redeemAmount = getLiquidityPoolTokenBalance(_optyPool, _underlyingTokens[0], _liquidityPoolAddressProvider);
        return getWithdrawSomeCodes(_optyPool, _underlyingTokens, _liquidityPoolAddressProvider, _redeemAmount);
    }

    function getLiquidityPoolToken(address _underlyingToken, address _liquidityPoolAddressProvider) public view override returns (address) {
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProvider);
        ReserveData memory _reserveData = IAaveV1(_lendingPool).getReserveData(_underlyingToken);
        return _reserveData.aTokenAddress;
    }

    function getUnderlyingTokens(address, address _liquidityPoolToken) public view override returns (address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = IAaveV1Token(_liquidityPoolToken).underlyingAssetAddress();
    }

    function getAllAmountInToken(
        address payable _optyPool,
        address _underlyingToken,
        address _liquidityPoolAddressProvider
    ) public view override returns (uint256) {
        return getLiquidityPoolTokenBalance(_optyPool, _underlyingToken, _liquidityPoolAddressProvider);
    }

    function getLiquidityPoolTokenBalance(
        address payable _optyPool,
        address _underlyingToken,
        address _liquidityPoolAddressProvider
    ) public view override returns (uint256) {
        return IERC20(getLiquidityPoolToken(_underlyingToken, _liquidityPoolAddressProvider)).balanceOf(_optyPool);
    }

    function getSomeAmountInToken(
        address,
        address,
        uint256 _liquidityPoolTokenAmount
    ) public view override returns (uint256) {
        return _liquidityPoolTokenAmount;
    }
    
    function getSomeAmountInTokenBorrow(address payable _optyPool, address _underlyingToken, address _liquidityPoolAddressProvider, uint256 _liquidityPoolTokenBalance, address _borrowToken, uint256 _borrowAmount) public view override returns(uint256) {
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProvider);
        uint256 _aTokenAmount = _maxWithdrawal(_optyPool, _lendingPool, _liquidityPoolTokenBalance, _borrowToken, _borrowAmount);
        uint256 _outputTokenRepayable = _over(_optyPool, _underlyingToken, _liquidityPoolAddressProvider, _borrowToken, _aTokenAmount);
        if(_outputTokenRepayable > _borrowAmount) {
            return _aTokenAmount;   
        } else {
            return _aTokenAmount.add(gathererContract.getOptimalTokenAmount(_borrowToken,_underlyingToken,_borrowAmount.sub(_outputTokenRepayable)));
        }
    }
    
    function getAllAmountInTokenBorrow(address payable _optyPool, address _underlyingToken, address _liquidityPoolAddressProvider, address _borrowToken, uint256 _borrowAmount) public view override returns(uint256) {
        uint256 _liquidityPoolTokenBalance = getLiquidityPoolTokenBalance(_optyPool, _underlyingToken, _liquidityPoolAddressProvider);
        return getSomeAmountInTokenBorrow(_optyPool, _underlyingToken, _liquidityPoolAddressProvider, _liquidityPoolTokenBalance, _borrowToken, _borrowAmount);
    }

    function calculateAmountInLPToken(
        address,
        address,
        uint256 _underlyingTokenAmount
    ) public view override returns (uint256) {
        return _underlyingTokenAmount;
    }

    function calculateRedeemableLPTokenAmount(
        address payable,
        address,
        address,
        uint256 _redeemAmount
    ) public view override returns (uint256) {
        return _redeemAmount;
    }

    function isRedeemableAmountSufficient(
        address payable _optyPool,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bool) {
        uint256 _balanceInToken = getAllAmountInToken(_optyPool, _underlyingToken, _liquidityPool);
        return _balanceInToken >= _redeemAmount;
    }

    function getRewardToken(address) public view override returns (address) {
        return address(0);
    }

    function getUnclaimedRewardTokenAmount(address payable, address) public view override returns (uint256) {
        revert("!empty");
    }

    function getClaimRewardTokenCode(address payable, address) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getHarvestSomeCodes(
        address payable,
        address,
        address,
        uint256
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getHarvestAllCodes(
        address payable,
        address,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function canStake(address) public view override returns (bool) {
        return false;
    }

    function getStakeSomeCodes(address, uint256) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getStakeAllCodes(
        address payable,
        address[] memory,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getUnstakeSomeCodes(address, uint256) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getUnstakeAllCodes(address payable, address) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getAllAmountInTokenStake(
        address payable,
        address,
        address
    ) public view override returns (uint256) {
        revert("!empty");
    }

    function getLiquidityPoolTokenBalanceStake(address payable, address) public view override returns (uint256) {
        revert("!empty");
    }

    function calculateRedeemableLPTokenAmountStake(
        address payable,
        address,
        address,
        uint256
    ) public view override returns (uint256) {
        revert("!empty");
    }

    function isRedeemableAmountSufficientStake(
        address payable,
        address,
        address,
        uint256
    ) public view override returns (bool) {
        revert("!empty");
    }

    function getUnstakeAndWithdrawSomeCodes(
        address payable,
        address[] memory,
        address,
        uint256
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getUnstakeAndWithdrawAllCodes(
        address payable,
        address[] memory,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }
    
    function setGatherer(address _gatherer) public onlyOperator {
        gathererContract = Gatherer(_gatherer);
    }

    function setMaxExposure(uint256 _maxExposure) public onlyOperator {
        maxExposure = _maxExposure;
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

    function _getDepositAmount(
        address _liquidityPoolAddressProvider,
        address _underlyingToken,
        uint256 _amount
    ) internal view returns (uint256 _depositAmount) {
        _depositAmount = _amount;
        uint256 _poolValue = getPoolValue(_liquidityPoolAddressProvider, _underlyingToken);
        uint256 _limit = (_poolValue.mul(maxExposure)).div(uint256(10000));
        if (_depositAmount > _limit) {
            _depositAmount = _limit;
        }
    }

    function _maxSafeETH(address _optyPool, address _liquidityPoolAddressProvider)
        internal
        view
        returns (
            uint256 maxBorrowsETH,
            uint256 totalBorrowsETH,
            uint256 availableBorrowsETH
        )
    {
        UserAccountData memory _userAccountData = IAaveV1(_getLendingPool(_liquidityPoolAddressProvider)).getUserAccountData(_optyPool);
        uint256 _totalBorrowsETH = _userAccountData.totalBorrowsETH;
        uint256 _availableBorrowsETH = _userAccountData.availableBorrowsETH;
        uint256 _maxBorrowETH = (_totalBorrowsETH.add(_availableBorrowsETH));
        return (_maxBorrowETH.div(healthFactor), _totalBorrowsETH, _availableBorrowsETH);
    }

    function _availableToBorrowETH(address _optyPool, address _liquidityPoolAddressProvider) internal view returns (uint256) {
        (uint256 _maxSafeETH_, uint256 _totalBorrowsETH, uint256 _availableBorrowsETH) = _maxSafeETH(_optyPool, _liquidityPoolAddressProvider);
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

    function _getReservePriceETH(address _liquidityPoolAddressProvider, address _token) internal view returns (uint256) {
        return IAaveV1PriceOracle(_getPriceOracle(_liquidityPoolAddressProvider)).getAssetPrice(_token);
    }

    function _availableToBorrowReserve(
        address _optyPool,
        address _liquidityPoolAddressProvider,
        address _outputToken
    ) internal view returns (uint256) {
        uint256 _available = _availableToBorrowETH(_optyPool, _liquidityPoolAddressProvider);
        if (_available > 0) {
            return
                _available.mul(uint256(10)**ERC20Detailed(_outputToken).decimals()).div(
                    _getReservePrice(_liquidityPoolAddressProvider, _outputToken)
                );
        } else {
            return 0;
        }
    }

    function _getUnderlyingPrice(address _liquidityPoolAddressProvider, address _underlyingToken) internal view returns (uint256) {
        return _getReservePriceETH(_liquidityPoolAddressProvider, _underlyingToken);
    }

    function _getUnderlyingPriceETH(
        address _underlyingToken,
        address _liquidityPoolAddressProvider,
        uint256 _amount
    ) internal view returns (uint256) {
        address _liquidityPoolToken = getLiquidityPoolToken(_underlyingToken, _liquidityPoolAddressProvider);
        _amount = _amount.mul(_getUnderlyingPrice(_liquidityPoolAddressProvider, _underlyingToken)).div(
            uint256(10)**ERC20Detailed(address(_liquidityPoolToken)).decimals()
        ); // Calculate the amount we are withdrawing in ETH
        return _amount.mul(ltv).div(max).div(healthFactor);
    }

    function _over(
        address _optyPool,
        address _underlyingToken,
        address _liquidityPoolAddressProvider,
        address _outputToken,
        uint256 _amount
    ) internal view returns (uint256) {
        uint256 _eth = _getUnderlyingPriceETH(_underlyingToken, _liquidityPoolAddressProvider, _amount);
        (uint256 _maxSafeETH_, uint256 _totalBorrowsETH, ) = _maxSafeETH(_optyPool, _liquidityPoolAddressProvider);
        _maxSafeETH_ = _maxSafeETH_.mul(105).div(100); // 5% buffer so we don't go into a earn/rebalance loop
        if (_eth > _maxSafeETH_) {
            _maxSafeETH_ = 0;
        } else {
            _maxSafeETH_ = _maxSafeETH_.sub(_eth); // Add the ETH we are withdrawing
        }
        if (_maxSafeETH_ < _totalBorrowsETH) {
            uint256 _over_ = _totalBorrowsETH.mul(_totalBorrowsETH.sub(_maxSafeETH_)).div(_totalBorrowsETH);
            _over_ = _over_.mul(uint256(10)**ERC20Detailed(_outputToken).decimals()).div(
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
        address _optyPool
    ) internal view returns (UserReserveData memory) {
        return IAaveV1(_lendingPool).getUserReserveData(_underlyingToken, _optyPool);
    }

    function _debt(
        address _optyPool,
        address _lendingPool,
        address _outputToken
    ) public view returns (uint256) {
        return IAaveV1(_lendingPool).getUserReserveData(_outputToken, _optyPool).currentBorrowBalance;
    }

    // % of tokens locked and cannot be withdrawn per user
    // this is impermanent locked, unless the debt out accrues the strategy
    function _locked(
        address _optyPool,
        address _lendingPool,
        address _borrowToken,
        uint256 _borrowAmount
    ) internal view returns (uint256) {
        return _borrowAmount.mul(1e18).div(_debt(_optyPool, _lendingPool, _borrowToken));
    }

    // Calculates in impermanent lock due to debt
    function _maxWithdrawal(
        address _optyPool,
        address _lendingPool,
        uint256 _aTokenAmount,
        address _borrowToken,
        uint256 _borrowAmount
    ) internal view returns (uint256) {
        uint256 _safeWithdraw = _aTokenAmount.mul(_locked(_optyPool, _lendingPool, _borrowToken, _borrowAmount)).div(1e18);
        if (_safeWithdraw > _aTokenAmount) {
            return _aTokenAmount;
        } else {
            uint256 _diff = _aTokenAmount.sub(_safeWithdraw);
            return _aTokenAmount.sub(_diff.mul(healthFactor)); // technically 150%, not 200%, but adding buffer
        }
    }
}
