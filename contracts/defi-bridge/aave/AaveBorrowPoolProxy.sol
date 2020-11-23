// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IBorrowPoolProxy.sol";
import "../../interfaces/aave/IAave.sol";
import "../../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../../interfaces/aave/IAToken.sol";
import "../../Registry.sol";
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
    
    uint256 public healthFactor = 1;
    
    Registry RegistryContract;
    
    constructor(address _registry) public {
        setRegistry(_registry);
    }
    
    function setRegistry(address _registry) public onlyGovernance{
        RegistryContract = Registry(_registry);
    }
    
    function setHealthFactor(uint256 _hf) external onlyGovernance {
        healthFactor = _hf;
    }
    
    function _isTransferAllowed(address _lendingPoolToken, uint _amount, address _sender) internal returns(bool transferAllowed) {
        (transferAllowed) = IAToken(_lendingPoolToken).isTransferAllowed(_sender, _amount);
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

    function balanceInToken(
        address[] memory _underlyingTokens,
        address , 
        address _lendingPoolAddressProvider, 
        address _holder
        ) public override view returns(uint256){
        address _lendingPoolToken = RegistryContract.liquidityPoolToLPTokens(_lendingPoolAddressProvider,keccak256(abi.encodePacked(_underlyingTokens)));
        return IERC20(_lendingPoolToken).balanceOf(_holder);
    }
    
    function borrow(
        address[] memory _underlyingTokens,
        address _lendingPoolAddressProvider, 
        address _borrowToken, 
        uint _amount
        ) public override returns(bool success) {
        address _lendingPool = _getLendingPool(_lendingPoolAddressProvider);
        address _priceOracle = _getPriceOracle(_lendingPoolAddressProvider);
        address _liquidityPoolToken = RegistryContract.liquidityPoolToLPTokens(_lendingPoolAddressProvider,keccak256(abi.encodePacked(_underlyingTokens)));
        IERC20(_liquidityPoolToken).safeTransferFrom(msg.sender,address(this),_amount);
        UserReserveData memory _userReserveData = IAave(_lendingPool).getUserReserveData(_underlyingTokens[0], address(this));
        if(!_userReserveData.enabled) {
            IAave(_lendingPool).setUserUseReserveAsCollateral(_underlyingTokens[0],true);        
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
                uint256 _borrow = _available.mul(uint256(10)**ERC20Detailed(_borrowToken).decimals()).div(_borrowTokenPriceInWei);
                IAave(_lendingPool).borrow(_borrowToken, _borrow, 2,  0);
                IERC20(_borrowToken).transfer(msg.sender,_borrow);
            }
        } 
        success = true;
    }
    
    function getUserReserveData(
        address _lendingPoolAddressProvider, 
        address _reserve, 
        address _user
        ) public view returns(
        uint _currentATokenBalance,
        uint _currentBorrowBalance,
        uint _principalBorrowBalance,
        uint _borrowRateMode,
        uint _borrowRate,
        uint _liquidityRate,
        uint _originationFee,
        uint _variableBorrowIndex,
        uint _lastUpdateTimestamp,
        bool _enabled
            ) {
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
        
    function getUserAccountData(
        address _lendingPoolAddressProvider, 
        address _user
        ) public view returns(
            uint _totalLiquidityETH,
            uint _totalCollateralETH,
            uint _totalBorrowsETH,
            uint _totalFeesETH,
            uint _availableBorrowsETH,
            uint _currentLiquidationThreshold,
            uint _ltv,
            uint _healthFactor
        ) {
            address _lendingPool = _getLendingPool(_lendingPoolAddressProvider);
            UserAccountData memory _userAccountData = IAave(_lendingPool).getUserAccountData(_user);
            _totalLiquidityETH = _userAccountData.totalLiquidityETH;
            _totalCollateralETH = _userAccountData.totalCollateralETH;
            _totalBorrowsETH = _userAccountData.totalBorrowsETH;
            _totalFeesETH = _userAccountData.totalFeesETH;
            _availableBorrowsETH = _userAccountData.availableBorrowsETH;
            _currentLiquidationThreshold = _userAccountData.currentLiquidationThreshold;
            _ltv = _userAccountData.ltv;
            _healthFactor =_userAccountData.healthFactor;
        }
    
    
    function repayBorrow(
        address _lendingPoolAddressProvider, 
        address _borrowToken,
        address _lendingPoolToken,
        uint _amount
        ) public override returns(bool success) {
        address _lendingPoolCore = _getLendingPoolCore(_lendingPoolAddressProvider);
        address _lendingPool = _getLendingPool(_lendingPoolAddressProvider);
        IERC20(_borrowToken).safeTransferFrom(msg.sender,address(this),_amount);
        IERC20(_borrowToken).safeApprove(_lendingPoolCore, 0);
        IERC20(_borrowToken).safeApprove(_lendingPoolCore, _amount);
        IAave(_lendingPool).repay(_borrowToken,_amount,address(uint160(address(this))));
        _amount = IERC20(_lendingPoolToken).balanceOf(address(this));
        IERC20(_lendingPoolToken).transfer(msg.sender,_amount);
        success = true;
    }
}
