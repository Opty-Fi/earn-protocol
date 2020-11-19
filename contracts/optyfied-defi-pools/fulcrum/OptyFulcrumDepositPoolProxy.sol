// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IOptyDepositPoolProxy.sol";
import "../../OptyRegistry.sol";
import "../../interfaces/fulcrum/IFulcrum.sol";
import "../../libraries/SafeERC20.sol";
import "../../libraries/Addresses.sol";
import "../../utils/Modifiers.sol";

contract OptyFulcrumDepositPoolProxy is IOptyDepositPoolProxy,Modifiers {
    
    using SafeERC20 for IERC20;
    using SafeMath for uint;
    using Address for address;

    OptyRegistry OptyRegistryContract;
   
    constructor(address _optyRegistry) public {
        setOptyRegistry(_optyRegistry);
    }
    
    function setOptyRegistry(address _optyRegistry) public onlyGovernance {
        require(_optyRegistry.isContract(),"!_optyRegistry");
        OptyRegistryContract = OptyRegistry(_optyRegistry);
    }

    function deposit(address[] memory _underlyingTokens, address _lendingPool, uint[] memory _amounts) public override returns(bool) {
        address _lendingPoolToken = OptyRegistryContract.getLiquidityPoolToLPToken(_lendingPool,_underlyingTokens);
        IERC20(_underlyingTokens[0]).safeTransferFrom(msg.sender,address(this),_amounts[0]);
        IERC20(_underlyingTokens[0]).safeApprove(_lendingPool, uint(0));
        IERC20(_underlyingTokens[0]).safeApprove(_lendingPool, uint(_amounts[0]));
        IFulcrum(_lendingPool).mint(msg.sender, _amounts[0]);
        IERC20(_lendingPoolToken).safeTransfer(msg.sender, IERC20(_lendingPoolToken).balanceOf(address(this)));
        return true;
    }
    
    function withdraw(address[] memory _underlyingTokens, address _lendingPool, uint _burnAmount) public override returns(bool) {
        address _lendingPoolToken = OptyRegistryContract.getLiquidityPoolToLPToken(_lendingPool, _underlyingTokens);
        IERC20(_lendingPoolToken).safeTransferFrom(msg.sender,address(this),_burnAmount);
        IFulcrum(_lendingPoolToken).burn(msg.sender, _burnAmount);
        IERC20(_underlyingTokens[0]).safeTransfer(msg.sender, IERC20(_underlyingTokens[0]).balanceOf(address(this)));
        return true;
    }

    function balanceInToken(address[] memory _underlyingTokens, address, address _lendingPool, address _holder) public override view returns(uint) {
        address _lendingPoolToken = OptyRegistryContract.getLiquidityPoolToLPToken(_lendingPool,_underlyingTokens);
        uint b = IERC20(_lendingPoolToken).balanceOf(_holder);
        if (b > 0) {
            b = b.mul(IFulcrum(_lendingPool).tokenPrice()).div(1e18);
        }
        return b;
    }
}
