// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;

import "../../interfaces/opty/IDepositPoolProxy.sol";
import "../../interfaces/fulcrum/IFulcrum.sol";
import "../../libraries/SafeERC20.sol";

contract FulcrumDepositPoolProxy is IDepositPoolProxy {
    
    using SafeERC20 for IERC20;
    using SafeMath for uint;

    function deposit(address, address _underlyingToken, address _liquidityPool, address _liquidityPoolToken, uint[] memory _amounts) public override returns(bool) {
        IERC20(_underlyingToken).safeTransferFrom(msg.sender,address(this),_amounts[0]);
        IERC20(_underlyingToken).safeApprove(_liquidityPool, uint(0));
        IERC20(_underlyingToken).safeApprove(_liquidityPool, uint(_amounts[0]));
        IFulcrum(_liquidityPoolToken).mint(msg.sender, _amounts[0]);
        return true;
    }
    
    function withdraw(address, address[] memory, address, address _liquidityPoolToken, uint _burnAmount) public override returns(bool) {
        IERC20(_liquidityPoolToken).safeTransferFrom(msg.sender,address(this),_burnAmount);
        IFulcrum(_liquidityPoolToken).burn(msg.sender, _burnAmount);
        return true;
    }

    function balanceInToken(address, address ,address _liquidityPool, address, address _holder) public override view returns(uint) {
        address _liquidityPoolToken = getLiquidityPoolToken(_liquidityPool);
        uint b = IERC20(_liquidityPoolToken).balanceOf(_holder);
        if (b > 0) {
            b = b.mul(IFulcrum(_liquidityPool).tokenPrice()).div(1e18);
        }
        return b;
    }
    
    function getUnderlyingTokens(address _liquidityPool, address) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = IFulcrum(_liquidityPool).loanTokenAddress();
    }

    function getLiquidityPoolToken(address _liquidityPool) public override view returns(address) {
        return _liquidityPool;
    }
}
