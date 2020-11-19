// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IOptyDepositPoolProxy.sol";
import "../../interfaces/aave/IAave.sol";
import "../../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../../interfaces/aave/IAToken.sol";
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

    ILendingPoolAddressesProvider LendingPoolAddressesProvider;

    constructor() public {
        setLendingPoolAddressProvider(address(0x24a42fD28C976A61Df5D00D0599C34c4f90748c8));
    }
    
    function setLendingPoolAddressProvider(address _lendingPoolAddressProvider) public onlyGovernance {
        LendingPoolAddressesProvider = ILendingPoolAddressesProvider(_lendingPoolAddressProvider);
    }
    
    function deposit(address _liquidityPoolAddressProvider, address _liquidityPoolToken, uint[] memory _amounts) public override returns(bool){
        address _lendingPoolCore = _getLendingPoolCore(_liquidityPoolAddressProvider);
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProvider);
        address _underlyingToken = _getUnderlyingTokens(_liquidityPoolToken);
        IERC20(_underlyingToken).safeTransferFrom(msg.sender,address(this),_amounts[0]);
        IERC20(_underlyingToken).safeApprove(_lendingPoolCore, uint(0));
        IERC20(_underlyingToken).safeApprove(_lendingPoolCore, uint(_amounts[0]));
        IAave(_lendingPool).deposit(_underlyingToken,_amounts[0],0);
        require(_isTransferAllowed(_liquidityPoolToken,_amounts[0],address(this)),"!transferAllowed");
        IAToken(_liquidityPoolToken).safeTransfer(msg.sender, IERC20(_liquidityPoolToken).balanceOf(address(this)));
        return true;
    }
    
    function withdraw(address[] memory _underlyingTokens,address, address _liquidityPoolToken, uint _amount) public override returns(bool) {
        IERC20(_liquidityPoolToken).safeTransferFrom(msg.sender,address(this),_amount);
        require(_isTransferAllowed(_liquidityPoolToken,_amount,address(this)),"!transferAllowed");
        IAToken(_liquidityPoolToken).redeem(_amount);
        IERC20(_underlyingTokens[0]).transfer(msg.sender, IERC20(_underlyingTokens[0]).balanceOf(address(this)));
        return true;
    }
    
    function getLendingPoolToken(address _lendingPoolToken) public override view returns(address) {
        return _lendingPoolToken;
    }
    
    function getUnderlyingTokens(address ,address _lendingPoolToken) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = IAToken(_lendingPoolToken).underlyingAssetAddress();
    }
    
    function _getUnderlyingTokens(address _lendingPoolToken) internal view returns(address) {
        return IAToken(_lendingPoolToken).underlyingAssetAddress();
    }
    
    function _isTransferAllowed(address _lendingPoolToken, uint _amount, address _sender) internal view returns(bool transferAllowed) {
        transferAllowed = IAToken(_lendingPoolToken).isTransferAllowed(_sender, _amount);
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

    function balanceInToken(address , address _lpToken, address _holder) public override view returns(uint256) {
        return IERC20(_lpToken).balanceOf(_holder);
    }
}
