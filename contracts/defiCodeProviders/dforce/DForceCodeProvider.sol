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
    
    function getDepositCodes(address _optyPool, address[] memory, address _liquidityPool, address , uint[] memory _amounts) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_liquidityPool,abi.encodeWithSignature("mint(address,uint256)",_optyPool,_amounts[0]));
    }
    
    function getWithdrawCodes(address _optyPool, address[] memory , address , address _liquidityPoolToken, uint _redeemAmount) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_liquidityPoolToken,abi.encodeWithSignature("redeem(address,uint256)",_optyPool, _redeemAmount));
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

    function balanceInToken(address _optyPool, address, address, address _liquidityPoolToken) public override view returns(uint) {
        uint b = IERC20(_liquidityPoolToken).balanceOf(_optyPool);
        if (b > 0) {
            b = b.mul(IDForceDeposit(_liquidityPoolToken).getExchangeRate()).div(1e18);
        }
        return b;
    }
    
    function stakeLPtokens(address _liquidityPoolToken, address _stakingPool, uint _shares) public returns(bool){
        IERC20(_liquidityPoolToken).safeApprove(_stakingPool, uint(0));
        IERC20(_liquidityPoolToken).safeApprove(_stakingPool, uint(_shares));
        IERC20(_liquidityPoolToken).safeTransferFrom(msg.sender,address(this),_shares);
        IDForceStake(_stakingPool).stake(_shares);
        return true;
    }
    
    function unstakeLPtokens(address _liquidityPoolToken, address _stakingPool) public returns(bool){
        IDForceStake(_stakingPool).exit();
        address DFToken = 0x431ad2ff6a9C365805eBaD47Ee021148d6f7DBe0;
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender, IERC20(_liquidityPoolToken).balanceOf(address(this)));
        IERC20(DFToken).safeTransfer(msg.sender, IERC20(DFToken).balanceOf(address(this)));
        return true;
    }
    
    function getLiquidityPoolToken(address ,address _liquidityPool) public override view returns(address){
            return _liquidityPool;
    }
    
    function getUnderlyingTokens(address _liquidityPool, address) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = IDForceDeposit(_liquidityPool).token();
    }

    function canStake(address , address , address , address , uint ) public override view returns(bool) {
        return false;
    }
    
    function getRewardToken(address , address , address , address ) public override view returns(address) {
        return address(0);
    }
}
