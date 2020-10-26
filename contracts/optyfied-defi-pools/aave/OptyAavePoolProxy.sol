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

// USDC token = 0xb7a4F3E9097C08dA09517b5aB877F7a917224ede
// aUSDC lending pool token = address(0x02F626c6ccb6D2ebC071c068DC1f02Bf5693416a);

// USDT token = 0x07de306FF27a2B630B1141956844eB1552B956B5
// aUSDT lending pool token = address(0xA01bA9fB493b851F4Ac5093A324CB081A909C34B)

// wBTC token = address(0xd3A691C852CDB01E281545A27064741F0B7f6825)
// aWBTC lendingPool token = address(0xCD5C52C7B30468D16771193C47eAFF43EFc47f5C)

// SUSD token = address(0xD868790F57B39C9B2B51b12de046975f986675f9);
// aSUSD lendingPool token = address(0xb9c1434aB6d5811D1D0E92E8266A37Ae8328e901)

// TUSD token =  address(0x016750AC630F711882812f24Dba6c95b9D35856d)
// aTUSD lendingPool token = address(0x4c76f1b48316489E8a3304Db21cdAeC271cF6eC3)

// lendingPoolCore = address(0x95d1189ed88b380e319df73ff00e479fcc4cf




