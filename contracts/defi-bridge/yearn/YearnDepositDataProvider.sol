// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IDepositDataProvider.sol";
import "../../interfaces/yearn/IYearn.sol";
import "../../libraries/SafeERC20.sol";

contract YearnDepositDataProvider is IDepositDataProvider {
    
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
}
