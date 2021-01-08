// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../interfaces/fulcrum/IFulcrum.sol";
import "../../libraries/SafeMath.sol";
import "../../interfaces/ERC20/IERC20.sol";

contract FulcrumCodeprovider is ICodeProvider {
    
    using SafeMath for uint;

    function getDepositSomeCodes(address _optyPool, address[] memory _underlyingTokens, address _liquidityPool , uint[] memory _amounts) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](3);
        _codes[0] = abi.encode(_underlyingTokens[0],abi.encodeWithSignature("approve(address,uint256)",_liquidityPool,uint(0)));
        _codes[1] = abi.encode(_underlyingTokens[0],abi.encodeWithSignature("approve(address,uint256)",_liquidityPool,_amounts[0]));
        _codes[2] = abi.encode(_liquidityPool,abi.encodeWithSignature("mint(address,uint256)",_optyPool,_amounts[0]));
    }
    
    function getDepositAllCodes(address _optyPool, address[] memory _underlyingTokens, address _liquidityPool) public view override returns(bytes[] memory _codes) {
        uint[] memory _amounts = new uint[](1);
        _amounts[0] = IERC20(_underlyingTokens[0]).balanceOf(_optyPool);
        return getDepositSomeCodes(_optyPool,_underlyingTokens,_liquidityPool,_amounts);
    }
    
    function getWithdrawSomeCodes(address _optyPool, address[] memory _underlyingTokens, address _liquidityPool , uint _burnAmount) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(getLiquidityPoolToken(_underlyingTokens[0],_liquidityPool),abi.encodeWithSignature("burn(address,uint256)",_optyPool,_burnAmount));
    }
    
    function getWithdrawAllCodes(address _optyPool, address[] memory _underlyingTokens, address _liquidityPool) public view override returns(bytes[] memory _codes) {
        uint _redeemAmount = getLiquidityPoolTokenBalance(_optyPool,_underlyingTokens[0],_liquidityPool);
        return getWithdrawSomeCodes(_optyPool,_underlyingTokens,_liquidityPool,_redeemAmount);
    }
    
    function getLiquidityPoolToken(address , address _liquidityPool) public override view returns(address) {
        return _liquidityPool;
    }
    
    function getUnderlyingTokens(address _liquidityPool, address) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = IFulcrum(_liquidityPool).loanTokenAddress();
    }

    function getAllAmountInToken(address _optyPool, address _underlyingToken,address _liquidityPool) public override view returns(uint) {
        return getSomeAmountInToken(_underlyingToken,_liquidityPool,getLiquidityPoolTokenBalance(_optyPool,_underlyingToken,_liquidityPool));
    }
    
    function getLiquidityPoolTokenBalance(address _optyPool, address _underlyingToken, address _liquidityPool) public view override returns(uint){
        return IERC20(getLiquidityPoolToken(_underlyingToken,_liquidityPool)).balanceOf(_optyPool);
    }
    
    function getSomeAmountInToken(address _underlyingToken,address _liquidityPool, uint _liquidityPoolTokenAmount) public override view returns(uint256) {
        if (_liquidityPoolTokenAmount > 0) {
            _liquidityPoolTokenAmount = _liquidityPoolTokenAmount.mul(IFulcrum(getLiquidityPoolToken(_underlyingToken,_liquidityPool)).tokenPrice()).div(1e18);
         }
         return _liquidityPoolTokenAmount;
    }
    
    function calculateAmountInLPToken(address _underlyingToken, address _liquidityPool,uint _depositAmount) public override view returns(uint256) {
        return _depositAmount.mul(1e18).div(IFulcrum(getLiquidityPoolToken(_underlyingToken,_liquidityPool)).tokenPrice());
    }
    
    function calculateRedeemableLPTokenAmount(address _optyPool, address _underlyingToken, address _liquidityPool , uint _redeemAmount) public override view returns(uint _amount) {
        uint256 _liquidityPoolTokenBalance = getLiquidityPoolTokenBalance(_optyPool,_underlyingToken,_liquidityPool);
        uint256 _balanceInToken = getAllAmountInToken(_optyPool,_underlyingToken,_liquidityPool);
        // can have unintentional rounding errors
        _amount = (_liquidityPoolTokenBalance.mul(_redeemAmount)).div(_balanceInToken).add(1);
    }
    
    function isRedeemableAmountSufficient(address _optyPool, address _underlyingToken,address _liquidityPool , uint _redeemAmount) public view override returns(bool) {
        uint256 _balanceInToken = getAllAmountInToken(_optyPool,_underlyingToken,_liquidityPool);
        return _balanceInToken >= _redeemAmount;
    }
    
    function getRewardToken(address) public override view returns(address) {
        return address(0);
    }
    
    function getUnclaimedRewardTokenAmount(address , address) public override view returns(uint256){
        revert("!empty");
    }
    
    function getHarvestSomeCodes(address , address , address , uint ) public view override returns(bytes[] memory ) {
        revert("!empty");
    }
    
    function getHarvestAllCodes(address , address , address ) public view override returns(bytes[] memory) {
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
    
    function getStakeAllCodes(address , address[] memory , address ) public view override returns(bytes[] memory ) {
        revert("!empty");
    }
    
    function getUnstakeSomeCodes(address , uint ) public view override returns(bytes[] memory){
        revert("!empty");
    }
    
    function getUnstakeAllCodes(address , address ) public view override returns(bytes[] memory) {
        revert("!empty");
    }
    
    function getAllAmountInTokenStake(address, address, address) public view override returns(uint256) {
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
}
