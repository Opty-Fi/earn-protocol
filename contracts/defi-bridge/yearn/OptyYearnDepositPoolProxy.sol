// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IDepositPoolProxy.sol";
import "../../interfaces/yearn/IYearn.sol";
import "../../libraries/SafeERC20.sol";

contract YearnDepositPoolProxy is IDepositPoolProxy {
    
    using SafeERC20 for IERC20;
    using SafeMath for uint;

    function deposit(address _liquidityPool, address _liquidityPoolToken, uint[] memory _amounts) public override returns(bool) {
        address _underlyingToken = _getUnderlyingToken(_liquidityPoolToken);
        IERC20(_underlyingToken).safeTransferFrom(msg.sender,address(this),_amounts[0]);
        IERC20(_underlyingToken).safeApprove(_liquidityPool, uint(0));
        IERC20(_underlyingToken).safeApprove(_liquidityPool, uint(_amounts[0]));
        IYearn(_liquidityPool).deposit(_amounts[0]);
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender, IERC20(_liquidityPoolToken).balanceOf(address(this)));
        return true;
    }
    
    function withdraw(address[] memory _underlyingTokens, address _liquidityPool, address _liquidityPoolToken, uint _shares) public override returns(bool) {
        IERC20(_liquidityPoolToken).safeTransferFrom(msg.sender,address(this),_shares);
        IYearn(_liquidityPool).withdraw(_shares);
        IERC20(_underlyingTokens[0]).safeTransfer(msg.sender, IERC20(_underlyingTokens[0]).balanceOf(address(this)));
        return true;
    }

    function balanceInToken(address , address _liquidityPool, address _holder) public override view returns(uint) {
        uint b = IERC20(_liquidityPool).balanceOf(_holder);
        if (b > 0) {
            b = b.mul(IYearn(_liquidityPool).getPricePerFullShare()).div(1e18);
        }
        return b;
    }
    
    function getUnderlyingTokens(address _liquidityPool, address) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = IYearn(_liquidityPool).token();
    }
    
    function _getUnderlyingToken(address _liquidityPoolToken) internal view returns(address) {
        return IYearn(_liquidityPoolToken).token();
    }
    
    function getLiquidityPoolToken(address _liquidityPool) public override view returns(address) {
        return _liquidityPool;
    }
}
