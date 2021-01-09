// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../interfaces/compound/ICompound.sol";
import "../../libraries/SafeMath.sol";
import "../../interfaces/ERC20/IERC20.sol";
import "../../utils/Modifiers.sol";
import "../../Gatherer.sol";

contract CompoundCodeProvider is ICodeProvider,Modifiers {
    
    using SafeMath for uint256;

    Gatherer public gathererContract;
    
    address public comptroller;
    address public rewardToken;
    
    address public constant WETH = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    
    constructor(address _registry, address _gatherer) public Modifiers(_registry) {
        setRewardToken(address(0xc00e94Cb662C3520282E6f5717214004A7f26888));
        setComptoller(address(0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B));
        setGatherer(_gatherer);
    }
    
    function getDepositSomeCodes(address , address[] memory _underlyingTokens, address _liquidityPool , uint[] memory _amounts) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](3);
        _codes[0] = abi.encode(_underlyingTokens[0],abi.encodeWithSignature("approve(address,uint256)",_liquidityPool,uint(0)));
        _codes[1] = abi.encode(_underlyingTokens[0],abi.encodeWithSignature("approve(address,uint256)",_liquidityPool,_amounts[0]));
        _codes[2] = abi.encode(_liquidityPool,abi.encodeWithSignature("mint(uint256)",uint256(_amounts[0])));
    }
    
    function getDepositAllCodes(address _optyPool, address[] memory _underlyingTokens, address _liquidityPool) public view override returns(bytes[] memory _codes) {
        uint[] memory _amounts = new uint[](1);
        _amounts[0] = IERC20(_underlyingTokens[0]).balanceOf(_optyPool);
        return getDepositSomeCodes(_optyPool,_underlyingTokens,_liquidityPool,_amounts);
    }
    
    function getWithdrawSomeCodes(address ,address[] memory _underlyingTokens, address _liquidityPool , uint _amount) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(getLiquidityPoolToken(_underlyingTokens[0],_liquidityPool),abi.encodeWithSignature("redeem(uint256)",uint256(_amount)));
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
        _underlyingTokens[0] = ICompound(_liquidityPool).underlying();
    }
    
    function getAllAmountInToken(address _optyPool,address _underlyingToken,address _liquidityPool) public override view returns(uint256) {
        // Mantisa 1e18 to decimals
        uint256 b = getSomeAmountInToken(_underlyingToken,_liquidityPool,getLiquidityPoolTokenBalance(_optyPool,_underlyingToken,_liquidityPool));
        uint _unclaimedReward = getUnclaimedRewardTokenAmount(_optyPool,_liquidityPool);
        if (b > 0) {
            if (_unclaimedReward > 0) {
                b = b.add(gathererContract.rewardBalanceInUnderlyingTokens(rewardToken, _underlyingToken, _unclaimedReward));
            }
        }
        return b;
    }
    
    function getLiquidityPoolTokenBalance(address _optyPool, address _underlyingToken, address _liquidityPool) public view override returns(uint){
        return IERC20(getLiquidityPoolToken(_underlyingToken,_liquidityPool)).balanceOf(_optyPool);
    }
    
    function getSomeAmountInToken(address _underlyingToken,address _liquidityPool, uint _liquidityPoolTokenAmount) public override view returns(uint256) {
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
        uint256 _balanceInToken = getAllAmountInToken(_optyPool,_underlyingToken,_liquidityPool);
        // can have unintentional rounding errors
        _amount = (_liquidityPoolTokenBalance.mul(_redeemAmount)).div(_balanceInToken).add(1);
    }
    
    function isRedeemableAmountSufficient(address _optyPool, address _underlyingToken,address _liquidityPool , uint _redeemAmount) public view override returns(bool) {
        uint256 _balanceInToken = getAllAmountInToken(_optyPool,_underlyingToken,_liquidityPool);
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
    
    function getHarvestSomeCodes(address _optyPool, address _underlyingToken, address _liquidityPool, uint _rewardTokenAmount) public view override returns(bytes[] memory _codes) {
        return gathererContract.getHarvestCodes(_optyPool, getRewardToken(_liquidityPool), _underlyingToken, _rewardTokenAmount);
    }
    
    function getHarvestAllCodes(address _optyPool, address _underlyingToken, address _liquidityPool) public view override returns(bytes[] memory _codes) {
        uint _rewardTokenAmount = IERC20(getRewardToken(_liquidityPool)).balanceOf(_optyPool);
        return getHarvestSomeCodes(_optyPool, _underlyingToken,_liquidityPool,_rewardTokenAmount);
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
    
    function getAllAmountInTokenStake(address, address, address) public view override returns(uint256) {
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
    
    function setRewardToken(address _rewardToken) public onlyOperator {
        rewardToken = _rewardToken;
    }
    
    function setComptoller(address _comptroller) public onlyOperator {
        comptroller = _comptroller;
    }
    
    function setGatherer(address _gatherer) public onlyOperator {
        gathererContract = Gatherer(_gatherer);
    }
}
