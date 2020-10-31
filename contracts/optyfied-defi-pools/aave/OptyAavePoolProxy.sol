// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IOptyLiquidityPoolProxy.sol";
import "../../interfaces/aave/IAave.sol";
import "../../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../../interfaces/aave/IAToken.sol";
import "../../interfaces/opty/IOptyRegistry.sol";
import "../../interfaces/aave/IPriceOracle.sol";
import "../../libraries/SafeERC20.sol";
import "../../utils/ERC20Detailed.sol";
import "../../libraries/Addresses.sol";

contract OptyAavePoolProxy is IOptyLiquidityPoolProxy {
    
    using SafeERC20 for IERC20;
    using SafeERC20 for IAToken;
    using SafeMath for uint;
    using Address for address;
    address public optyRegistry;
    address public governance;
    
    constructor(address _optyRegistry) public {
        governance = msg.sender;
        setOptyRegistry(_optyRegistry);
    }
    
    /**
     * @dev Transfers governance to a new account (`_governance`).
     * Can only be called by the current governance.
     */    
    function transferGovernance(address _governance) public onlyGovernance {
        require(_governance != address(0),"!address(0)");
        governance = _governance;
    }
    
    function setOptyRegistry(address _optyRegistry) public onlyGovernance{
        optyRegistry = _optyRegistry;
    }
    
    function deploy(address[] memory _underlyingTokens, address _lendingPoolAddressProvider, uint[] memory _amounts) public override returns(bool){
        address _lendingPoolToken = IOptyRegistry(optyRegistry).getLiquidityPoolToLPToken(_lendingPoolAddressProvider,_underlyingTokens);
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
    
    function recall(address[] memory _underlyingTokens, address _lendingPoolAddressProvider, uint _amount) public override returns(bool) {
        address _lendingPoolToken = IOptyRegistry(optyRegistry).getLiquidityPoolToLPToken(_lendingPoolAddressProvider,_underlyingTokens);
        IERC20(_lendingPoolToken).safeTransferFrom(msg.sender,address(this),_amount);
        require(_isTransferAllowed(_lendingPoolToken,_amount,address(this)),"!transferAllowed");
        IAToken(_lendingPoolToken).redeem(_amount);
        IERC20(_underlyingTokens[0]).transfer(msg.sender, IERC20(_lendingPoolToken).balanceOf(address(this)));
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

    function balanceInToken(address[] memory _underlyingTokens,address _underlyingToken, address _lendingPoolAddressProvider, address _holder) public override view returns(uint256){
        address _lendingPoolToken = IOptyRegistry(optyRegistry).getLiquidityPoolToLPToken(_lendingPoolAddressProvider,_underlyingTokens);
        return IERC20(_lendingPoolToken).balanceOf(_holder);
    }
    
    function borrow(address[] memory _underlyingTokens,address _lendingPoolAddressProvider, address _borrowToken, uint _amount) public override returns(bool success) {
        address _lendingPool = _getLendingPool(_lendingPoolAddressProvider);
        address _priceOracle = _getPriceOracle(_lendingPoolAddressProvider);
        address _liquidityPoolToken = IOptyRegistry(optyRegistry).getLiquidityPoolToLPToken(_lendingPoolAddressProvider,_underlyingTokens);
        IERC20(_liquidityPoolToken).safeTransferFrom(msg.sender,address(this),_amount);
        IAave(_lendingPool).setUserUseReserveAsCollateral(_underlyingTokens[0],true);
        IAave.UserReserveData memory _userReserveData = IAave(_lendingPool).getUserReserveData(_underlyingTokens[0], address(this));
        require(_userReserveData.enabled,"!_userReserveData.enabled");
        IAave.UserAccountData memory _userAccountData = IAave(_lendingPool).getUserAccountData(address(this));
        uint _borrowTokenPriceInWei = IPriceOracle(_priceOracle).getAssetPrice(_borrowToken);
        uint _borrowTokenDecimals = 10 ** uint((ERC20Detailed(_borrowToken).decimals()));
        uint _borrowAmount = (_borrowTokenDecimals.mul(_userAccountData.availableBorrowsETH)).div(_borrowTokenPriceInWei);
        IAave(_lendingPool).borrow(_borrowToken, _borrowAmount, 2,  0);
        IERC20(_borrowToken).transfer(msg.sender,_borrowAmount);
        success = true;
    }
    
    function repay(address _lendingPoolAddressProvider, address _borrowToken,address _lendingPoolToken) public override returns(bool success) {
        address _lendingPoolCore = _getLendingPoolCore(_lendingPoolAddressProvider);
        address _lendingPool = _getLendingPool(_lendingPoolAddressProvider);
        uint256 _amount = IERC20(_borrowToken).balanceOf(address(this));
        IERC20(_borrowToken).safeApprove(_lendingPoolCore, 0);
        IERC20(_borrowToken).safeApprove(_lendingPoolCore, _amount);
        IAave(_lendingPool).repay(_borrowToken,_amount,address(uint160(address(this))));
        _amount = IERC20(_lendingPoolToken).balanceOf(address(this));
        IERC20(_lendingPoolToken).transfer(msg.sender,_amount);
        success = true;
    }
    
    /**
     * @dev Modifier to check caller is governance or not
     */
    modifier onlyGovernance() {
        require(msg.sender == governance, "!governance");
        _;
    }
}
