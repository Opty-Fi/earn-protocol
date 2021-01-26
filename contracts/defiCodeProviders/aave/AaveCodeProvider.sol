// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../interfaces/aave/IPriceOracle.sol";
import "../../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../../interfaces/aave/IAave.sol";
import "../../interfaces/aave/IAToken.sol";
import "../../interfaces/ERC20/IERC20.sol";
import "../../libraries/SafeMath.sol";
import "../../utils/Modifiers.sol";
import "../../utils/ERC20Detailed.sol";

contract AaveCodeProvider is ICodeProvider, Modifiers {
    using SafeMath for uint256;

    uint256 public maxExposure; // basis points

    uint256 public healthFactor = 2;
    uint256 public ltv = 65;
    uint256 public max = 100;

    constructor(address _registry) public Modifiers(_registry) {
        setMaxExposure(uint256(5000)); // 50%
    }

    function getPoolValue(address _liquidityPoolAddressProvider, address _underlyingToken) public view override returns (uint256) {
        return IAave(_getLendingPool(_liquidityPoolAddressProvider)).getReserveData(_underlyingToken).availableLiquidity;
    }

    function getDepositSomeCodes(
        address,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProvider,
        uint256[] memory _amounts
    ) public view override returns (bytes[] memory _codes) {
        if (_amounts[0] > 0) {
            address _lendingPool = _getLendingPool(_liquidityPoolAddressProvider);
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
        address _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProvider
    ) public view override returns (bytes[] memory _codes) {
        uint256[] memory _amounts = new uint256[](1);
        _amounts[0] = IERC20(_underlyingTokens[0]).balanceOf(_optyPool);
        return getDepositSomeCodes(_optyPool, _underlyingTokens, _liquidityPoolAddressProvider, _amounts);
    }

    function getBorrowAllCodes(
        address _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProvider,
        address _outputToken
    ) public view override returns (bytes[] memory _codes) {
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProvider);
        ReserveConfigurationData memory _reserveConfigurationData = IAave(_lendingPool).getReserveConfigurationData(_underlyingTokens[0]);
        if (_reserveConfigurationData.usageAsCollateralEnabled && _reserveConfigurationData.stableBorrowRateEnabled) {
            uint256 _borrow = _availableToBorrowReserve(_optyPool, _liquidityPoolAddressProvider, _outputToken);
            if (_borrow > 0) {
                bool _isUserCollateralEnabled = IAave(_lendingPool).getUserReserveData(_underlyingTokens[0], _optyPool).enabled;
                if (_isUserCollateralEnabled) {
                    _codes = new bytes[](1);
                    _codes[0] = abi.encode(
                        _lendingPool,
                        abi.encodeWithSignature("borrow(address,uint256,uint256,uint16)", _outputToken, _borrow, uint256(1), uint16(0))
                    );
                } else {
                    _codes = new bytes[](2);
                    _codes[0] = abi.encode(
                        _lendingPool,
                        abi.encodeWithSignature("setUserUseReserveAsCollateral(address,bool)", _underlyingTokens[0], true)
                    );
                    _codes[1] = abi.encode(
                        _lendingPool,
                        abi.encodeWithSignature("borrow(address,uint256,uint256,uint16)", _outputToken, _borrow, uint256(1), uint16(0))
                    );
                }
            }
        } else {
            revert("!borrow");
        }
    }
    
    function _debt(
        address _optyPool,
        address _lendingPool,
        address _outputToken
    ) public view returns (uint256) {
        return IAave(_lendingPool).getUserReserveData(_outputToken, _optyPool).currentBorrowBalance;
    }
    
    // % of tokens locked and cannot be withdrawn per user
    // this is impermanent locked, unless the debt out accrues the strategy
    function _locked(address _optyPool, address _lendingPool, address _borrowToken, uint _borrowAmount) public view returns (uint) {
        return _borrowAmount.mul(1e18).div(_debt(_optyPool,_lendingPool,_borrowToken));
    }
    
    // Calculates in impermanent lock due to debt
    function _maxWithdrawal(address _optyPool, address _lendingPool, uint _aTokenAmount,address _borrowToken, uint _borrowAmount) public view returns (uint) {
        uint _safeWithdraw = _aTokenAmount.mul(_locked(_optyPool, _lendingPool,_borrowToken,_borrowAmount)).div(1e18);
        if (_safeWithdraw > _aTokenAmount) {
            return _aTokenAmount;
        } else {
            uint _diff = _aTokenAmount.sub(_safeWithdraw);
            return _aTokenAmount.sub(_diff.mul(healthFactor)); // technically 150%, not 200%, but adding buffer
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
        
        // // borrow token amount
        uint256 _borrowAmount = IERC20(_outputToken).balanceOf(_optyPool);

        uint256 _aTokenAmount = _maxWithdrawal(_optyPool, _lendingPool, _liquidityPoolTokenBalance, _outputToken, _borrowAmount);
        
        uint256 _outputTokenRepayable =
            _over(_optyPool, _underlyingTokens[0], _liquidityPoolAddressProvider, _outputToken, _aTokenAmount);
        
        if (_outputTokenRepayable > 0) {
            if (_outputTokenRepayable > _borrowAmount) {
                _outputTokenRepayable = _borrowAmount;
            }
            if (_outputTokenRepayable > 0) {
                _codes = new bytes[](4);
                _codes[0] = abi.encode(_outputToken, abi.encodeWithSignature("approve(address,uint256)", _lendingPoolCore, uint256(0)));
                _codes[1] = abi.encode(
                    _outputToken,
                    abi.encodeWithSignature("approve(address,uint256)", _lendingPoolCore, _borrowAmount)
                );
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
        address,
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
        address _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProvider
    ) public view override returns (bytes[] memory _codes) {
        uint256 _redeemAmount = getLiquidityPoolTokenBalance(_optyPool, _underlyingTokens[0], _liquidityPoolAddressProvider);
        return getWithdrawSomeCodes(_optyPool, _underlyingTokens, _liquidityPoolAddressProvider, _redeemAmount);
    }

    function getLiquidityPoolToken(address _underlyingToken, address _liquidityPoolAddressProvider) public view override returns (address) {
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProvider);
        ReserveData memory _reserveData = IAave(_lendingPool).getReserveData(_underlyingToken);
        return _reserveData.aTokenAddress;
    }

    function getUnderlyingTokens(address, address _liquidityPoolToken) public view override returns (address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = IAToken(_liquidityPoolToken).underlyingAssetAddress();
    }

    function getAllAmountInToken(
        address _optyPool,
        address _underlyingToken,
        address _liquidityPoolAddressProvider
    ) public view override returns (uint256) {
        return getLiquidityPoolTokenBalance(_optyPool, _underlyingToken, _liquidityPoolAddressProvider);
    }

    function getLiquidityPoolTokenBalance(
        address _optyPool,
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

    function calculateAmountInLPToken(
        address,
        address,
        uint256 _underlyingTokenAmount
    ) public view override returns (uint256) {
        return _underlyingTokenAmount;
    }

    function calculateRedeemableLPTokenAmount(
        address,
        address,
        address,
        uint256 _redeemAmount
    ) public view override returns (uint256) {
        return _redeemAmount;
    }

    function isRedeemableAmountSufficient(
        address _optyPool,
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

    function getUnclaimedRewardTokenAmount(address, address) public view override returns (uint256) {
        revert("!empty");
    }

    function getClaimRewardTokenCode(address, address) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getHarvestSomeCodes(
        address,
        address,
        address,
        uint256
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getHarvestAllCodes(
        address,
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
        address,
        address[] memory,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getUnstakeSomeCodes(address, uint256) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getUnstakeAllCodes(address, address) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getAllAmountInTokenStake(
        address,
        address,
        address
    ) public view override returns (uint256) {
        revert("!empty");
    }

    function getLiquidityPoolTokenBalanceStake(address, address) public view override returns (uint256) {
        revert("!empty");
    }

    function calculateRedeemableLPTokenAmountStake(
        address,
        address,
        address,
        uint256
    ) public view override returns (uint256) {
        revert("!empty");
    }

    function isRedeemableAmountSufficientStake(
        address,
        address,
        address,
        uint256
    ) public view override returns (bool) {
        revert("!empty");
    }

    function getUnstakeAndWithdrawSomeCodes(
        address,
        address[] memory,
        address,
        uint256
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getUnstakeAndWithdrawAllCodes(
        address,
        address[] memory,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function setMaxExposure(uint256 _maxExposure) public onlyOperator {
        maxExposure = _maxExposure;
    }

    function _getLendingPool(address _lendingPoolAddressProvider) internal view returns (address) {
        return ILendingPoolAddressesProvider(_lendingPoolAddressProvider).getLendingPool();
    }

    function _getLendingPoolCore(address _lendingPoolAddressProvider) internal view returns (address) {
        return ILendingPoolAddressesProvider(_lendingPoolAddressProvider).getLendingPoolCore();
    }

    function _getPriceOracle(address _lendingPoolAddressProvider) internal view returns (address) {
        return ILendingPoolAddressesProvider(_lendingPoolAddressProvider).getPriceOracle();
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
        public
        view
        returns (
            uint256 maxBorrowsETH,
            uint256 totalBorrowsETH,
            uint256 availableBorrowsETH
        )
    {
        UserAccountData memory _userAccountData = IAave(_getLendingPool(_liquidityPoolAddressProvider)).getUserAccountData(_optyPool);
        uint256 _totalBorrowsETH = _userAccountData.totalBorrowsETH;
        uint256 _availableBorrowsETH = _userAccountData.availableBorrowsETH;
        uint256 _maxBorrowETH = (_totalBorrowsETH.add(_availableBorrowsETH));
        return (_maxBorrowETH.div(healthFactor), _totalBorrowsETH, _availableBorrowsETH);
    }

    function _availableToBorrowETH(address _optyPool, address _liquidityPoolAddressProvider) public view returns (uint256) {
        (uint256 _maxSafeETH_, uint256 _totalBorrowsETH, uint256 _availableBorrowsETH) = _maxSafeETH(_optyPool, _liquidityPoolAddressProvider);
        _maxSafeETH_ = _maxSafeETH_.mul(95).div(100); // 5% buffer so we don't go into a earn/rebalance loop
        if (_maxSafeETH_ > _totalBorrowsETH) {
            return _availableBorrowsETH.mul(_maxSafeETH_.sub(_totalBorrowsETH)).div(_availableBorrowsETH);
        } else {
            return 0;
        }
    }

    function _getReservePrice(address _liquidityPoolAddressProvider, address _token) public view returns (uint256) {
        return _getReservePriceETH(_liquidityPoolAddressProvider, _token);
    }

    function _getReservePriceETH(address _liquidityPoolAddressProvider, address _token) public view returns (uint256) {
        return IPriceOracle(_getPriceOracle(_liquidityPoolAddressProvider)).getAssetPrice(_token);
    }

    function _availableToBorrowReserve(
        address _optyPool,
        address _liquidityPoolAddressProvider,
        address _outputToken
    ) public view returns (uint256) {
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

    function _getUnderlyingPrice(address _liquidityPoolAddressProvider, address _underlyingToken) public view returns (uint256) {
        return _getReservePriceETH(_liquidityPoolAddressProvider, _underlyingToken);
    }

    function _getUnderlyingPriceETH(
        address _underlyingToken,
        address _liquidityPoolAddressProvider,
        uint256 _amount
    ) public view returns (uint256) {
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
    ) public view returns (uint256) {
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
    ) public view returns (UserReserveData memory) {
        return IAave(_lendingPool).getUserReserveData(_underlyingToken, _optyPool);
    }
}
