// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../interfaces/dydx/IdYdX.sol";
import "../../interfaces/ERC20/IERC20.sol";
import "../../utils/Modifiers.sol";
import "../../libraries/SafeMath.sol";

contract dYdXDepositPoolProxy is ICodeProvider, Modifiers {
    
    using SafeMath for uint256;
    
    uint256 public maxExposure; // basis points
    
    address public constant DYDX_LIQUIIDTY_POOL = address(0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e);

    address public constant WETH = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    address public constant SAI = address(0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359);
    address public constant USDC = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    address public constant DAI = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);

    mapping(address => uint256) public marketToIndexes;
    mapping(address => address[]) public liquidityPoolToUnderlyingTokens;

    constructor(address _registry) public Modifiers(_registry) {
        address[] memory _dYdXUnderlyingTokens = new address[](4);
        _dYdXUnderlyingTokens[0] = WETH;
        _dYdXUnderlyingTokens[1] = SAI;
        _dYdXUnderlyingTokens[2] = USDC;
        _dYdXUnderlyingTokens[3] = DAI;
        setLiquidityPoolToUnderlyingTokens(DYDX_LIQUIIDTY_POOL, _dYdXUnderlyingTokens);
        addMarket(WETH, 0);
        addMarket(SAI, 1);
        addMarket(USDC, 2);
        addMarket(DAI, 3);
        setMaxExposure(uint(5000)); // 50%
    }

    function getDepositSomeCodes(
        address _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256[] memory _amounts
    ) public view override returns (bytes[] memory _codes) {
        uint256 _underlyingTokenIndex;
        for (uint256 i = 0; i < _amounts.length; i++) {
            if (_amounts[i] > 0) {
                _underlyingTokenIndex = marketToIndexes[_underlyingTokens[i]];
            }
        }
        uint _depositAmount = _getDepositAmount(_liquidityPool,_underlyingTokenIndex,_amounts[_underlyingTokenIndex]);
        AccountInfo[] memory _accountInfos = new AccountInfo[](1);
        _accountInfos[0] = AccountInfo(_optyPool, uint256(0));
        AssetAmount memory _amt = AssetAmount(true, AssetDenomination.Wei, AssetReference.Delta, _depositAmount);
        ActionArgs memory _actionArg;
        _actionArg.actionType = ActionType.Deposit;
        _actionArg.accountId = 0;
        _actionArg.amount = _amt;
        _actionArg.primaryMarketId = _underlyingTokenIndex;
        _actionArg.otherAddress = _optyPool;
        ActionArgs[] memory _actionArgs = new ActionArgs[](1);
        _actionArgs[0] = _actionArg;
        _codes = new bytes[](3);
        _codes[0] = abi.encode(
            _underlyingTokens[_underlyingTokenIndex],
            abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, uint256(0))
        );
        _codes[1] = abi.encode(
            _underlyingTokens[_underlyingTokenIndex],
            abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _amounts[_underlyingTokenIndex])
        );
        _codes[2] = abi.encode(
            _liquidityPool,
            abi.encodeWithSignature(
                "operate((address,uint256)[],(uint8,uint256,(bool,uint8,uint8,uint256),uint256,uint256,address,uint256,bytes)[])",
                _accountInfos,
                _actionArgs
            )
        );
    }

    function getDepositAllCodes(
        address _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256[] memory _amounts = new uint256[](_underlyingTokens.length);
        for (uint256 i = 0; i < _underlyingTokens.length; i++) {
            _amounts[i] = IERC20(_underlyingTokens[i]).balanceOf(_optyPool);
        }
        return getDepositSomeCodes(_optyPool, _underlyingTokens, _liquidityPool, _amounts);
    }

    function getWithdrawSomeCodes(
        address _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256 _amount
    ) public view override returns (bytes[] memory _codes) {
        uint256 _underlyingTokenIndex = marketToIndexes[_underlyingTokens[0]];
        AccountInfo[] memory _accountInfos = new AccountInfo[](1);
        _accountInfos[0] = AccountInfo(_optyPool, uint256(0));
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
        _codes[0] = abi.encode(
            _liquidityPool,
            abi.encodeWithSignature(
                "operate((address,uint256)[],(uint8,uint256,(bool,uint8,uint8,uint256),uint256,uint256,address,uint256,bytes)[])",
                _accountInfos,
                _actionArgs
            )
        );
    }

    function getWithdrawAllCodes(
        address _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _redeemAmount = getAllAmountInToken(_optyPool, _underlyingTokens[0], _liquidityPool);
        return getWithdrawSomeCodes(_optyPool, _underlyingTokens, _liquidityPool, _redeemAmount);
    }

    function getLiquidityPoolToken(address, address) public view override returns (address) {
        return address(0);
    }

    function getUnderlyingTokens(address _liquidityPool, address) public view override returns (address[] memory _underlyingTokens) {
        _underlyingTokens = liquidityPoolToUnderlyingTokens[_liquidityPool];
    }

    function getAllAmountInToken(
        address _optyPool,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (uint256) {
        uint256 _underlyingTokenIndex = marketToIndexes[_underlyingToken];
        AccountInfo memory _accountInfo = AccountInfo(_optyPool, uint256(0));
        (, uint256 value) = IdYdX(_liquidityPool).getAccountWei(_accountInfo, _underlyingTokenIndex);
        return value;
    }

    function getLiquidityPoolTokenBalance(
        address _optyPool,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (uint256) {
        return getAllAmountInToken(_optyPool, _underlyingToken, _liquidityPool);
    }

    function getSomeAmountInToken(
        address,
        address,
        uint256
    ) public view override returns (uint256) {
        revert("!empty");
    }

    function calculateAmountInLPToken(
        address,
        address,
        uint256
    ) public view override returns (uint256) {
        revert("!empty");
    }

    function calculateRedeemableLPTokenAmount(
        address,
        address,
        address,
        uint256 _redeemAmount
    ) public view override returns (uint256) {
        return _redeemAmount;
    }

    function isRedeemableAmountSufficient(
        address _optyPool,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bool) {
        uint256 _balanceInToken = getAllAmountInToken(_optyPool, _underlyingToken, _liquidityPool);
        return _balanceInToken >= _redeemAmount;
    }

    function getRewardToken(address) public view override returns (address) {
        return address(0);
    }

    function getUnclaimedRewardTokenAmount(address, address) public view override returns (uint256) {
        revert("!empty");
    }

    function getClaimRewardTokenCode(address, address) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getHarvestSomeCodes(
        address,
        address,
        address,
        uint256
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getHarvestAllCodes(
        address,
        address,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function canStake(address) public view override returns (bool) {
        return false;
    }

    function getStakeSomeCodes(address, uint256) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getStakeAllCodes(
        address,
        address[] memory,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getUnstakeSomeCodes(address, uint256) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getUnstakeAllCodes(address, address) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getAllAmountInTokenStake(
        address,
        address,
        address
    ) public view override returns (uint256) {
        revert("!empty");
    }

    function getLiquidityPoolTokenBalanceStake(address, address) public view override returns (uint256) {
        revert("!empty");
    }

    function calculateRedeemableLPTokenAmountStake(
        address,
        address,
        address,
        uint256
    ) public view override returns (uint256) {
        revert("!empty");
    }

    function isRedeemableAmountSufficientStake(
        address,
        address,
        address,
        uint256
    ) public view override returns (bool) {
        revert("!empty");
    }

    function getUnstakeAndWithdrawSomeCodes(
        address,
        address[] memory,
        address,
        uint256
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getUnstakeAndWithdrawAllCodes(
        address,
        address[] memory,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function addMarket(address _underlyingToken, uint256 _marketIndex) public onlyOperator {
        marketToIndexes[_underlyingToken] = _marketIndex;
    }

    function setLiquidityPoolToUnderlyingTokens(address _lendingPool, address[] memory _tokens) public onlyOperator {
        liquidityPoolToUnderlyingTokens[_lendingPool] = _tokens;
    }
    
    function setMaxExposure(uint _maxExposure) public onlyOperator {
        maxExposure = _maxExposure;
    }
    
    function _getDepositAmount(address _liquidityPool, uint _marketId, uint _amount) internal view returns(uint _depositAmount) {
        _depositAmount = _amount;
        uint _poolValue = uint(IdYdX(_liquidityPool).getMarketTotalPar(_marketId).supply);
        require((_poolValue.div(uint(10000))).mul(uint(10000)) == _poolValue,"!to small");
        uint _limit = (_poolValue.mul(maxExposure)).div(uint(10000));
        if (_depositAmount >  _limit) {
            _depositAmount = _limit;
        }
    }
}
