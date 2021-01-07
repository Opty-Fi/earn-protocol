// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../interfaces/cream/ICream.sol";
import "../../interfaces/ERC20/IERC20.sol";
import "../../libraries/SafeMath.sol";
import "../../utils/Modifiers.sol";

contract CreamCodeProvider is ICodeProvider,Modifiers {
    
    using SafeMath for uint256;

    address public comptroller;
    address public rewardToken;
    
    address public constant HBTC = address(0x0316EB71485b0Ab14103307bf65a021042c6d380);
    
    constructor(address _registry) public Modifiers(_registry) {
        setComptroller(address(0x3d5BC3c8d13dcB8bF317092d84783c2697AE9258));
        setRewardToken(address(0x2ba592F78dB6436527729929AAf6c908497cB200));
    }
    
    function setComptroller(address _comptroller) public onlyOperator {
        comptroller = _comptroller;
    }
    
    function setRewardToken(address _rewardToken) public onlyOperator {
        rewardToken = _rewardToken;
    }
    
    function getDepositSomeCodes(address, address[] memory _underlyingTokens, address _liquidityPool , uint[] memory _amounts) public override view returns(bytes[] memory _codes) {
        if (_underlyingTokens[0] == HBTC) {
            _codes = new bytes[](2);
            _codes[0] = abi.encode(_underlyingTokens[0],abi.encodeWithSignature("approve(address,uint256)",_liquidityPool,_amounts[0]));
            _codes[1] = abi.encode(_liquidityPool,abi.encodeWithSignature("mint(uint256)",_amounts[0]));
        } else {
            _codes = new bytes[](3);
            _codes[0] = abi.encode(_underlyingTokens[0],abi.encodeWithSignature("approve(address,uint256)",_liquidityPool,uint(0)));
            _codes[1] = abi.encode(_underlyingTokens[0],abi.encodeWithSignature("approve(address,uint256)",_liquidityPool,_amounts[0]));
            _codes[2] = abi.encode(_liquidityPool,abi.encodeWithSignature("mint(uint256)",_amounts[0]));
        }
    }
    
    function getDepositAllCodes(address _optyPool, address[] memory _underlyingTokens, address _liquidityPool) public view override returns(bytes[] memory _codes) {
        uint[] memory _amounts = new uint[](1);
        _amounts[0] = IERC20(_underlyingTokens[0]).balanceOf(_optyPool);
        return getDepositSomeCodes(_optyPool,_underlyingTokens,_liquidityPool,_amounts);
    }
    
    function getWithdrawSomeCodes(address, address[] memory _underlyingTokens, address _liquidityPool , uint _amount) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(getLiquidityPoolToken(_underlyingTokens[0],_liquidityPool),abi.encodeWithSignature("redeem(uint256)",_amount));
    }
    
    function getWithdrawAllCodes(address _optyPool, address[] memory _underlyingTokens, address _liquidityPool) public view override returns(bytes[] memory _codes) {
        uint _redeemAmount = getLiquidityPoolTokenBalance(_optyPool, _underlyingTokens[0], _liquidityPool);
        return getWithdrawSomeCodes(_optyPool,_underlyingTokens,_liquidityPool,_redeemAmount);
    }
    
    function getLiquidityPoolToken(address , address _liquidityPool) public override view returns(address) {
        return _liquidityPool;
    }
    
    function getUnderlyingTokens(address _liquidityPool, address) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = ICream(_liquidityPool).underlying();
    }

    function balanceInToken(address _optyPool, address _underlyingToken, address _liquidityPool) public override view returns(uint256) {
        // Mantisa 1e18 to decimals
        uint256 b = getLiquidityPoolTokenBalance(_optyPool,_underlyingToken,_liquidityPool);
        if (b > 0) {
            b = b.mul(ICream(_liquidityPool).exchangeRateStored()).div(1e18);
         }
         return b;
    }
    
    function getLiquidityPoolTokenBalance(address _optyPool, address _underlyingToken, address _liquidityPool) public view override returns(uint){
        return IERC20(getLiquidityPoolToken(_underlyingToken,_liquidityPool)).balanceOf(_optyPool);
    }
    
    function calculateAmountInToken(address _underlyingToken,address _liquidityPool, uint _liquidityPoolTokenAmount) public override view returns(uint256) {
        if (_liquidityPoolTokenAmount > 0) {
            _liquidityPoolTokenAmount = _liquidityPoolTokenAmount.mul(ICream(getLiquidityPoolToken(_underlyingToken,_liquidityPool)).exchangeRateStored()).div(1e18);
         }
         return _liquidityPoolTokenAmount;
    }
    
    function calculateAmountInLPToken(address _underlyingToken, address _liquidityPool,uint _depositAmount) public override view returns(uint256) {
        return _depositAmount.mul(1e18).div(ICream(getLiquidityPoolToken(_underlyingToken,_liquidityPool)).exchangeRateStored());
    }
    
    function calculateRedeemableLPTokenAmount(address _optyPool, address _underlyingToken, address _liquidityPool, uint _redeemAmount) public override view returns(uint _amount) {
        uint256 _liquidityPoolTokenBalance = getLiquidityPoolTokenBalance(_optyPool,_underlyingToken,_liquidityPool);
        uint256 _balanceInToken = balanceInToken(_optyPool,_underlyingToken,_liquidityPool);
        // can have unintentional rounding errors
        _amount = (_liquidityPoolTokenBalance.mul(_redeemAmount)).div(_balanceInToken).add(1);
    }
    
    function isRedeemableAmountSufficient(address _optyPool, address _underlyingToken,address _liquidityPool, uint _redeemAmount) public view override returns(bool) {
        uint256 _balanceInToken = balanceInToken(_optyPool,_underlyingToken,_liquidityPool);
        return _balanceInToken >= _redeemAmount;
    }
    
    function getRewardToken(address) public override view returns(address) {
         return rewardToken;
    }
    
    function getUnclaimedRewardTokenAmount(address _optyPool, address) public override view returns(uint256){
        return ICream(comptroller).compAccrued(_optyPool);
    }
    
    function getClaimRewardTokenCode(address _optyPool, address) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(comptroller,abi.encodeWithSignature("claimComp(address)",_optyPool));
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
    
    function balanceInTokenStake(address, address, address) public view override returns(uint256) {
        revert("!empty");
    }
    
    function getLiquidityPoolTokenBalanceStake(address , address) public view override returns(uint){
        revert("!empty");
    }
    
    function calculateRedeemableLPTokenAmountStake(address , address, address , uint ) public override view returns(uint) {
        revert("!empty");
    }
    
    function isRedeemableAmountSufficientStake(address , address, address, uint) public view override returns(bool) {
        revert("!empty");
    }
    
    function getUnstakeAndWithdrawSomeCodes(address , address[] memory , address , uint ) public view override returns (bytes[] memory){
        revert("!empty");    
    }
    
    function getUnstakeAndWithdrawAllCodes(address , address[] memory , address ) public view override returns (bytes[] memory) {
        revert("!empty");
    }
}
