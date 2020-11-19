// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IOptyDepositPoolProxy.sol";
import "../../interfaces/aave/IAave.sol";
import "../../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../../interfaces/aave/IAToken.sol";
import "../../OptyRegistry.sol";
import "../../interfaces/aave/IPriceOracle.sol";
import "../../libraries/SafeERC20.sol";
import "../../utils/ERC20Detailed.sol";
import "../../libraries/Addresses.sol";
import "../../utils/Modifiers.sol";

contract OptyAaveDepositPoolProxy is IOptyDepositPoolProxy,Modifiers {
    
    using SafeERC20 for IERC20;
    using SafeERC20 for IAToken;
    using SafeMath for uint;
    using Address for address;

    OptyRegistry OptyRegistryContract;

    uint256 public healthFactor = 1;

    constructor(address _optyRegistry) public {
        setOptyRegistry(_optyRegistry);
    }
    
    function setOptyRegistry(address _optyRegistry) public onlyGovernance{
        OptyRegistryContract = OptyRegistry(_optyRegistry);
    }
    
    function setHealthFactor(uint256 _hf) external onlyGovernance {
        healthFactor = _hf;
    }
    
    function deposit(
        address[] memory _underlyingTokens, 
        address _lendingPoolAddressProvider, 
        uint[] memory _amounts
        ) public override returns(bool){
        address _lendingPoolToken = OptyRegistryContract.getLiquidityPoolToLPToken(_lendingPoolAddressProvider,_underlyingTokens);
        IERC20(_underlyingTokens[0]).safeTransferFrom(msg.sender,address(this),_amounts[0]);
        address lendingPoolCore = _getLendingPoolCore(_lendingPoolAddressProvider);
        address lendingPool = _getLendingPool(_lendingPoolAddressProvider);
        IERC20(_underlyingTokens[0]).safeApprove(lendingPoolCore, uint(0));
        IERC20(_underlyingTokens[0]).safeApprove(lendingPoolCore, uint(_amounts[0]));
        IAave(lendingPool).deposit(_underlyingTokens[0],_amounts[0],0);
        require(_isTransferAllowed(_lendingPoolToken,_amounts[0],address(this)),"!transferAllowed");
        IAToken(_lendingPoolToken).safeTransfer(msg.sender, IERC20(_lendingPoolToken).balanceOf(address(this)));
        return true;
    }
    function withdraw(
        address[] memory _underlyingTokens, 
        address _lendingPoolAddressProvider, 
        uint _amount
        ) public override returns(bool) {
        address _lendingPoolToken = OptyRegistryContract.
        getLiquidityPoolToLPToken(_lendingPoolAddressProvider,_underlyingTokens);
        IERC20(_lendingPoolToken).safeTransferFrom(msg.sender,address(this),_amount);
        require(_isTransferAllowed(_lendingPoolToken,_amount,address(this)),"!transferAllowed");
        IAToken(_lendingPoolToken).redeem(_amount);
        IERC20(_underlyingTokens[0]).transfer(msg.sender, IERC20(_underlyingTokens[0]).balanceOf(address(this)));
        return true;
    }
    
    function _isTransferAllowed(address _lendingPoolToken, uint _amount, address _sender) internal returns(bool transferAllowed) {
        (transferAllowed) = IAToken(_lendingPoolToken).isTransferAllowed(_sender, _amount);
    }

    function _getLendingPoolCore(address _lendingPoolAddressProvider) internal view returns (address) {
        return ILendingPoolAddressesProvider(_lendingPoolAddressProvider).getLendingPoolCore();
    }
    
    function _getLendingPool(address _lendingPoolAddressProvider) internal view returns (address) {
        return ILendingPoolAddressesProvider(_lendingPoolAddressProvider).getLendingPool();
    }
    
    function _getPriceOracle(address _lendingPoolAddressProvider) internal view returns (address) {
        return ILendingPoolAddressesProvider(_lendingPoolAddressProvider).getPriceOracle();
    }

    function balanceInToken(
        address[] memory _underlyingTokens,
        address , 
        address _lendingPoolAddressProvider, 
        address _holder
        ) public override view returns(uint256){
        address _lendingPoolToken = OptyRegistryContract.getLiquidityPoolToLPToken(_lendingPoolAddressProvider,_underlyingTokens);
        return IERC20(_lendingPoolToken).balanceOf(_holder);
    }
}
