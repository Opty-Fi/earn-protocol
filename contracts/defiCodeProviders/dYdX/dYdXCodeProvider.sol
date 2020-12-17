// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../Registry.sol";
import "../../interfaces/dydx/IdYdX.sol";
import "../../libraries/SafeERC20.sol";
import "../../libraries/Addresses.sol";
import "../../utils/Modifiers.sol";

contract dYdXDepositPoolProxy is ICodeProvider,Modifiers {
    
    using SafeERC20 for IERC20;
    using SafeMath for uint;
    using Address for address;
    
    address public dYdXLiquidityPool = address(0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e);
    
    address public WETH = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    address public SAI = address(0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359);
    address public USDC = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    address public DAI = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);
    
    mapping(address => uint8) public marketToIndexes;
    mapping(address => address[]) public liquidityPoolToUnderlyingTokens;
    
    constructor() public{
        address[] memory _dYdXUnderlyingTokens = new address[](4);
        _dYdXUnderlyingTokens[0] = WETH;
        _dYdXUnderlyingTokens[1] = SAI;
        _dYdXUnderlyingTokens[2] = USDC;
        _dYdXUnderlyingTokens[3] = DAI;
        setLiquidityPoolToUnderlyingTokens(dYdXLiquidityPool,_dYdXUnderlyingTokens);
        addMarket(WETH,uint8(0));
        addMarket(SAI,uint8(0));
        addMarket(USDC,uint8(0));
        addMarket(DAI,uint8(0));
    }
    
    function addMarket(address _underlyingToken, uint8 _marketIndex) public onlyGovernance {
        marketToIndexes[_underlyingToken] = _marketIndex;
    }
    
    function setLiquidityPoolToUnderlyingTokens(address _lendingPool, address[] memory _tokens) public onlyGovernance {
        liquidityPoolToUnderlyingTokens[_lendingPool] = _tokens;
    }
    
    function getDepositCodes(address _optyPool, address[] memory _underlyingTokens, address _liquidityPool, address , uint[] memory _amounts) public view override returns(bytes[] memory _codes) {
        uint _underlyingTokenIndex = marketToIndexes[_underlyingTokens[0]];
        AccountInfo[] memory _accountInfos = new AccountInfo[](1);
        _accountInfos[0] = AccountInfo(_optyPool, uint256(0));
        AssetAmount memory _amt = AssetAmount(true, AssetDenomination.Wei, AssetReference.Delta, _amounts[_underlyingTokenIndex]);
        ActionArgs memory _actionArg;
        _actionArg.actionType = ActionType.Deposit;
        _actionArg.accountId = 0;
        _actionArg.amount = _amt;
        _actionArg.primaryMarketId = _underlyingTokenIndex;
        _actionArg.otherAddress = _optyPool;
        ActionArgs[] memory _actionArgs = new ActionArgs[](1);
        _actionArgs[0] = _actionArg;
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_liquidityPool,abi.encodeWithSignature("operate((address,uint256)[],(uint8,uint256,tuple,uint256,uint256,address,uint256,bytes)[])",_accountInfos,_actionArgs));
    }
    
    function getWithdrawCodes(address _optyPool, address[] memory _underlyingTokens, address _liquidityPool, address, uint _amount) public view override returns(bytes[] memory _codes) {
        uint _underlyingTokenIndex = marketToIndexes[_underlyingTokens[0]];
        AccountInfo[] memory _accountInfos = new AccountInfo[](1);
        _accountInfos[0] = AccountInfo(_optyPool, uint(0));
        AssetAmount memory _amt = AssetAmount(false, AssetDenomination.Wei, AssetReference.Delta, _amount);
        ActionArgs memory _actionArg;
        _actionArg.actionType = ActionType.Withdraw;
        _actionArg.accountId = 0;
        _actionArg.amount = _amt;
        _actionArg.primaryMarketId = _underlyingTokenIndex;
        _actionArg.otherAddress = _optyPool;
        ActionArgs[] memory _actionArgs = new ActionArgs[](1);
        _actionArgs[0] = _actionArg;
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_liquidityPool,abi.encodeWithSignature("operate((address,uint256)[],(uint8,uint256,tuple,uint256,uint256,address,uint256,bytes)[])",_accountInfos,_actionArgs));
    }
    
    function balanceInToken(address _optyPool, address _underlyingToken,address _liquidityPool, address) public override view returns(uint) {
        uint _underlyingTokenIndex = marketToIndexes[_underlyingToken];
        AccountInfo memory _accountInfo = AccountInfo(_optyPool, uint(0));
        (, uint value) = IdYdX(_liquidityPool).getAccountWei(_accountInfo, _underlyingTokenIndex);
        return value;
    }
    
    function getLiquidityPoolToken(address , address) public override view returns(address) {
        return address(0);
    }
    
    function getUnderlyingTokens(address _liquidityPool, address) public view override returns(address[] memory _underlyingTokens) {
        _underlyingTokens = liquidityPoolToUnderlyingTokens[_liquidityPool];
    }
    
    function calculateAmountInToken(address , address , address , uint ) public override view returns(uint) {
        revert("!empty");   
    }
    
    function calculateAmountInLPToken(address, address, address ,uint ) public override view returns(uint256) {
        revert("!empty");
    }
    
    function canStake(address , address , address , address , uint ) public override view returns(bool) {
        return false;
    }
    
    function getRewardToken(address , address , address , address ) public override view returns(address) {
         return address(0);
    }
    
    function getUnclaimedRewardTokenAmount(address , address , address , address ) public override view returns(uint256){
        revert("!empty");
    }
    
    function getClaimRewardTokenCode(address , address , address , address ) public override view returns(bytes[] memory) {
        revert("!empty");
    }
}
