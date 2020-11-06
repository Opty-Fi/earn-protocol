// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IOptyLiquidityPoolProxy.sol";
import "../../interfaces/compound/ICompound.sol";
import "../../libraries/SafeERC20.sol";
import "../../libraries/Addresses.sol";

contract OptyCompoundPoolProxy is IOptyLiquidityPoolProxy {
    
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using Address for address;
    
    address owner;
    address compoundLens;
    address comptroller;
    address comp;
    
    constructor () public {
        owner = msg.sender;
        setCompoundLens(address(0xd513d22422a3062Bd342Ae374b4b9c20E0a9a074));
        setComptroller(address(0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B));
        setComp((0xc00e94Cb662C3520282E6f5717214004A7f26888));
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

    
    function getCompBalanceMetadata() public view returns(ICompound.CompBalanceMetadata memory) {
        ICompound.CompBalanceMetadata memory output = ICompound(compoundLens).getCompBalanceMetadata(comp, msg.sender);
        return output;
    }
    
    function claimCompGetCompBalance() public returns(uint _compTokens) {
        ICompound.CompBalanceMetadataExt memory output = ICompound(compoundLens).getCompBalanceMetadataExt(comp, comptroller, msg.sender);
        return output.balance;
    }
    
    function borrow(address _underlyingToken,address _lendingPoolAddressProvider, address _borrowToken) public override returns(bool success) {
        revert("not implemented");
    }
    
    function repay(address _lendingPoolAddressProvider, address _borrowToken,address _lendingPoolToken) public override returns(bool success) {
        revert("not implemented");    }
    
    /**
     * @dev Modifier to check caller is governance or not
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "!owner");
        _;
    }
}

