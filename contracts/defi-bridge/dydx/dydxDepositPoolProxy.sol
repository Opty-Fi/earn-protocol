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
    
    address liquidityPool;
    address[] markets;
    
    event Alert(string);
    
    constructor() public{
        liquidityPool = 0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e;
        markets.push(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
        markets.push(0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359);
        markets.push(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
        markets.push(0x6B175474E89094C44Da98b954EedeAC495271d0F);
    }

    function deposit(address _underlyingToken, address _liquidityPool, address, uint[] memory _amounts) public override returns(bool) {
        uint _underlyingTokenIndex = _getUnderlyingTokenIndex(_underlyingToken);
        AccountInfo[] memory _accountInfo = new AccountInfo[](1);
        _accountInfo[0] = AccountInfo(address(this), 0);
        AssetAmount memory _amt = AssetAmount(true, AssetDenomination.Wei, AssetReference.Delta, _amounts[0]);
        ActionArgs memory _act;
        _act.actionType = ActionType.Deposit;
        _act.accountId = 0;
        _act.amount = _amt;
        _act.primaryMarketId = _underlyingTokenIndex;
        _act.otherAddress = address(this);
        ActionArgs[] memory _actionArgs = new ActionArgs[](1);
        _actionArgs[0] = _act;
        IERC20(_underlyingToken).safeTransferFrom(msg.sender,address(this),_amounts[0]);
        IERC20(_underlyingToken).safeApprove(_liquidityPool, uint(0));
        IERC20(_underlyingToken).safeApprove(_liquidityPool, _amounts[0]);
        IdYdX(_liquidityPool).operate(_accountInfo,_actionArgs);
        return true;
    }
    
    function withdraw(address[] memory _underlyingTokens, address _liquidityPool, address, uint) public override returns(bool) {
        uint _underlyingTokenIndex = _getUnderlyingTokenIndex(_underlyingTokens[0]);
        AccountInfo[] memory _accountInfo = new AccountInfo[](1);
        _accountInfo[0] = AccountInfo(address(this), 0);
        AssetAmount memory _amt = AssetAmount(false, AssetDenomination.Wei, AssetReference.Delta, balanceInToken(_underlyingTokens[0],liquidityPool,address(0),address(this)));
        ActionArgs memory _act;
        _act.actionType = ActionType.Withdraw;
        _act.accountId = 0;
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
    
    function balanceInToken(address _underlyingToken, address _liquidityPool, address, address _holder) public override view returns(uint) {
        uint _underlyingTokenIndex = _getUnderlyingTokenIndex(_underlyingToken);
        AccountInfo memory _accountInfo = AccountInfo(_holder, 0);
        (, uint value) = IdYdX(_liquidityPool).getAccountWei(_accountInfo, _underlyingTokenIndex);
        return value;
    }

    function _getUnderlyingTokenIndex(address _underlyingToken) internal view returns(uint) {
        for(uint i; i < markets.length; i++){
            if (_underlyingToken == markets[i]){
                return i;
            }
        }
    }
    
    function addMarket(address _underlyingToken) public onlyGovernance {
        markets.push(_underlyingToken);
    }
    
    function getLiquidityPoolToken(address _liquidityPool) public override view returns(address) {
            return _liquidityPool;
    }
    
    function getUnderlyingTokens(address _liquidityPool, address) public override view returns(address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
    }

    function setLiquidityPool(address _liquidityPool) public onlyGovernance {
        liquidityPool = _liquidityPool;
    }
}
