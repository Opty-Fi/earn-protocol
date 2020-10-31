// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;

import "../../interfaces/opty/IOptyLiquidityPoolProxy.sol";
import "../../interfaces/opty/IOptyRegistry.sol";
import "../../interfaces/compound/ICompound.sol";
import "../../libraries/SafeERC20.sol";
import "../../interfaces/opty/IOptyLiquidityPoolProxy.sol";
import "../../libraries/Addresses.sol";

contract OptyCompoundPoolProxy is IOptyLiquidityPoolProxy {
    
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using Address for address;
    address public governance;
    address public optyRegistry;
    
    constructor(address _optyRegistry) public {
        governance = msg.sender;
        setOptyRegistry(_optyRegistry);
    }
    
    /**
     * @dev Transfers governance to a new account (`_governance`).
     * Can only be called by the current governance.
     */    
    function transferGovernance(address _governance) public onlyGovernance {
        governance = _governance;
    }
    
    function setOptyRegistry(address _optyRegistry) public onlyGovernance {
        require(_optyRegistry.isContract(),"!_optyRegistry");
        optyRegistry = _optyRegistry;
    }

    function deploy(address[] memory _underlyingTokens, address _lendingPool, uint[] memory _amounts) public override returns(bool) {
        address _lendingPoolToken = IOptyRegistry(optyRegistry).getLiquidityPoolToLPToken(_lendingPool,_underlyingTokens);
        IERC20(_underlyingTokens[0]).safeTransferFrom(msg.sender,address(this),_amounts[0]);
        IERC20(_underlyingTokens[0]).safeApprove(_lendingPool, uint(0));
        IERC20(_underlyingTokens[0]).safeApprove(_lendingPool, uint(_amounts[0]));
        uint result = ICompound(_lendingPool).mint(_amounts[0]);
        require(result == 0);
        IERC20(_lendingPoolToken).safeTransfer(msg.sender, IERC20(_lendingPoolToken).balanceOf(address(this)));
        return true;
    }
    
    function recall(address[] memory _underlyingTokens, address _lendingPool, uint _amount) public override returns(bool) {
        address _lendingPoolToken = IOptyRegistry(optyRegistry).getLiquidityPoolToLPToken(_lendingPool, _underlyingTokens);
        IERC20(_lendingPoolToken).safeTransferFrom(msg.sender,address(this),_amount);
        uint result = ICompound(_lendingPoolToken).redeem(_amount);
        require(result == 0);
        IERC20(_underlyingTokens[0]).safeTransfer(msg.sender, IERC20(_lendingPoolToken).balanceOf(address(this)));
        return true;
    }

    function balanceInToken(address[] memory _underlyingTokens, address _underlyingToken, address _lendingPoolAddressProvider, address _holder) public override view returns(uint256){
        address _lendingPoolToken = IOptyRegistry(optyRegistry).getLiquidityPoolToLPToken(_lendingPoolAddressProvider,_underlyingTokens);
        // Mantisa 1e18 to decimals
        uint256 b = IERC20(_lendingPoolToken).balanceOf(_holder);
        if (b > 0) {
            b = b.mul(ICompound(_lendingPoolToken).exchangeRateStored()).div(1e18);
         }
         return b;
    }
    
    function borrow(address[] memory _underlyingToken,address _lendingPoolAddressProvider, address _borrowToken,uint _amount) public override returns(bool success) {
        revert("not implemented");
    }
    
    function repay(address _lendingPoolAddressProvider, address _borrowToken,address _lendingPoolToken) public override returns(bool success) {
        revert("not implemented");    
    }
    
    /**
     * @dev Modifier to check caller is governance or not
     */
    modifier onlyGovernance() {
        require(msg.sender == governance, "!governance");
        _;
    }
}
