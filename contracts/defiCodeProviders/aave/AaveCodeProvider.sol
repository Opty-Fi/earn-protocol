// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../interfaces/aave/IAave.sol";
import "../../interfaces/aave/IAToken.sol";
import "../../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../../libraries/SafeERC20.sol";

contract AaveCodeProvider is ICodeProvider {
    
    using SafeERC20 for IERC20;
    
    function getDepositCodes(address, address[] memory _underlyingTokens,address _liquidityPoolAddressProvider, address , uint[] memory _amounts) public override view returns(bytes[] memory _codes){
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProvider);
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_lendingPool,abi.encodeWithSignature("deposit(address,uint256,uint16)",_underlyingTokens[0],_amounts[0],uint16(0)));
    }
    
    function getWithdrawCodes(address, address[] memory ,address, address _liquidityPoolToken, uint _amount) 
    public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_liquidityPoolToken,abi.encodeWithSignature("redeem(uint256)",_amount));
    }
    
    function getLiquidityPoolToken(address , address _liquidityPoolToken) public override view returns(address) {
        return _liquidityPoolToken;
    }
    
    function getUnderlyingTokens(address ,address _liquidityPoolToken) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = IAToken(_liquidityPoolToken).underlyingAssetAddress();
    }
    
    function _getUnderlyingTokens(address ,address _liquidityPoolToken) internal view returns(address) {
        return IAToken(_liquidityPoolToken).underlyingAssetAddress();
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
    
    function calculateAmountInToken(address , address , address , uint _liquidityPoolTokenAmount) public override view returns(uint256) {
        return _liquidityPoolTokenAmount;        
    }
    
    function calculateAmountInLPToken(address , address , address , uint _underlyingTokenAmount) public override view returns(uint256) {
        return _underlyingTokenAmount;        
    }
    
    function balanceInToken(address _optyPool, address ,address , address _liquidityPoolToken) public override view returns(uint256) {
        return IERC20(_liquidityPoolToken).balanceOf(_optyPool);
    }
    
    function canStake(address , address , address , address , uint ) public override view returns(bool) {
        return false;
    }
    
    function getRewardToken(address , address , address , address ) public override view returns(address) {
        return address(0);
    }
    
    function getUnclaimedRewardTokenAmount(address , address , address , address) public override view returns(uint256){
        revert("!rewards");
    }
    
    function getClaimRewardTokenCode(address , address , address , address ) public override view returns(bytes[] memory) {
        revert("!rewards");
    }
}
