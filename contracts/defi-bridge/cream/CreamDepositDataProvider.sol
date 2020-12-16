// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IDepositDataProvider.sol";
import "../../Registry.sol";
import "../../interfaces/cream/ICream.sol";
import "../../libraries/SafeERC20.sol";
import "../../libraries/Addresses.sol";
import "../../utils/Modifiers.sol";

contract CreamDepositDataProvider is IDepositDataProvider,Modifiers {
    
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using Address for address;

    address public creamLens;
    address public comptroller;
    address public cream;
    
    constructor() public {
        setCreamLens(address(0x69F2b8D8846e3dcd94C09e4f3CBB8d2ba8D9423f));
        setComptroller(address(0x3d5BC3c8d13dcB8bF317092d84783c2697AE9258));
        setCream((0x2ba592F78dB6436527729929AAf6c908497cB200));
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
    
    function getDepositCodes(address, address[] memory , address _liquidityPool, address , uint[] memory _amounts) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_liquidityPool,abi.encodeWithSignature("mint(uint256)",_amounts[0]));
    }
    
    function getWithdrawCodes(address, address[] memory, address , address _liquidityPoolToken, uint _amount) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_liquidityPoolToken,abi.encodeWithSignature("redeem(uint256)",_amount));
    }

    function balanceInToken(address _optyPool, address, address, address _liquidityPoolToken) public override view returns(uint256) {
        // Mantisa 1e18 to decimals
        uint256 b = IERC20(_liquidityPoolToken).balanceOf(_optyPool);
        if (b > 0) {
            b = b.mul(ICream(_liquidityPoolToken).exchangeRateStored()).div(1e18);
         }
         return b;
    }
    
    function calculateAmountInToken(address ,address, address _liquidityPoolToken, uint _liquidityPoolTokenAmount) public override view returns(uint256) {
        if (_liquidityPoolTokenAmount > 0) {
            _liquidityPoolTokenAmount = _liquidityPoolTokenAmount.mul(ICream(_liquidityPoolToken).exchangeRateStored()).div(1e18);
         }
         return _liquidityPoolTokenAmount;
    }
    
    function calculateAmountInLPToken(address, address, address _liquidityPoolToken,uint _depositAmount) public override view returns(uint256) {
        return _depositAmount.mul(1e18).div(ICream(_liquidityPoolToken).exchangeRateStored());
    }
            
    function getCompBalanceMetadata() public view returns(ICream.CompBalanceMetadata memory) {
        ICream.CompBalanceMetadata memory output = ICream(creamLens).getCompBalanceMetadata(cream, msg.sender);
        return output;
    }
    
    function claimCompGetCompBalance() public returns(uint _compTokens) {
        ICream.CompBalanceMetadataExt memory output = ICream(creamLens).getCompBalanceMetadataExt(cream, comptroller, msg.sender);
        return output.balance;
    }
    
    function getUnderlyingTokens(address _liquidityPool, address) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = ICream(_liquidityPool).underlying();
    }
    
    function getLiquidityPoolToken(address , address _liquidityPool) public override view returns(address) {
        return _liquidityPool;
    }
}

// tokenHash = 0x987a96a91381a62e90a58f1c68177b52aa669f3bd7798e321819de5f870d4ddd
// strategy_steps = [["0x0000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000","0x0000000000000000000000000000000000000000","0x44fbeBd2F576670a6C33f6Fc0B00aA8c5753b322","0xf5779E1AC1B54e38F13B8FEC998C81F9FA0F150F"]]