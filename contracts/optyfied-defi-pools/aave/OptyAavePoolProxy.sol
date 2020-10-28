// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IOptyLiquidityPoolProxy.sol";
import "../../interfaces/aave/IAave.sol";
import "../../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../../interfaces/aave/IAToken.sol";
import "../../interfaces/ERC20/IERC20.sol";
import "../../libraries/SafeMath.sol";
import "../../libraries/Addresses.sol";
import "../../interfaces/aave/IPriceOracle.sol";
import "../../libraries/SafeERC20.sol";
import "../../utils/ERC20Detailed.sol";

contract OptyAavePoolProxy is IOptyLiquidityPoolProxy {
    
    using SafeERC20 for IERC20;
    using SafeERC20 for IAToken;
    using SafeMath for uint;

    function deploy(address _underlyingToken,address _lendingPoolAddressProvider,address _lendingPoolToken, uint _amount) public override returns(bool){
        address lendingPoolCore = getLendingPoolCore(_lendingPoolAddressProvider);
        address lendingPool = getLendingPool(_lendingPoolAddressProvider);
        IERC20(_underlyingToken).safeApprove(lendingPoolCore, uint(0));
        IERC20(_underlyingToken).safeApprove(lendingPoolCore, uint(_amount));
        IAave(lendingPool).deposit(_underlyingToken,_amount,0);
        require(isTransferAllowed(_lendingPoolToken,_amount,address(this)),"!transferAllowed");
        IAToken(_lendingPoolToken).safeTransfer(msg.sender, balance(_lendingPoolToken,address(this)));
        return true;
    }
    
    function recall(address _underlyingToken, address _lendingPoolToken, uint _amount) public override returns(bool) {
        require(isTransferAllowed(_lendingPoolToken,_amount,address(this)),"!transferAllowed");
        IAToken(_lendingPoolToken).redeem(_amount);
        IERC20(_underlyingToken).safeTransfer(msg.sender, balance(_underlyingToken,address(this)));
        return true;
    }
    
    function isTransferAllowed(address _lendingPoolToken, uint _amount, address _sender) public returns(bool transferAllowed) {
        (transferAllowed) = IAToken(_lendingPoolToken).isTransferAllowed(_sender, _amount);
    }

    function getLendingPoolCore(address _lendingPoolAddressProvider) public view returns (address) {
        return ILendingPoolAddressesProvider(_lendingPoolAddressProvider).getLendingPoolCore();
    }
    
    function getLendingPool(address _lendingPoolAddressProvider) public view returns (address) {
        return ILendingPoolAddressesProvider(_lendingPoolAddressProvider).getLendingPool();
    }
    
    function getPriceOracle(address _lendingPoolAddressProvider) public view returns (address) {
        return ILendingPoolAddressesProvider(_lendingPoolAddressProvider).getPriceOracle();
    }

    function balanceInToken(address _lendingPoolToken, address _holder) public override view returns(uint256){
         return balance(_lendingPoolToken,_holder);
    }
    
    function balance(address _token,address _holder) public override view returns (uint256) {
         return IERC20(_token).balanceOf(_holder);
    } 
    
    function borrow(address _underlyingToken,address _lendingPoolAddressProvider, address _borrowToken) public override returns(bool success) {
        address _lendingPool = getLendingPool(_lendingPoolAddressProvider);
        address _priceOracle = getPriceOracle(_lendingPoolAddressProvider);
        IAave(_lendingPool).setUserUseReserveAsCollateral(_underlyingToken,true);
        IAave.UserReserveData memory _userReserveData = IAave(_lendingPool).getUserReserveData(_underlyingToken, address(this));
        require(_userReserveData.enabled,"!_userReserveData.enabled");
        IAave.UserAccountData memory _userAccountData = IAave(_lendingPool).getUserAccountData(address(this));
        uint _borrowTokenPriceInWei = IPriceOracle(_priceOracle).getAssetPrice(_borrowToken);
        uint _borrowTokenDecimals = 10 ** uint((ERC20Detailed(_borrowToken).decimals()));
        uint _borrowAmount = (_borrowTokenDecimals.mul(_userAccountData.availableBorrowsETH)).div(_borrowTokenPriceInWei);
        IAave(_lendingPool).borrow(_borrowToken, _borrowAmount, 2,  0);
        IERC20(_borrowToken).transfer(msg.sender,_borrowAmount);
        success = true;
    }
    
    function repay(address _lendingPoolAddressProvider, address _borrowToken,address _lendingPoolToken) public override returns(bool success) {
        address _lendingPoolCore = getLendingPoolCore(_lendingPoolAddressProvider);
        address _lendingPool = getLendingPool(_lendingPoolAddressProvider);
        uint256 _amount = IERC20(_borrowToken).balanceOf(address(this));
        IERC20(_borrowToken).safeApprove(_lendingPoolCore, 0);
        IERC20(_borrowToken).safeApprove(_lendingPoolCore, _amount);
        IAave(_lendingPool).repay(_borrowToken,_amount,address(uint160(address(this))));
        _amount = IERC20(_lendingPoolToken).balanceOf(address(this));
        IERC20(_lendingPoolToken).transfer(msg.sender,_amount);
        success = true;
    }
}
