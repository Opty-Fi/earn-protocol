// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../interfaces/compound/ICompound.sol";
import "../../libraries/SafeERC20.sol";
import "../../libraries/Addresses.sol";
import "../../utils/Modifiers.sol";

contract CompoundCodeProvider is ICodeProvider, Modifiers {
    
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using Address for address;

    address public comptroller;
    address public rewardToken;
    
    constructor(address _registry) public Modifiers(_registry) {
        setRewardToken(address(0xc00e94Cb662C3520282E6f5717214004A7f26888));
        setComptoller(address(0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B));
    }
    
    function setRewardToken(address _rewardToken) public onlyOperator {
        rewardToken = _rewardToken;
    }
    
    function setComptoller(address _comptroller) public onlyOperator {
        comptroller = _comptroller;
    }
    
    function getDepositSomeCodes(address , address[] memory,address _liquidityPool , uint[] memory _amounts) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_liquidityPool,abi.encodeWithSignature("mint(uint256)",uint256(_amounts[0])));
    }
    
    function getDepositAllCodes(address _optyPool, address[] memory _underlyingTokens, address _liquidityPool) public view override returns(bytes[] memory _codes) {
        uint _depositAmount = IERC20(_underlyingTokens[0]).balanceOf(_optyPool);
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_liquidityPool,abi.encodeWithSignature("mint(uint256)",_depositAmount));
    }
    
    function getWithdrawSomeCodes(address ,address[] memory _underlyingTokens, address _liquidityPool , uint _amount) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(getLiquidityPoolToken(_underlyingTokens[0],_liquidityPool),abi.encodeWithSignature("redeem(uint256)",uint256(_amount)));
    }
    
    function getWithdrawAllCodes(address _optyPool, address[] memory _underlyingTokens, address _liquidityPool) public view override returns(bytes[] memory _codes) {
        uint _redeemAmount = getLiquidityPoolTokenBalance(_optyPool,_underlyingTokens[0],_liquidityPool);
        _codes = new bytes[](1);
        _codes[0] = abi.encode(getLiquidityPoolToken(_underlyingTokens[0],_liquidityPool),abi.encodeWithSignature("redeem(uint256)",_redeemAmount));
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

    function balanceInTokenStaked(address , address ,address , address ) public override view returns(uint256) {
        revert("!empty");
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
    
    function getStakeSomeCodes(address , uint ) public view override returns(bytes[] memory) {
        revert("!empty");
    }
    
    function getStakeAllCodes(address , address[] memory , address ) public view override returns(bytes[] memory) {
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
    
    function isRedeemableAmountSufficientStake(address , address, address , uint) public view override returns(bool) {
        revert("!empty");
    }
    
    function getUnstakeAndWithdrawSomeCodes(address , address[] memory , address , uint ) public view override returns (bytes[] memory) {
        revert("!empty");
    }
    
    function getUnstakeAndWithdrawAllCodes(address , address[] memory , address) public view override returns (bytes[] memory) {
        revert("!empty");
    }
}
