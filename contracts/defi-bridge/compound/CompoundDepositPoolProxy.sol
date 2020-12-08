// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IDepositPoolProxy.sol";
import "../../interfaces/compound/ICompound.sol";
import "../../libraries/SafeERC20.sol";
import "../../utils/Modifiers.sol";

contract CompoundDepositPoolProxy is IDepositPoolProxy,Modifiers {
    
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    address public compoundLens;
    address public comptroller;
    address public comp;
    
    constructor() public {
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

    function deposit(address, address _underlyingToken, address _liquidityPool, address _liquidityPoolToken, uint[] memory _amounts) public override returns(bool) {
        IERC20(_underlyingToken).safeTransferFrom(msg.sender,address(this),_amounts[0]);
        IERC20(_underlyingToken).safeApprove(_liquidityPoolToken, uint(0));
        IERC20(_underlyingToken).safeApprove(_liquidityPoolToken, uint(_amounts[0]));
        uint result = ICompound(_liquidityPool).mint(_amounts[0]);
        require(result == 0);
        IERC20(_liquidityPoolToken).safeTransfer(msg.sender, IERC20(_liquidityPoolToken).balanceOf(address(this)));
        return true;
    }
    
    function withdraw(address, address[] memory _underlyingTokens,address _liquidityPool, address _liquidityPoolToken, uint _amount) public override returns(bool) {
        IERC20(_liquidityPoolToken).safeTransferFrom(msg.sender,address(this),_amount);
        uint result = ICompound(_liquidityPool).redeem(_amount);
        require(result == 0);
        IERC20(_underlyingTokens[0]).safeTransfer(msg.sender, IERC20(_underlyingTokens[0]).balanceOf(address(this)));
        return true;
    }
    
    function getUnderlyingTokens(address _liquidityPool, address) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = ICompound(_liquidityPool).underlying();
    }
    
    function getLiquidityPoolToken(address _lendingPool) public override view returns(address) {
        return _lendingPool;
    }

    function balanceInToken(address, address, address, address _lpToken, address _holder) public override view returns(uint256) {
        // Mantisa 1e18 to decimals
        uint256 b = IERC20(_lpToken).balanceOf(_holder);
        if (b > 0) {
            b = b.mul(ICompound(_lpToken).exchangeRateStored()).div(1e18);
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
}
