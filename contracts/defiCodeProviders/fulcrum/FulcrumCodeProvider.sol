// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../interfaces/fulcrum/IFulcrum.sol";
import "../../libraries/SafeERC20.sol";

contract FulcrumCodeprovider is ICodeProvider {
    
    using SafeERC20 for IERC20;
    using SafeMath for uint;

    function getDepositCodes(address _optyPool, address[] memory , address _liquidityPool, address , uint[] memory _amounts) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_liquidityPool,abi.encodeWithSignature("mint(address,uint256)",_optyPool,_amounts[0]));
    }
    
    function getWithdrawCodes(address _optyPool, address[] memory, address, address _liquidityPoolToken, uint _burnAmount) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_liquidityPoolToken,abi.encodeWithSignature("burn(address,uint256)",_optyPool,_burnAmount));
    }

    function balanceInToken(address _optyPool, address _underlyingToken,address _liquidityPool, address) public override view returns(uint) {
        address _liquidityPoolToken = getLiquidityPoolToken(_underlyingToken,_liquidityPool);
        uint b = IERC20(_liquidityPoolToken).balanceOf(_optyPool);
        if (b > 0) {
            b = b.mul(IFulcrum(_liquidityPool).tokenPrice()).div(1e18);
        }
        return b;
    }
    
    function calculateAmountInToken(address ,address, address _liquidityPoolToken, uint _liquidityPoolTokenAmount) public override view returns(uint256) {
        if (_liquidityPoolTokenAmount > 0) {
            _liquidityPoolTokenAmount = _liquidityPoolTokenAmount.mul(IFulcrum(_liquidityPoolToken).tokenPrice()).div(1e18);
         }
         return _liquidityPoolTokenAmount;
    }
    
    function calculateAmountInLPToken(address, address, address _liquidityPoolToken,uint _depositAmount) public override view returns(uint256) {
        return _depositAmount.mul(1e18).div(IFulcrum(_liquidityPoolToken).tokenPrice());
    }
    
    function getUnderlyingTokens(address _liquidityPool, address) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = IFulcrum(_liquidityPool).loanTokenAddress();
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
}
