// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;

import "../../interfaces/opty/IOptyLiquidityPoolProxy.sol";
import "../../interfaces/aave/IAave.sol";
import "../../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../../interfaces/aave/IAToken.sol";
import "../../interfaces/ERC20/IERC20.sol";
import "../../libraries/SafeMath.sol";
import "../../libraries/Addresses.sol";
import "../../libraries/SafeERC20.sol";

contract OptyAavePoolProxy is IOptyLiquidityPoolProxy {
    
    using SafeERC20 for IERC20;

    function deploy(address _underlyingToken,address _lendingPoolAddressProvider,address _lendingPoolToken, uint _amount) public override returns(bool){
        address lendingPoolCore = getAaveCore(_lendingPoolAddressProvider);
        address lendingPool = getAave(_lendingPoolAddressProvider);
        IERC20(_underlyingToken).safeApprove(lendingPoolCore, uint(0));
        IERC20(_underlyingToken).safeApprove(lendingPoolCore, uint(_amount));
        IAave(lendingPool).deposit(_underlyingToken,_amount,0);
        IERC20(_lendingPoolToken).safeTransfer(msg.sender, balance(_lendingPoolToken,address(this)));
        return true;
    }
    
    function recall(address _underlyingToken, address _lendingPoolToken, uint _amount) public override returns(bool) {
        IAToken(_lendingPoolToken).redeem(_amount);
        IERC20(_underlyingToken).safeTransfer(msg.sender, balance(_underlyingToken,address(this)));
        return true;
    }

    function getAaveCore(address _lendingPoolAddressProvider) public view returns (address) {
        return ILendingPoolAddressesProvider(_lendingPoolAddressProvider).getLendingPoolCore();
    }
    
    function getAave(address _lendingPoolAddressProvider) public view returns (address) {
        return ILendingPoolAddressesProvider(_lendingPoolAddressProvider).getLendingPool();
    }

    function balanceInToken(address _lendingPoolToken, address _holder) public override view returns(uint256){
         return balance(_lendingPoolToken,_holder);
    }
    
    function balance(address _token,address _holder) public override view returns (uint256) {
         return IERC20(_token).balanceOf(_holder);
    } 
}

// DAI
// Mainnet
// address _aaveDAILendingPool = address(0x398eC7346DcD622eDc5ae82352F02bE94C62d119);
// address _DAItoken = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);
// aaveDAIToken = address(0xfC1E690f61EFd961294b3e1Ce3313fBD8aa4f85d);
// -------------------------------
// address _lendingPoolcore = address(0x3dfd23A6c5E8BbcFc9581d2E864a68feb6a076d3)

// kovan
// DAI = address(0xff795577d9ac8bd7d90ee22b6c1703490b6512fd)
// aave(lendingpools address provider) = address(0x506B0B2CF20FAA8f38a4E2B524EE43e1f4458Cc5)
// (aaveToken) lendingPoolToken = address(0x58AD4cB396411B691A9AAb6F74545b2C5217FE6a)
// -------------------
// lendingPool = address(0x580D4Fdc4BF8f9b5ae2fb9225D584fED4AD5375c)
// lendingPoolCore = address(0x95d1189ed88b380e319df73ff00e479fcc4cfa45)