// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IOptyDepositPoolProxy.sol";
import "../../OptyRegistry.sol";
import "../../interfaces/dforce/IDForceDeposit.sol";
import "../../interfaces/dforce/IDForceStake.sol";
import "../../libraries/SafeERC20.sol";
import "../../libraries/Addresses.sol";
import "../../utils/Modifiers.sol";

contract OptyDForceDepositPoolProxy is IOptyDepositPoolProxy,Modifiers {
    
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

    function deposit(address[] memory _underlyingTokens, address _liquidityPool, uint[] memory _amounts) public override returns(bool) {
        IERC20(_underlyingTokens[0]).safeTransferFrom(msg.sender,address(this),_amounts[0]);
        IERC20(_underlyingTokens[0]).safeApprove(_liquidityPool, uint(0));
        IERC20(_underlyingTokens[0]).safeApprove(_liquidityPool, uint(_amounts[0]));
        IDForceDeposit(_liquidityPool).mint(msg.sender, _amounts[0]);
        return true;
    }
    
    function withdraw(address[] memory _underlyingTokens, address _liquidityPool, uint _redeemAmount) public override returns(bool) {
        address _liquidityPoolToken = OptyRegistryContract.getLiquidityPoolToLPToken(_liquidityPool, _underlyingTokens);
        IERC20(_liquidityPoolToken).safeTransferFrom(msg.sender,address(this),_redeemAmount);
        IDForceDeposit(_liquidityPoolToken).redeem(address(this), _redeemAmount);
        IERC20(_underlyingTokens[0]).safeTransfer(msg.sender, IERC20(_underlyingTokens[0]).balanceOf(address(this)));
        return true;
    }

    function balanceInToken(address[] memory _underlyingTokens, address, address _liquidityPool, address _holder) public override view returns(uint) {
        address _liquidityPoolToken = OptyRegistryContract.getLiquidityPoolToLPToken(_liquidityPool,_underlyingTokens);
        uint b = IERC20(_liquidityPoolToken).balanceOf(_holder);
        if (b > 0) {
            b = b.mul(IDForceDeposit(_liquidityPool).getExchangeRate()).div(1e18);
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
}
