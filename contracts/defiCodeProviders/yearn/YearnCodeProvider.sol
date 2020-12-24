// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../interfaces/yearn/IYearn.sol";
import "../../libraries/SafeERC20.sol";

contract YearnCodeProvider is ICodeProvider {
    
    using SafeERC20 for IERC20;
    using SafeMath for uint;

    function getDepositCodes(address, address[] memory, address _liquidityPool, address , uint[] memory _amounts) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_liquidityPool,abi.encodeWithSignature("deposit(uint256)",_amounts[0]));
    }
    
    function getWithdrawCodes(address, address[] memory , address , address _liquidityPoolToken, uint _shares) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_liquidityPoolToken,abi.encodeWithSignature("withdraw(uint256)",_shares));
    }

    function balanceInToken(address _optyPool, address, address _liquidityPool, address) public override view returns(uint) {
        uint b = IERC20(_liquidityPool).balanceOf(_optyPool);
        if (b > 0) {
            b = b.mul(IYearn(_liquidityPool).getPricePerFullShare()).div(1e18);
        }
        return b;
    }
    
    function calculateAmountInToken(address ,address, address _liquidityPoolToken, uint _liquidityPoolTokenAmount) public override view returns(uint256) {
        if (_liquidityPoolTokenAmount > 0) {
            _liquidityPoolTokenAmount = _liquidityPoolTokenAmount.mul(IYearn(_liquidityPoolToken).getPricePerFullShare()).div(1e18);
         }
         return _liquidityPoolTokenAmount;
    }
    
    function calculateAmountInLPToken(address, address, address _liquidityPoolToken,uint _depositAmount) public override view returns(uint256) {
        return _depositAmount.mul(1e18).div(IYearn(_liquidityPoolToken).getPricePerFullShare());
    }
    
    function getUnderlyingTokens(address _liquidityPool, address) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = IYearn(_liquidityPool).token();
    }

    function getLiquidityPoolToken(address , address _liquidityPool) public override view returns(address) {
        return _liquidityPool;
    }
    
    function canStake(address , address , address , address , uint ) public override view returns(bool) {
        return false;
    }
    
    function getRewardToken(address , address , address , address ) public override view returns(address) {
         return address(0);
    }
    
    function calculateRedeemableLPTokenAmount(address _optyPool, address _underlyingToken, address _liquidityPool, address _liquidityPoolToken, uint _redeemAmount) public override view returns(uint _amount) {
        uint256 _liquidityPoolTokenBalance = IERC20(_liquidityPoolToken).balanceOf(_optyPool);
        uint256 _balanceInToken = balanceInToken(_optyPool,_underlyingToken,_liquidityPool,_liquidityPoolToken);
        // can have unintentional rounding errors
        _amount = (_liquidityPoolTokenBalance.mul(_redeemAmount)).div(_balanceInToken).add(1);
    }
    
    function isRedeemableAmountSufficient(address _optyPool, address _underlyingToken,address _liquidityPool, address _liquidityPoolToken, uint _redeemAmount) public view override returns(bool) {
        uint256 _balanceInToken = balanceInToken(_optyPool,_underlyingToken,_liquidityPool,_liquidityPoolToken);
        return _balanceInToken >= _redeemAmount;
    }
    
    function calculateRedeemableLPTokenAmountStake(address , address , address, address , uint ) public override view returns(uint) {
        revert("!empty");
    }
    
    function isRedeemableAmountSufficientStake(address , address,address, address , uint) public view override returns(bool) {
        revert("!empty");
    }
    
    function getUnclaimedRewardTokenAmount(address , address , address , address) public override view returns(uint256){
        revert("!empty");
    }
    
    function getClaimRewardTokenCode(address , address , address , address ) public override view returns(bytes[] memory) {
        revert("!empty");
    }
    
    function balanceInTokenStake(address, address, address, address) public view override returns(uint256) {
        revert("!empty");
    }
    
    function getLiquidityPoolTokenBalance(address _optyPool, address , address , address _liquidityPoolToken) public view override returns(uint){
        return IERC20(_liquidityPoolToken).balanceOf(_optyPool);
    }
    
    function getLiquidityPoolTokenBalanceStake(address , address , address , address ) public view override returns(uint){
        revert("!empty");
    }

    function getStakeCodes(address , address , address , uint ) public view override returns(bytes[] memory){
        revert("!empty");
    }

    function getUnstakeCodes(address , address , address , uint ) public view override returns(bytes[] memory){
        revert("!empty");
    }
}
