// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IOptyLiquidityPoolProxy.sol";
import "../../interfaces/opty/IOptyRegistry.sol";
import "../../interfaces/compound/ICompound.sol";
import "../../libraries/SafeERC20.sol";
import "../../libraries/Addresses.sol";

contract OptyCompoundPoolProxy is IOptyLiquidityPoolProxy {
    
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using Address for address;
    address public governance;
    address public optyRegistry;
    address public owner;
    address public compoundLens;
    address public comptroller;
    address public comp;
    
    constructor(address _optyRegistry) public {
        governance = msg.sender;
        owner = msg.sender;
        setOptyRegistry(_optyRegistry);
        setCompoundLens(address(0xd513d22422a3062Bd342Ae374b4b9c20E0a9a074));
        setComptroller(address(0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B));
        setComp((0xc00e94Cb662C3520282E6f5717214004A7f26888));
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

    function setCompoundLens(address _compoundLens) public onlyOwner {
        compoundLens = _compoundLens;
    }
    
    function setComptroller(address _comptroller) public onlyOwner {
        comptroller = _comptroller;
    }
    
    function setComp(address _comp) public onlyOwner {
        comp = _comp;
    }

    function deploy(address[] memory _underlyingTokens, address _lendingPool, uint[] memory _amounts) public override returns(bool) {
        address _lendingPoolToken = IOptyRegistry(optyRegistry).getLiquidityPoolToLPToken(_lendingPool,_underlyingTokens);
        IERC20(_underlyingTokens[0]).safeTransferFrom(msg.sender,address(this),_amounts[0]);
        IERC20(_underlyingTokens[0]).safeApprove(_lendingPool, uint(0));
        IERC20(_underlyingTokens[0]).safeApprove(_lendingPool, uint(_amounts[0]));
        uint result = ICompound(_lendingPoolToken).mint(_amounts[0]);
        require(result == 0);
        IERC20(_lendingPoolToken).safeTransfer(msg.sender, IERC20(_lendingPoolToken).balanceOf(address(this)));
    }
    
    function recall(address[] memory _underlyingTokens, address _lendingPool, uint _amount) public override returns(bool) {
        address _lendingPoolToken = IOptyRegistry(optyRegistry).getLiquidityPoolToLPToken(_lendingPool, _underlyingTokens);
        IERC20(_lendingPoolToken).safeTransferFrom(msg.sender,address(this),_amount);
        uint result = ICompound(_lendingPoolToken).redeem(_amount);
        require(result == 0);
        IERC20(_underlyingTokens[0]).safeTransfer(msg.sender, IERC20(_lendingPoolToken).balanceOf(address(this)));
        return true;
    }

    function balanceInToken(address[] memory _underlyingTokens, address, address _lendingPoolAddressProvider, address _holder) public override view returns(uint256) {
        address _lendingPoolToken = IOptyRegistry(optyRegistry).getLiquidityPoolToLPToken(_lendingPoolAddressProvider,_underlyingTokens);
        // Mantisa 1e18 to decimals
        uint256 b = IERC20(_lendingPoolToken).balanceOf(_holder);
        if (b > 0) {
            b = b.mul(ICompound(_lendingPoolToken).exchangeRateStored()).div(1e18);
         }
         return b;
    }
            
    function getCompBalanceMetadata() public view returns(ICompound.CompBalanceMetadata memory) {
        ICompound.CompBalanceMetadata memory output = ICompound(compoundLens).getCompBalanceMetadata(comp, msg.sender);
        return output;
    }
    
    function claimCompGetCompBalance() public returns(uint _compTokens) {
        ICompound.CompBalanceMetadataExt memory output = ICompound(compoundLens).getCompBalanceMetadataExt(comp, comptroller, msg.sender);
        return output.balance;
    }
    
    function borrow(address[] memory ,address , address, uint) public override returns(bool) {
        revert("not implemented");
    }
    
    function repay(address , address ,address, uint) public override returns(bool ) {
        revert("not implemented");    
    }
    
    /**
     * @dev Modifier to check caller is governance or not
     */
    modifier onlyGovernance() {
        require(msg.sender == governance, "!governance");
        _;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "!owner");
        _;
    }
}

