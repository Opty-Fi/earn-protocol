// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;

import "../../interfaces/opty/IOptyLiquidityPoolProxy.sol";
import "../../interfaces/compound/ICompound.sol";
import "../../interfaces/ERC20/IERC20.sol";
import "../../libraries/SafeMath.sol";
import "../../libraries/Addresses.sol";
import "../../libraries/SafeERC20.sol";

contract OptyCompoundPoolProxy is IOptyLiquidityPoolProxy {
    
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    function deploy(address _underlyingToken,address _lendingPool,address _lendingPoolToken, uint _amount) public override returns(bool){
        IERC20(_underlyingToken).safeApprove(_lendingPool, uint(0));
        IERC20(_underlyingToken).safeApprove(_lendingPool, uint(_amount));
        uint result = ICompound(_lendingPool).mint(_amount);
        require(result == 0);
        IERC20(_lendingPoolToken).safeTransfer(msg.sender, balance(_lendingPoolToken,address(this)));
        return true;
    }
    
    function recall(address _underlyingToken, address _lendingPoolToken, uint _amount) public override returns(bool) {
        uint result = ICompound(_lendingPoolToken).redeem(_amount);
        require(result == 0);
        IERC20(_underlyingToken).safeTransfer(msg.sender, balance(_underlyingToken,address(this)));
        return true;
    }

    function balanceInToken(address _lendingPoolToken, address _holder) public override view returns(uint256){
        // Mantisa 1e18 to decimals
        uint256 b = balance(_lendingPoolToken,_holder);
        if (b > 0) {
            b = b.mul(ICompound(_lendingPoolToken).exchangeRateStored()).div(1e18);
         }
         return b;
    }
    
    function balance(address _token,address _holder) public override view returns (uint256) {
         return IERC20(_token).balanceOf(_holder);
    } 
}

// DAI
// Mainnet
// address _compoundDAILendingPool = address(0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643);
// address _DAItoken = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);

// Rinkeby
// address _compoundDAILendingPool = address(0x6D7F0754FFeb405d23C51CE938289d4835bE3b14);
// address _DAItoken = address(0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa);
