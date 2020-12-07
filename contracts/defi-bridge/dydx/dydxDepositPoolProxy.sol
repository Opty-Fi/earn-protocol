// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/IDepositPoolProxy.sol";
import "../../Registry.sol";
import "../../interfaces/dydx/IdYdX.sol";
import "../../libraries/SafeERC20.sol";
import "../../libraries/Addresses.sol";
import "../../utils/Modifiers.sol";

contract dYdXDepositPoolProxy is IDepositPoolProxy,Modifiers {
    
    using SafeERC20 for IERC20;
    using SafeMath for uint;
    using Address for address;
    
    address public liquidityPool;
    mapping(address => uint8) public marketToIndexes;
    
    constructor() public{
        liquidityPool = address(0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e);
        marketToIndexes[address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2)] = 0;
        marketToIndexes[address(0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359)] = 1;
        marketToIndexes[address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48)] = 2;
        marketToIndexes[address(0x6B175474E89094C44Da98b954EedeAC495271d0F)] = 3;
    }

    function deposit(address _optyPool, address _underlyingToken, address _liquidityPool, address, uint[] memory _amounts) public override returns(bool) {
        uint _underlyingTokenIndex = marketToIndexes[_underlyingToken];
        AccountInfo[] memory _accountInfo = new AccountInfo[](2);
        _accountInfo[0] = AccountInfo(address(this), uint(0));
        _accountInfo[1] = AccountInfo(_optyPool, uint(0));
        AssetAmount memory _amt = AssetAmount(true, AssetDenomination.Wei, AssetReference.Delta, _amounts[_underlyingTokenIndex]);
        ActionArgs memory _act;
        _act.actionType = ActionType.Deposit;
        _act.accountId = uint(1);
        _act.amount = _amt;
        _act.primaryMarketId = _underlyingTokenIndex;
        _act.otherAddress = address(this);
        _act.otherAccountId = uint(0);
        ActionArgs[] memory _actionArgs = new ActionArgs[](1);
        _actionArgs[0] = _act;
        IERC20(_underlyingToken).safeTransferFrom(msg.sender,address(this),_amounts[_underlyingTokenIndex]);
        IERC20(_underlyingToken).safeApprove(_liquidityPool, uint(0));
        IERC20(_underlyingToken).safeApprove(_liquidityPool, _amounts[_underlyingTokenIndex]);
        IdYdX(_liquidityPool).operate(_accountInfo,_actionArgs);
        return true;
    }
    
    function withdraw(address _optyPool, address[] memory _underlyingTokens, address _liquidityPool, address, uint) public override returns(bool) {
        uint _underlyingTokenIndex = marketToIndexes[_underlyingTokens[0]];
        AccountInfo[] memory _accountInfo = new AccountInfo[](2);
        _accountInfo[0] = AccountInfo(address(this), uint(0));
        _accountInfo[1] = AccountInfo(_optyPool, uint(0));
        AssetAmount memory _amt = AssetAmount(false, AssetDenomination.Wei, AssetReference.Delta, balanceInToken(_optyPool,_underlyingTokens[0],liquidityPool,address(0),address(0)));
        ActionArgs memory _act;
        _act.actionType = ActionType.Withdraw;
        _act.accountId = uint(1);
        _act.amount = _amt;
        _act.primaryMarketId = _underlyingTokenIndex;
        _act.otherAddress = address(this);
        ActionArgs[] memory _actionArgs = new ActionArgs[](1);
        _actionArgs[0] = _act;
        IdYdX(_liquidityPool).operate(_accountInfo,_actionArgs);
        IERC20(_underlyingTokens[0]).safeTransfer(msg.sender, IERC20(_underlyingTokens[0]).balanceOf(address(this)));
        return true;
    }

    function getAccountWei(AccountInfo memory _accountInfo, uint _marketId) public view returns(bool, uint) {
        (bool sign, uint value) = IdYdX(liquidityPool).getAccountWei(_accountInfo, _marketId);
        return (sign, value);
    }
    
    function balanceInToken(address _optyPool, address _underlyingToken, address _liquidityPool, address, address) public override view returns(uint) {
        uint _underlyingTokenIndex = marketToIndexes[_underlyingToken];
        AccountInfo memory _accountInfo = AccountInfo(_optyPool, uint(0));
        (, uint value) = IdYdX(_liquidityPool).getAccountWei(_accountInfo, _underlyingTokenIndex);
        return value;
    }

    
    function addMarket(address _underlyingToken, uint8 _marketIndex) public onlyGovernance {
        marketToIndexes[_underlyingToken] = _marketIndex;
    }
    
    function getLiquidityPoolToken(address _liquidityPool) public override view returns(address) {
            return _liquidityPool;
    }
    
    function getUnderlyingTokens(address, address) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](4);
        _underlyingTokens[0] = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
        _underlyingTokens[1] = address(0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359);
        _underlyingTokens[2] = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
        _underlyingTokens[3] = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);
    }

    function setLiquidityPool(address _liquidityPool) public onlyGovernance {
        liquidityPool = _liquidityPool;
    }
}

// "0xD7ca98589473aB6651f50A8EC65986d7fb14089a","0x6B175474E89094C44Da98b954EedeAC495271d0F","0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e","0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e",["0","0","0","15000000000000000000"]