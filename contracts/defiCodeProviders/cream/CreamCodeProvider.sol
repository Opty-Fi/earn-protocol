// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../Registry.sol";
import "../../interfaces/cream/ICream.sol";
import "../../libraries/SafeERC20.sol";
import "../../libraries/Addresses.sol";
import "../../utils/Modifiers.sol";

contract CreamCodeProvider is ICodeProvider,Modifiers {
    
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using Address for address;

    address public comptroller = address(0x3d5BC3c8d13dcB8bF317092d84783c2697AE9258);
    address public cream = address(0x2ba592F78dB6436527729929AAf6c908497cB200);
    
    function getDepositCodes(address, address[] memory , address _liquidityPool, address , uint[] memory _amounts) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_liquidityPool,abi.encodeWithSignature("mint(uint256)",_amounts[0]));
    }
    
    function getWithdrawCodes(address, address[] memory, address , address _liquidityPoolToken, uint _amount) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_liquidityPoolToken,abi.encodeWithSignature("redeem(uint256)",_amount));
    }
    
    function getLiquidityPoolToken(address , address _liquidityPool) public override view returns(address) {
        return _liquidityPool;
    }
    
    function getUnderlyingTokens(address _liquidityPool, address) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = ICream(_liquidityPool).underlying();
    }

    function balanceInToken(address _optyPool, address, address, address _liquidityPoolToken) public override view returns(uint256) {
        // Mantisa 1e18 to decimals
        uint256 b = IERC20(_liquidityPoolToken).balanceOf(_optyPool);
        if (b > 0) {
            b = b.mul(ICream(_liquidityPoolToken).exchangeRateStored()).div(1e18);
         }
         return b;
    }
    
    function getLiquidityPoolTokenBalance(address _optyPool, address , address , address _liquidityPoolToken) public view override returns(uint){
        return IERC20(_liquidityPoolToken).balanceOf(_optyPool);
    }
    
    function calculateAmountInToken(address ,address, address _liquidityPoolToken, uint _liquidityPoolTokenAmount) public override view returns(uint256) {
        if (_liquidityPoolTokenAmount > 0) {
            _liquidityPoolTokenAmount = _liquidityPoolTokenAmount.mul(ICream(_liquidityPoolToken).exchangeRateStored()).div(1e18);
         }
         return _liquidityPoolTokenAmount;
    }
    
    function calculateAmountInLPToken(address, address, address _liquidityPoolToken,uint _depositAmount) public override view returns(uint256) {
        return _depositAmount.mul(1e18).div(ICream(_liquidityPoolToken).exchangeRateStored());
    }
    
    function calculateRedeemableLPTokenAmount(address _optyPool, address , address, address _liquidityPoolToken, uint _redeemAmount) public override view returns(uint _amount) {
        uint256 _liquidityPoolTokenBalance = IERC20(_liquidityPoolToken).balanceOf(_optyPool);
        uint256 _balanceInToken = balanceInToken(_optyPool,address(0),address(0),_liquidityPoolToken);
        // can have unintentional rounding errors
        _amount = (_liquidityPoolTokenBalance.mul(_redeemAmount)).div(_balanceInToken).add(1);
    }
    
    function isRedeemableAmountSufficient(address _optyPool, address,address, address _liquidityPoolToken, uint _redeemAmount) public view override returns(bool) {
        uint256 _balanceInToken = balanceInToken(_optyPool,address(0),address(0),_liquidityPoolToken);
        return _balanceInToken >= _redeemAmount;
    }
    
    function getRewardToken(address , address , address , address ) public override view returns(address) {
         return cream;
    }
    
    function getUnclaimedRewardTokenAmount(address _optyPool, address , address , address ) public override view returns(uint256){
        return ICream(comptroller).compAccrued(_optyPool);
    }
    
    function getClaimRewardTokenCode(address _optyPool, address , address , address ) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(comptroller,abi.encodeWithSignature("claimComp(address)",_optyPool));
    }
    
    function canStake(address , address , address , address , uint ) public override view returns(bool) {
        return false;
    }
    
    function getStakeCodes(address , address , address , uint ) public view override returns(bytes[] memory){
        revert("!empty");
    }

    function getUnstakeCodes(address , address , address , uint ) public view override returns(bytes[] memory){
        revert("!empty");
    }
    
    function balanceInTokenStake(address, address, address, address) public view override returns(uint256) {
        revert("!empty");
    }
    
    function getLiquidityPoolTokenBalanceStake(address , address , address , address ) public view override returns(uint){
        revert("!empty");
    }
    
    function calculateRedeemableLPTokenAmountStake(address , address , address, address , uint ) public override view returns(uint) {
        revert("!empty");
    }
    
    function isRedeemableAmountSufficientStake(address , address,address, address , uint) public view override returns(bool) {
        revert("!empty");
    }
}
