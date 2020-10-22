// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;

import "../../interfaces/opty/IOptyLiquidityPoolProxy.sol";
import "../../interfaces/aave/IAave.sol";
import "../../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../../interfaces/aave/IAToken.sol";
import "../../libraries/SafeERC20.sol";

contract OptyAavePoolProxy is IOptyLiquidityPoolProxy {
    
    using SafeERC20 for IERC20;

    function deploy(address _underlyingToken,address _lendingPoolAddressProvider,address _lendingPoolToken, uint _amount) public override returns(bool){
        address lendingPoolCore = getAaveCore(_lendingPoolAddressProvider);
        address lendingPool = getAave(_lendingPoolAddressProvider);
        IERC20(_underlyingToken).safeApprove(lendingPoolCore, uint(0));
        IERC20(_underlyingToken).safeApprove(lendingPoolCore, uint(_amount));
        IAave(lendingPool).deposit(_underlyingToken,_amount,0);
        IERC20(_lendingPoolToken).safeTransfer(msg.sender, balance(_lendingPoolToken,address(this)));
        return true;
    }
    
    function recall(address _underlyingToken, address _lendingPoolToken, uint _amount) public override returns(bool) {
        IAToken(_lendingPoolToken).redeem(_amount);
        IERC20(_underlyingToken).safeTransfer(msg.sender, balance(_underlyingToken,address(this)));
        return true;
    }

    function getAaveCore(address _lendingPoolAddressProvider) public view returns (address) {
        return ILendingPoolAddressesProvider(_lendingPoolAddressProvider).getLendingPoolCore();
    }
    
    function getAave(address _lendingPoolAddressProvider) public view returns (address) {
        return ILendingPoolAddressesProvider(_lendingPoolAddressProvider).getLendingPool();
    }

    function balanceInToken(address _lendingPoolToken, address _holder) public override view returns(uint256){
         return balance(_lendingPoolToken,_holder);
    }
    
    function balance(address _token,address _holder) public override view returns (uint256) {
         return IERC20(_token).balanceOf(_holder);
    } 
}
