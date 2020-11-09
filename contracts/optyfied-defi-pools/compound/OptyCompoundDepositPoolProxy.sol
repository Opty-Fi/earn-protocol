// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IOptyDepositPoolProxy.sol";
import "../../OptyRegistry.sol";
import "../../interfaces/compound/ICompound.sol";
import "../../libraries/SafeERC20.sol";
import "../../libraries/Addresses.sol";
import "../../utils/Modifiers.sol";

contract OptyCompoundDepositPoolProxy is IOptyDepositPoolProxy,Modifiers {
    
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using Address for address;

    address public compoundLens;
    address public comptroller;
    address public comp;

    OptyRegistry OptyRegistryContract;

    
    constructor(address _optyRegistry) public {
        setOptyRegistry(_optyRegistry);
        setCompoundLens(address(0xd513d22422a3062Bd342Ae374b4b9c20E0a9a074));
        setComptroller(address(0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B));
        setComp((0xc00e94Cb662C3520282E6f5717214004A7f26888));
    }
    
    function setOptyRegistry(address _optyRegistry) public onlyGovernance {
        require(_optyRegistry.isContract(),"!_optyRegistry");
        OptyRegistryContract = OptyRegistry(_optyRegistry);
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

    function deposit(address[] memory _underlyingTokens, address _lendingPool, uint[] memory _amounts) public override returns(bool) {
        address _lendingPoolToken = OptyRegistryContract.getLiquidityPoolToLPToken(_lendingPool,_underlyingTokens);
        IERC20(_underlyingTokens[0]).safeTransferFrom(msg.sender,address(this),_amounts[0]);
        IERC20(_underlyingTokens[0]).safeApprove(_lendingPool, uint(0));
        IERC20(_underlyingTokens[0]).safeApprove(_lendingPool, uint(_amounts[0]));
        uint result = ICompound(_lendingPoolToken).mint(_amounts[0]);
        require(result == 0);
        IERC20(_lendingPoolToken).safeTransfer(msg.sender, IERC20(_lendingPoolToken).balanceOf(address(this)));
        return true;
    }
    
    function withdraw(address[] memory _underlyingTokens, address _lendingPool, uint _amount) public override returns(bool) {
        address _lendingPoolToken = OptyRegistryContract.getLiquidityPoolToLPToken(_lendingPool, _underlyingTokens);
        IERC20(_lendingPoolToken).safeTransferFrom(msg.sender,address(this),_amount);
        uint result = ICompound(_lendingPoolToken).redeem(_amount);
        require(result == 0);
        IERC20(_underlyingTokens[0]).safeTransfer(msg.sender, IERC20(_underlyingTokens[0]).balanceOf(address(this)));
        return true;
    }

    function balanceInToken(address[] memory _underlyingTokens, address, address _lendingPoolAddressProvider, address _holder) public override view returns(uint256) {
        address _lendingPoolToken = OptyRegistryContract.getLiquidityPoolToLPToken(_lendingPoolAddressProvider,_underlyingTokens);
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
}
