// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IBorrowPoolProxy.sol";
import "../../interfaces/aave/IAave.sol";
import "../../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../../interfaces/aave/IAToken.sol";
import "../../interfaces/aave/IPriceOracle.sol";
import "../../libraries/SafeERC20.sol";
import "../../utils/ERC20Detailed.sol";
import "../../libraries/Addresses.sol";
import "../../utils/Modifiers.sol";

contract AaveBorrowPoolProxy is IBorrowPoolProxy,Modifiers {
    
    using SafeERC20 for IERC20;
    using SafeERC20 for IAToken;
    using SafeMath for uint;
    using Address for address;
    
    enum BorrowRateModes { None, Stable, Variable }
    BorrowRateModes public borrowRateMode = BorrowRateModes.Stable;
    
    uint256 public healthFactor = 1;
    
    function setBorrowRateMode(BorrowRateModes _borrowRateMode) public onlyGovernance {
      borrowRateMode = _borrowRateMode;   
    }
    
    function setHealthFactor(uint256 _hf) external onlyGovernance {
        healthFactor = _hf;
    }

    function _getLendingPoolCore(address _lendingPoolAddressProvider) internal view returns (address) {
        return ILendingPoolAddressesProvider(_lendingPoolAddressProvider).getLendingPoolCore();
    }
    
    function _getLendingPool(address _lendingPoolAddressProvider) internal view returns (address) {
        return ILendingPoolAddressesProvider(_lendingPoolAddressProvider).getLendingPool();
    }
    
    function _getPriceOracle(address _lendingPoolAddressProvider) internal view returns (address) {
        return ILendingPoolAddressesProvider(_lendingPoolAddressProvider).getPriceOracle();
    }

    function balanceInToken(address _underlyingToken, address _liquidityPoolAddressProvider, address _borrowToken, uint _borrowAmount) public override view returns(uint256) {
        uint _debtWithInterest = getAmountWithInterest(_liquidityPoolAddressProvider, _borrowToken, debt(_liquidityPoolAddressProvider,_borrowToken,address(this)));
        (uint _lpTokenBalance,,,,,,,,,) = getUserReserveData(_liquidityPoolAddressProvider,_underlyingToken,address(this));
        return _borrowAmount.mul(_lpTokenBalance).div(_debtWithInterest);
    }
    
    function debt(address _lendingPoolAddressProvider,address _borrowToken,address _account) public view returns (uint) {
        address _lendingPool = _getLendingPool(_lendingPoolAddressProvider);
        UserReserveData memory _userReserveData = IAave(_lendingPool).getUserReserveData(_borrowToken,_account);
        return _userReserveData.currentBorrowBalance;
    }
    
    function decimalMultiplier(address _token) public view returns(uint) {
        return (uint256(10)**ERC20Detailed(_token).decimals());
    }
    
    function borrow(address _underlyingToken, address _lendingPoolAddressProvider, address _borrowToken, uint _lpmount) public override returns(bool success) {
        // get variables from address provider
        address _lendingPool = _getLendingPool(_lendingPoolAddressProvider);
        address _priceOracle = _getPriceOracle(_lendingPoolAddressProvider);
        address _liquidityPoolToken = getLiquidityPoolToken(_underlyingToken,_lendingPoolAddressProvider);
        UserReserveData memory _userReserveData = IAave(_lendingPool).getUserReserveData(_underlyingToken, address(this));
        IERC20(_liquidityPoolToken).safeTransferFrom(msg.sender,address(this),_lpmount);
        if(!_userReserveData.enabled) {
            IAave(_lendingPool).setUserUseReserveAsCollateral(_underlyingToken,true);        
        }
        UserAccountData memory _userAccountData = IAave(_lendingPool).getUserAccountData(address(this));
        uint256 _maxBorrowETH = (_userAccountData.totalBorrowsETH.add(_userAccountData.availableBorrowsETH));
        uint256 _maxSafeETH = _maxBorrowETH.div(healthFactor); 
        _maxSafeETH = _maxSafeETH.mul(95).div(100); // 5% buffer so we don't go into a earn/rebalance loop
        uint _borrowTokenPriceInWei = IPriceOracle(_priceOracle).getAssetPrice(_borrowToken);
        if (_maxSafeETH > _userAccountData.totalBorrowsETH) {
            uint256 _available = _userAccountData.availableBorrowsETH.
                                    mul(_maxSafeETH.sub(_userAccountData.totalBorrowsETH)).
                                    div(_userAccountData.availableBorrowsETH);
            if(_available > 0) {
                _available = _available.mul(decimalMultiplier(_borrowToken));
                uint256 _borrow = _available.div(_borrowTokenPriceInWei);
                /// 1 is stable rate, 2 is variable rate
                IAave(_lendingPool).borrow(_borrowToken, _borrow, uint(borrowRateMode),  0);
                IERC20(_borrowToken).transfer(msg.sender,_borrow);
            }
        } 
        success = true;
    }

    function getUserReserveData(address _lendingPoolAddressProvider, address _reserve, address _user) public view returns(uint _currentATokenBalance, uint _currentBorrowBalance,uint _principalBorrowBalance, uint _borrowRateMode, uint _borrowRate, uint _liquidityRate, uint _originationFee, uint _variableBorrowIndex, uint _lastUpdateTimestamp, bool _enabled) {
        address _lendingPool = _getLendingPool(_lendingPoolAddressProvider);
        UserReserveData memory _userReserveData = IAave(_lendingPool).getUserReserveData(_reserve, _user);
        _currentATokenBalance = _userReserveData.currentATokenBalance;
        _currentBorrowBalance = _userReserveData.currentBorrowBalance;
        _principalBorrowBalance = _userReserveData.principalBorrowBalance;
        _borrowRateMode = _userReserveData.borrowRateMode;
        _borrowRate = _userReserveData.borrowRate;
        _liquidityRate = _userReserveData.liquidityRate;
        _originationFee = _userReserveData.originationFee;
        _variableBorrowIndex = _userReserveData.variableBorrowIndex;
        _lastUpdateTimestamp = _userReserveData.lastUpdateTimestamp;
        _enabled = _userReserveData.enabled;
    }
    
    function repay (address _underlyingToken, address _liquidityPoolAddressProvider, address _borrowToken, uint _borrowAmount) public override returns (bool success) {
        address _lendingPoolCore = _getLendingPoolCore(_liquidityPoolAddressProvider);
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProvider);
        IERC20(_borrowToken).safeTransferFrom(msg.sender,address(this),_borrowAmount);
        IERC20(_borrowToken).safeApprove(_lendingPoolCore, 0);
        IERC20(_borrowToken).safeApprove(_lendingPoolCore, _borrowAmount);
        address _liquidityPoolToken = getLiquidityPoolToken(_underlyingToken,_liquidityPoolAddressProvider);
        uint _lpamount = balanceInToken(_underlyingToken,_liquidityPoolAddressProvider,_borrowToken,_borrowAmount);
        IAave(_lendingPool).repay(_borrowToken,_borrowAmount,address(uint160(address(this))));
        require(isTransferAllowed(_liquidityPoolToken,address(this), _lpamount),"!isTransferAllowed");
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender, _lpamount);
        success = true;
    }
    
    function getAmountWithInterest( address _lendingPoolAddressProvider, address _borrowToken, uint _amount) public view returns(uint){
        address _lendingPool = _getLendingPool(_lendingPoolAddressProvider);
        ReserveData memory _reserveData = IAave(_lendingPool).getReserveData(_borrowToken);
        uint _amtWithInterest = _amount.add(_amount.mul(_reserveData.stableBorrowRate).div(1e27));
        return _amtWithInterest;
    } 
    
    function isTransferAllowed(address _aToken, address _user, uint _amount) public view returns(bool) {
        return IAToken(_aToken).isTransferAllowed(_user, _amount);
    }
    
    function getLiquidityPoolToken(address _underlyingToken, address _liquidityPoolAddressProvider) public view returns(address) {
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProvider);
        ReserveData memory _reserveData = IAave(_lendingPool).getReserveData(_underlyingToken);
        address _lendingPoolToken = _reserveData.aTokenAddress;
        return _lendingPoolToken;
    }
}

// 1. totalLiquidity = 128367974386028,
// 2. availableLiquidity = 21945602713634,
// 3. totalBorrowsStable = 20066656328490,
// 4. totalBorrowsVariable = 86355715343904,
// 5. liquidityRate = 61801133710507076061334227,
// 6. variableBorrowRate = 74481001699287247529207525,
// 7. stableBorrowRate = 88879529898146025425510732, => 0.09 ~ 9.026%
// 8. averageStableBorrowRate = 74821940602715518864377762,
// 9. utilizationRate = 829041450419407468232668172,
// 10. liquidityIndex = 1032217970139528168218262301,
// 11. variableBorrowIndex = 1047898842960409476596963360,
// 12. aTokenAddress = 0x9bA00D6856a4eDF4665BcA2C2309936572473B7E,
// 13. lastUpdateTimestamp = 1606327540

// usdc 1 => 7112120
// usdc 2 => 7112120