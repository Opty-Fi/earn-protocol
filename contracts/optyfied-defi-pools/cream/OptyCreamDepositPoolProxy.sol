// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IOptyDepositPoolProxy.sol";
import "../../OptyRegistry.sol";
import "../../interfaces/cream/ICream.sol";
import "../../libraries/SafeERC20.sol";
import "../../libraries/Addresses.sol";
import "../../utils/Modifiers.sol";

contract OptyCreamDepositPoolProxy is IOptyDepositPoolProxy,Modifiers {
    
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using Address for address;

    address public creamLens;
    address public comptroller;
    address public cream;

    OptyRegistry OptyRegistryContract;

    
    constructor(address _optyRegistry) public {
        setOptyRegistry(_optyRegistry);
        setCreamLens(address(0x69F2b8D8846e3dcd94C09e4f3CBB8d2ba8D9423f));
        setComptroller(address(0x3d5BC3c8d13dcB8bF317092d84783c2697AE9258));
        setCream((0x2ba592F78dB6436527729929AAf6c908497cB200));
    }
    
    function setOptyRegistry(address _optyRegistry) public onlyGovernance {
        require(_optyRegistry.isContract(),"!_optyRegistry");
        OptyRegistryContract = OptyRegistry(_optyRegistry);
    }

    function setCreamLens(address _creamLens) public onlyOwner {
        creamLens = _creamLens;
    }
    
    function setComptroller(address _comptroller) public onlyOwner {
        comptroller = _comptroller;
    }
    
    function setCream(address _cream) public onlyOwner {
        cream = _cream;
    }

    function deposit(address[] memory _underlyingTokens, address _lendingPool, uint[] memory _amounts) public override returns(bool) {
        address _lendingPoolToken = OptyRegistryContract.getLiquidityPoolToLPToken(_lendingPool,_underlyingTokens);
        IERC20(_underlyingTokens[0]).safeTransferFrom(msg.sender,address(this),_amounts[0]);
        IERC20(_underlyingTokens[0]).safeApprove(_lendingPool, uint(0));
        IERC20(_underlyingTokens[0]).safeApprove(_lendingPool, uint(_amounts[0]));
        uint result = ICream(_lendingPoolToken).mint(_amounts[0]);
        require(result == 0);
        IERC20(_lendingPoolToken).safeTransfer(msg.sender, IERC20(_lendingPoolToken).balanceOf(address(this)));
        return true;
    }
    
    function withdraw(address[] memory _underlyingTokens, address _lendingPool, uint _amount) public override returns(bool) {
        address _lendingPoolToken = OptyRegistryContract.getLiquidityPoolToLPToken(_lendingPool, _underlyingTokens);
        IERC20(_lendingPoolToken).safeTransferFrom(msg.sender,address(this),_amount);
        uint result = ICream(_lendingPoolToken).redeem(_amount);
        require(result == 0);
        IERC20(_underlyingTokens[0]).safeTransfer(msg.sender, IERC20(_underlyingTokens[0]).balanceOf(address(this)));
        return true;
    }

    function balanceInToken(address[] memory _underlyingTokens, address, address _lendingPoolAddressProvider, address _holder) public override view returns(uint256) {
        address _lendingPoolToken = OptyRegistryContract.getLiquidityPoolToLPToken(_lendingPoolAddressProvider,_underlyingTokens);
        // Mantisa 1e18 to decimals
        uint256 b = IERC20(_lendingPoolToken).balanceOf(_holder);
        if (b > 0) {
            b = b.mul(ICream(_lendingPoolToken).exchangeRateStored()).div(1e18);
         }
         return b;
    }
            
    function getCompBalanceMetadata() public view returns(ICream.CompBalanceMetadata memory) {
        ICream.CompBalanceMetadata memory output = ICream(creamLens).getCompBalanceMetadata(cream, msg.sender);
        return output;
    }
    
    function claimCompGetCompBalance() public returns(uint _compTokens) {
        ICream.CompBalanceMetadataExt memory output = ICream(creamLens).getCompBalanceMetadataExt(cream, comptroller, msg.sender);
        return output.balance;
    }
}

// tokenHash = 0x987a96a91381a62e90a58f1c68177b52aa669f3bd7798e321819de5f870d4ddd
// strategy_steps = [["0x0000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000","0x44fbeBd2F576670a6C33f6Fc0B00aA8c5753b322","0xf5779E1AC1B54e38F13B8FEC998C81F9FA0F150F"]]