// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../Registry.sol";
import "../../interfaces/dforce/IDForceDeposit.sol";
import "../../interfaces/dforce/IDForceStake.sol";
import "../../libraries/SafeERC20.sol";
import "../../libraries/Addresses.sol";
import "../../utils/Modifiers.sol";

contract DForceCodeProvider is ICodeProvider,Modifiers {
    
    using SafeERC20 for IERC20;
    using SafeMath for uint;
    using Address for address;
    
    mapping(address => address) public liquidityPoolToStakingPool;
    
    address public constant rewardToken = address(0x431ad2ff6a9C365805eBaD47Ee021148d6f7DBe0);
    
    // deposit pools
    address public constant usdtDepositPool = address(0x868277d475E0e475E38EC5CdA2d9C83B5E1D9fc8);
    address public constant usdcDepositPool =  address(0x16c9cF62d8daC4a38FB50Ae5fa5d51E9170F3179);
    address public constant daiDepositPool = address(0x02285AcaafEB533e03A7306C55EC031297df9224);
    
    // staking pools
    address public constant usdtStakingPool = address(0x324EebDAa45829c6A8eE903aFBc7B61AF48538df);
    address public constant usdcStakingPool = address(0xB71dEFDd6240c45746EC58314a01dd6D833fD3b5);
    address public constant daiStakingPool = address(0xD2fA07cD6Cd4A5A96aa86BacfA6E50bB3aaDBA8B);
    
    constructor() public {
        setLiquidityPoolToStakingPool(usdtDepositPool, usdtStakingPool);
        setLiquidityPoolToStakingPool(usdcDepositPool, usdcStakingPool);
        setLiquidityPoolToStakingPool(daiDepositPool, daiStakingPool);
    }
    
    function getDepositCodes(address _optyPool, address[] memory, address _liquidityPool, address , uint[] memory _amounts) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_liquidityPool,abi.encodeWithSignature("mint(address,uint256)",_optyPool,_amounts[0]));
    }
    
    function getWithdrawCodes(address _optyPool, address[] memory , address , address _liquidityPoolToken, uint _redeemAmount) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_liquidityPoolToken,abi.encodeWithSignature("redeem(address,uint256)",_optyPool, _redeemAmount));
    }
    
    function getLiquidityPoolToken(address ,address _liquidityPool) public override view returns(address){
        return _liquidityPool;
    }
    
    function getUnderlyingTokens(address _liquidityPool, address) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = IDForceDeposit(_liquidityPool).token();
    }
    
    function balanceInToken(address _optyPool, address, address, address _liquidityPoolToken) public override view returns(uint) {
        uint b = IERC20(_liquidityPoolToken).balanceOf(_optyPool);
        if (b > 0) {
            b = b.mul(IDForceDeposit(_liquidityPoolToken).getExchangeRate()).div(1e18);
        }
        return b;
    }
    
    function getLiquidityPoolTokenBalance(address _optyPool, address , address , address _liquidityPoolToken) public view override returns(uint){
        return IERC20(_liquidityPoolToken).balanceOf(_optyPool);
    }
    
    function calculateAmountInToken(address ,address, address _liquidityPoolToken, uint _liquidityPoolTokenAmount) public override view returns(uint256) {
        if (_liquidityPoolTokenAmount > 0) {
            _liquidityPoolTokenAmount = _liquidityPoolTokenAmount.mul(IDForceDeposit(_liquidityPoolToken).getExchangeRate()).div(1e18);
         }
         return _liquidityPoolTokenAmount;
    }
    
    function calculateAmountInLPToken(address, address, address _liquidityPoolToken,uint _depositAmount) public override view returns(uint256) {
        return _depositAmount.mul(1e18).div(IDForceDeposit(_liquidityPoolToken).getExchangeRate());
    }
    
    function calculateRedeemableLPTokenAmount(address _optyPool, address , address , address _liquidityPoolToken, uint _redeemAmount) public view override returns(uint _amount) {
        uint256 _liquidityPoolTokenBalance = IERC20(_liquidityPoolToken).balanceOf(_optyPool);
        uint256 _balanceInToken = balanceInToken(_optyPool,address(0),address(0),_liquidityPoolToken);
        // can have unintentional rounding errors
        _amount = (_liquidityPoolTokenBalance.mul(_redeemAmount)).div(_balanceInToken).add(1);
    }
     
    function isRedeemableAmountSufficient(address _optyPool, address ,address , address _liquidityPoolToken, uint _redeemAmount) public view override returns(bool) {
        uint256 _balanceInToken = balanceInToken(_optyPool,address(0),address(0),_liquidityPoolToken);
        return _balanceInToken >= _redeemAmount;   
    }
    
    function getRewardToken(address , address , address , address ) public override view returns(address) {
        return rewardToken;
    }
    
    function getUnclaimedRewardTokenAmount(address _optyPool, address , address _liquidityPool, address) public view override returns(uint256) {
        return IDForceStake(liquidityPoolToStakingPool[_liquidityPool]).earned(_optyPool);
    }
    
    function getClaimRewardTokenCode(address , address , address _liquidityPool, address ) public view override returns(bytes[] memory _codes) {
        address _stakingPool = liquidityPoolToStakingPool[_liquidityPool];
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_stakingPool,abi.encodeWithSignature("getReward()"));
    }

    function canStake(address , address , address , address , uint ) public override view returns(bool) {
        return true;
    }
    
    function getStakeCodes(address , address _liquidityPool, address , uint _shares) public view override returns(bytes[] memory _codes){
        address _stakingPool = liquidityPoolToStakingPool[_liquidityPool];
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_stakingPool,abi.encodeWithSignature("stake(uint256)",_shares));
    }

    function getUnstakeCodes(address , address _liquidityPool, address , uint _shares) public view override returns(bytes[] memory _codes) {
        address _stakingPool = liquidityPoolToStakingPool[_liquidityPool];
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_stakingPool,abi.encodeWithSignature("withdraw(uint256)",_shares));
    }
    
    function balanceInTokenStake(address _optyPool, address ,address _liquidityPool, address _liquidityPoolToken) public view override returns(uint256) {
        address _stakingPool = liquidityPoolToStakingPool[_liquidityPool];
        uint b = IERC20(_stakingPool).balanceOf(_optyPool);
        if (b > 0) {
            b = b.mul(IDForceDeposit(_liquidityPoolToken).getExchangeRate()).div(1e18);
        }
        return b;
    }
    
    function getLiquidityPoolTokenBalanceStake(address _optyPool, address , address _liquidityPool, address ) public view override returns(uint){
        address _stakingPool = liquidityPoolToStakingPool[_liquidityPool];
        return IERC20(_stakingPool).balanceOf(_optyPool);
    }
    
    function calculateRedeemableLPTokenAmountStake(address _optyPool, address, address _liquidityPool, address _liquidityPoolToken, uint _redeemAmount) public view override returns(uint _amount) {
        address _stakingPool = liquidityPoolToStakingPool[_liquidityPool];
        uint256 _liquidityPoolTokenBalance = IERC20(_stakingPool).balanceOf(_optyPool);
        uint256 _balanceInToken = balanceInToken(_optyPool,address(0),address(0),_liquidityPoolToken);
        // can have unintentional rounding errors
        _amount = (_liquidityPoolTokenBalance.mul(_redeemAmount)).div(_balanceInToken).add(1);
    }
     
    function isRedeemableAmountSufficientStake(address _optyPool, address ,address _liquidityPool, address _liquidityPoolToken, uint _redeemAmount) public view override returns(bool) {
        uint256 _balanceInTokenStake = balanceInTokenStake(_optyPool, address(0),_liquidityPool,  _liquidityPoolToken);
        return _balanceInTokenStake >= _redeemAmount;
    }
    
    function setLiquidityPoolToStakingPool(address _liquidityPool, address _stakingPool) public onlyGovernance {
        require(liquidityPoolToStakingPool[_liquidityPool] != _stakingPool, "liquidityPoolToStakingPool already set");
        liquidityPoolToStakingPool[_liquidityPool] = _stakingPool;
    }
}
