// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../interfaces/compound/ICompound.sol";
import "../../libraries/SafeERC20.sol";
import "../../utils/Modifiers.sol";
import "./../../utils/ERC20Detailed.sol";

contract CompoundCodeProvider is ICodeProvider,Modifiers {
    
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    address public constant comptroller = address(0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B);
    address public constant rewardToken = address(0xc00e94Cb662C3520282E6f5717214004A7f26888);
    
    function getDepositCodes(address , address[] memory,address _liquidityPool , uint[] memory _amounts) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_liquidityPool,abi.encodeWithSignature("mint(uint256)",uint256(_amounts[0])));
    }
    
    function getWithdrawCodes(address ,address[] memory _underlyingTokens, address _liquidityPool , uint _amount) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(getLiquidityPoolToken(_underlyingTokens[0],_liquidityPool),abi.encodeWithSignature("redeem(uint256)",uint256(_amount)));
    }
    
    function getLiquidityPoolToken(address , address _liquidityPool) public override view returns(address) {
        return _liquidityPool;
    }
    
    function getUnderlyingTokens(address _liquidityPool, address) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = ICompound(_liquidityPool).underlying();
    }
    
    function balanceInToken(address _optyPool,address _underlyingToken,address _liquidityPool) public override view returns(uint256) {
        // Mantisa 1e18 to decimals
        uint256 b = getLiquidityPoolTokenBalance(_optyPool,_underlyingToken,_liquidityPool);
        if (b > 0) {
            b = b.mul(ICompound(_liquidityPool).exchangeRateStored()).div(1e18);
         }
         return b;
    }
    
    function getLiquidityPoolTokenBalance(address _optyPool, address _underlyingToken, address _liquidityPool) public view override returns(uint){
        return IERC20(getLiquidityPoolToken(_underlyingToken,_liquidityPool)).balanceOf(_optyPool);
    }
    
    function calculateAmountInToken(address _underlyingToken,address _liquidityPool, uint _liquidityPoolTokenAmount) public override view returns(uint256) {
        if (_liquidityPoolTokenAmount > 0) {
            _liquidityPoolTokenAmount = _liquidityPoolTokenAmount.mul(ICompound(getLiquidityPoolToken(_underlyingToken,_liquidityPool)).exchangeRateStored()).div(1e18);
         }
         return _liquidityPoolTokenAmount;
    }
    
    function calculateAmountInLPToken(address _underlyingToken, address _liquidityPool,uint _depositAmount) public override view returns(uint256) {
        return _depositAmount.mul(1e18).div(ICompound(getLiquidityPoolToken(_underlyingToken,_liquidityPool)).exchangeRateStored());
    }
    
    function calculateRedeemableLPTokenAmount(address _optyPool, address _underlyingToken, address _liquidityPool , uint _redeemAmount) public override view returns(uint _amount) {
        uint256 _liquidityPoolTokenBalance = getLiquidityPoolTokenBalance(_optyPool,_underlyingToken,_liquidityPool);
        uint256 _balanceInToken = balanceInToken(_optyPool,_underlyingToken,_liquidityPool);
        // can have unintentional rounding errors
        _amount = (_liquidityPoolTokenBalance.mul(_redeemAmount)).div(_balanceInToken).add(1);
    }
    
    function isRedeemableAmountSufficient(address _optyPool, address _underlyingToken,address _liquidityPool , uint _redeemAmount) public view override returns(bool) {
        uint256 _balanceInToken = balanceInToken(_optyPool,_underlyingToken,_liquidityPool);
        return _balanceInToken >= _redeemAmount;
    }
    
    function getRewardToken(address) public override view returns(address) {
         return rewardToken;
    }
    
    function getUnclaimedRewardTokenAmount(address _optyPool,address) public override view returns(uint256){
        return ICompound(comptroller).compAccrued(_optyPool);
    }
    
    function getClaimRewardTokenCode(address _optyPool, address) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(comptroller,abi.encodeWithSignature("claimComp(address)",_optyPool));
    }
    
    function canStake(address) public override view returns(bool) {
        return false;
    }
    
    function getStakeCodes(address , uint ) public view override returns(bytes[] memory){
        revert("!empty");
    }

    function getUnstakeCodes(address , uint ) public view override returns(bytes[] memory){
        revert("!empty");
    }
    
    function balanceInTokenStake(address, address, address) public view override returns(uint256) {
        revert("!empty");
    }
    
    function getLiquidityPoolTokenBalanceStake(address , address) public view override returns(uint){
        revert("!empty");
    }
    
    function calculateRedeemableLPTokenAmountStake(address , address, address , uint ) public override view returns(uint) {
        revert("!empty");
    }
    
    function isRedeemableAmountSufficientStake(address , address, address , uint) public view override returns(bool) {
        revert("!empty");
    }
}
