// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IDepositDataProvider.sol";
import "../../interfaces/compound/ICompound.sol";
import "../../libraries/SafeERC20.sol";
import "../../utils/Modifiers.sol";
import "./../../utils/ERC20Detailed.sol";


contract CompoundDepositDataProvider is IDepositDataProvider,Modifiers {
    
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
    
    function getDepositCodes(address , address[] memory,address _liquidityPool, address , uint[] memory _amounts) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_liquidityPool,abi.encodeWithSignature("mint(uint256)",uint256(_amounts[0])));
    }
    
    function getWithdrawCodes(address ,address[] memory , address , address _liquidityPoolToken, uint _amount) public override view returns(bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_liquidityPoolToken,abi.encodeWithSignature("redeem(uint256)",uint256(_amount)));
    }
    
    function getUnderlyingTokens(address _liquidityPool, address) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = ICompound(_liquidityPool).underlying();
    }
    
    function _getUnderlyingTokens(address _liquidityPoolToken) internal view returns(address) {
        return ICompound(_liquidityPoolToken).underlying();
    }
    
    function getLiquidityPoolToken(address , address _liquidityPool) public override view returns(address) {
        return _liquidityPool;
    }

    function calculateAmountInToken(address ,address, address _liquidityPoolToken, uint _liquidityPoolTokenAmount) public override view returns(uint256) {
        if (_liquidityPoolTokenAmount > 0) {
            _liquidityPoolTokenAmount = _liquidityPoolTokenAmount.mul(ICompound(_liquidityPoolToken).exchangeRateStored()).div(1e18);
         }
         return _liquidityPoolTokenAmount;
    }
    
    function calculateAmountInLPToken(address, address, address _liquidityPoolToken,uint _depositAmount) public override view returns(uint256) {
        return _depositAmount.mul(1e18).div(ICompound(_liquidityPoolToken).exchangeRateStored());
    }
    
    function balanceInToken(address _optyPool,address,address, address _liquidityPoolToken) public override view returns(uint256) {
        // Mantisa 1e18 to decimals
        uint256 b = IERC20(_liquidityPoolToken).balanceOf(_optyPool);
        if (b > 0) {
            b = b.mul(ICompound(_liquidityPoolToken).exchangeRateStored()).div(1e18);
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

contract Test {
    CompoundDepositDataProvider CompoundDepositDataProviderContract;
    using SafeERC20 for IERC20;
    address public constant cDAI = address(0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643);
    address public constant DAI = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);
    
    constructor(CompoundDepositDataProvider _comp) public {
        setComp(_comp);
        setApprove();
    }
    
    function setComp(CompoundDepositDataProvider _comp) public {
        CompoundDepositDataProviderContract = _comp;
    }
    
    function setApprove() public{
        IERC20(DAI).safeApprove(cDAI,uint(0));
        IERC20(DAI).safeApprove(cDAI,uint(-1));
    }
    
    function deposit(uint _amount) public returns(bool){
        uint[] memory _amounts = new uint[](1);
        _amounts[0] = _amount;
        address[] memory _us = new address[](1);
        bytes[] memory _codes = IDepositDataProvider(CompoundDepositDataProviderContract).getDepositCodes(address(this),_us,cDAI,DAI,_amounts);
        (address pool, bytes memory data) = abi.decode(_codes[0],(address,bytes));
        (bool success,) = pool.call(data);
        require(success);
    }
    
    function withdraw(uint _amount) public {
        address[] memory _us = new address[](1);
        bytes[] memory _codes = IDepositDataProvider(CompoundDepositDataProviderContract).getWithdrawCodes(address(this),_us,cDAI,cDAI,_amount);
        (address pool, bytes memory data) = abi.decode(_codes[0],(address,bytes));
        (bool success,) = pool.call(data);
        require(success);
    }
    
    function getBalance(address token) public view returns(uint) {
        return IERC20(token).balanceOf(address(this));
    }
}
