// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../../interfaces/aave/IAave.sol";
import "../../interfaces/aave/IAToken.sol";
import "../../interfaces/ERC20/IERC20.sol";

contract AaveCodeProvider is ICodeProvider {

    function getDepositSomeCodes(address, address[] memory _underlyingTokens,address _liquidityPoolAddressProvider , uint[] memory _amounts) public override view returns(bytes[] memory _codes) {
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProvider);
        address _lendingPoolCore = _getLendingPoolCore(_liquidityPoolAddressProvider);
        _codes = new bytes[](3);
        _codes[0] = abi.encode(_underlyingTokens[0],abi.encodeWithSignature("approve(address,uint256)",_lendingPoolCore,uint(0)));
        _codes[1] = abi.encode(_underlyingTokens[0],abi.encodeWithSignature("approve(address,uint256)",_lendingPoolCore,_amounts[0]));
        _codes[2] = abi.encode(_lendingPool,abi.encodeWithSignature("deposit(address,uint256,uint16)",_underlyingTokens[0],_amounts[0],uint16(0)));
    }
    
    function getDepositAllCodes(address _optyPool, address[] memory _underlyingTokens, address _liquidityPoolAddressProvider) public view override returns(bytes[] memory _codes) {
        uint _depositAmount = IERC20(_underlyingTokens[0]).balanceOf(_optyPool);
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProvider);
        address _lendingPoolCore = _getLendingPoolCore(_liquidityPoolAddressProvider);
        _codes = new bytes[](3);
        _codes[0] = abi.encode(_underlyingTokens[0],abi.encodeWithSignature("approve(address,uint256)",_lendingPoolCore,uint(0)));
        _codes[1] = abi.encode(_underlyingTokens[0],abi.encodeWithSignature("approve(address,uint256)",_lendingPoolCore,_depositAmount));
        _codes[2] = abi.encode(_lendingPool,abi.encodeWithSignature("deposit(address,uint256,uint16)",_underlyingTokens[0],_depositAmount,uint16(0)));
    }
    
    function getWithdrawSomeCodes(address, address[] memory _underlyingTokens,address _liquidityPoolAddressProvider , uint _amount) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(getLiquidityPoolToken(_underlyingTokens[0],_liquidityPoolAddressProvider),abi.encodeWithSignature("redeem(uint256)",_amount));
    }
    
    function getWithdrawAllCodes(address _optyPool, address[] memory _underlyingTokens, address _liquidityPoolAddressProvider) public view override returns(bytes[] memory _codes) {
        uint _redeemAmount = getLiquidityPoolTokenBalance(_optyPool,_underlyingTokens[0],_liquidityPoolAddressProvider);
        _codes = new bytes[](1);
        _codes[0] = abi.encode(getLiquidityPoolToken(_underlyingTokens[0],_liquidityPoolAddressProvider),abi.encodeWithSignature("redeem(uint256)",_redeemAmount));
    }
    
    function getLiquidityPoolToken(address _underlyingToken, address _liquidityPoolAddressProvider) public override view returns(address) {
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProvider);
        ReserveData memory _reserveData = IAave(_lendingPool).getReserveData(_underlyingToken);
        return _reserveData.aTokenAddress;
    }
    
    function getUnderlyingTokens(address ,address _liquidityPoolToken) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = IAToken(_liquidityPoolToken).underlyingAssetAddress();
    }
    
    function balanceInToken(address _optyPool, address _underlyingToken,address _liquidityPoolAddressProvider) public override view returns(uint256) {
        return getLiquidityPoolTokenBalance(_optyPool,_underlyingToken,_liquidityPoolAddressProvider);
    }
    
    function getLiquidityPoolTokenBalance(address _optyPool, address _underlyingToken, address _liquidityPoolAddressProvider) public view override returns(uint){
        return IERC20(getLiquidityPoolToken(_underlyingToken,_liquidityPoolAddressProvider)).balanceOf(_optyPool);
    }
    
    function calculateAmountInToken(address , address , uint _liquidityPoolTokenAmount) public override view returns(uint256) {
        return _liquidityPoolTokenAmount;        
    }
    
    function calculateAmountInLPToken(address, address, uint _underlyingTokenAmount) public override view returns(uint256) {
        return _underlyingTokenAmount;        
    }
    
    function calculateRedeemableLPTokenAmount(address , address , address , uint _redeemAmount) public override view returns(uint) {
        return _redeemAmount;
    }
    
    function isRedeemableAmountSufficient(address _optyPool, address _underlyingToken,address _liquidityPool , uint _redeemAmount) public view override returns(bool) {
        uint256 _balanceInToken = balanceInToken(_optyPool,_underlyingToken,_liquidityPool);
        return _balanceInToken >= _redeemAmount;
    }
    
    function getRewardToken(address) public override view returns(address) {
        return address(0);
    }
    
    function getUnclaimedRewardTokenAmount(address , address) public override view returns(uint256){
        revert("!empty");
    }
    
    function getClaimRewardTokenCode(address , address) public override view returns(bytes[] memory) {
        revert("!empty");
    }
    
    function canStake(address) public override view returns(bool) {
        return false;
    }
    
    function getStakeSomeCodes(address , uint ) public view override returns(bytes[] memory){
        revert("!empty");
    }
    
    function getStakeAllCodes(address , address[] memory , address) public view override returns(bytes[] memory) {
        revert("!empty");        
    }

    function getUnstakeSomeCodes(address , uint ) public view override returns(bytes[] memory){
        revert("!empty");
    }
    
    function getUnstakeAllCodes(address , address ) public view override returns(bytes[] memory) {
        revert("!empty");
    }
    
    function balanceInTokenStake(address, address, address) public view override returns(uint256) {
        revert("!empty");
    }
    
    function getLiquidityPoolTokenBalanceStake(address , address) public view override returns(uint){
        revert("!empty");
    }
    
    function calculateRedeemableLPTokenAmountStake(address , address , address , uint ) public override view returns(uint) {
        revert("!empty");
    }
    
    function isRedeemableAmountSufficientStake(address , address,address , uint) public view override returns(bool) {
        revert("!empty");
    }
    
    function getUnstakeAndWithdrawSomeCodes(address , address[] memory , address , uint ) public view override returns (bytes[] memory) {
        revert("!empty");
    }
    
    function getUnstakeAndWithdrawAllCodes(address , address[] memory , address ) public view override returns (bytes[] memory) {
        revert("!empty");
    }
    
    function _getLendingPool(address _lendingPoolAddressProvider) internal view returns (address) {
        return ILendingPoolAddressesProvider(_lendingPoolAddressProvider).getLendingPool();
    }
    
    function _getLendingPoolCore(address _lendingPoolAddressProvider) internal view returns (address) {
        return ILendingPoolAddressesProvider(_lendingPoolAddressProvider).getLendingPoolCore();
    }
}
