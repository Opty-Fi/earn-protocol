// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IDepositPoolProxy.sol";
import "../../interfaces/aave/IAave.sol";
import "../../interfaces/aave/IAToken.sol";
import "../../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../../libraries/SafeERC20.sol";

contract AaveDepositPoolProxy is IDepositPoolProxy {
    
    using SafeERC20 for IERC20;
    
    function deposit(address, address _underlyingToken, address _liquidityPoolAddressProvider, address _liquidityPoolToken, uint[] memory _amounts) public override returns(bool){
        address _lendingPoolCore = _getLendingPoolCore(_liquidityPoolAddressProvider);
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProvider);
        IERC20(_underlyingToken).safeTransferFrom(msg.sender,address(this),_amounts[0]);
        IERC20(_underlyingToken).safeApprove(_lendingPoolCore, uint(0));
        IERC20(_underlyingToken).safeApprove(_lendingPoolCore, uint(_amounts[0]));
        IAave(_lendingPool).deposit(_underlyingToken,_amounts[0],0);
        require(_isTransferAllowed(_liquidityPoolToken,_amounts[0],address(this)),"!transferAllowed");
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender, IERC20(_liquidityPoolToken).balanceOf(address(this)));
        return true;
    }
    
    function withdraw(address, address[] memory _underlyingTokens,address, address _liquidityPoolToken, uint _amount) public override returns(bool) {
        IERC20(_liquidityPoolToken).safeTransferFrom(msg.sender,address(this),_amount);
        require(_isTransferAllowed(_liquidityPoolToken,_amount,address(this)),"!transferAllowed");
        IAToken(_liquidityPoolToken).redeem(_amount);
        IERC20(_underlyingTokens[0]).transfer(msg.sender, IERC20(_underlyingTokens[0]).balanceOf(address(this)));
        return true;
    }
    
    function getLiquidityPoolToken(address _liquidityPoolToken) public override view returns(address) {
        return _liquidityPoolToken;
    }
    
    function getUnderlyingTokens(address ,address _liquidityPoolToken) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = IAToken(_liquidityPoolToken).underlyingAssetAddress();
    }

    function _isTransferAllowed(address _liquidityPoolToken, uint _amount, address _sender) internal view returns(bool transferAllowed) {
        transferAllowed = IAToken(_liquidityPoolToken).isTransferAllowed(_sender, _amount);
    }

    function _getLendingPoolCore(address _lendingPoolAddressProvider) internal view returns (address) {
        return ILendingPoolAddressesProvider(_lendingPoolAddressProvider).getLendingPoolCore();
    }
    
    function _getLendingPool(address _lendingPoolAddressProvider) internal view returns (address) {
        return ILendingPoolAddressesProvider(_lendingPoolAddressProvider).getLendingPool();
    }
    
    function balanceInToken(address, address , address , address _lendingPoolToken, address _holder) public override view returns(uint256) {
        return IERC20(_lendingPoolToken).balanceOf(_holder);
    }
}
