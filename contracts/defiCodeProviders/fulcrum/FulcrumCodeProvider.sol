// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../interfaces/fulcrum/IFulcrum.sol";
import "../../libraries/SafeMath.sol";
import "../../interfaces/ERC20/IERC20.sol";
import "../../utils/Modifiers.sol";

contract FulcrumCodeProvider is ICodeProvider, Modifiers {
    using SafeMath for uint256;

    uint256 public maxExposure; // basis points

    constructor(address _registry) public Modifiers(_registry) {
        setMaxExposure(uint256(5000)); // 50%
    }

    function getPoolValue(address _liquidityPool, address) public view override returns (uint256) {
        return IFulcrum(_liquidityPool).marketLiquidity();
    }

    function getDepositSomeCodes(
        address payable _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256[] memory _amounts
    ) public view override returns (bytes[] memory _codes) {
        if (_amounts[0] > 0) {
            uint256 _depositAmount = _getDepositAmount(_liquidityPool, _amounts[0]);
            _codes = new bytes[](3);
            _codes[0] = abi.encode(_underlyingTokens[0], abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, uint256(0)));
            _codes[1] = abi.encode(_underlyingTokens[0], abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _depositAmount));
            _codes[2] = abi.encode(_liquidityPool, abi.encodeWithSignature("mint(address,uint256)", _optyPool, _depositAmount));
        }
    }

    function getDepositAllCodes(
        address payable _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256[] memory _amounts = new uint256[](1);
        _amounts[0] = IERC20(_underlyingTokens[0]).balanceOf(_optyPool);
        return getDepositSomeCodes(_optyPool, _underlyingTokens, _liquidityPool, _amounts);
    }

    function getBorrowAllCodes(
        address payable,
        address[] memory,
        address,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getRepayAndWithdrawAllCodes(
        address payable,
        address[] memory,
        address,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getWithdrawSomeCodes(
        address payable _optyPool,
        address[] memory,
        address _liquidityPool,
        uint256 _burnAmount
    ) public view override returns (bytes[] memory _codes) {
        if (_burnAmount > 0) {
            _codes = new bytes[](1);
            _codes[0] = abi.encode(_liquidityPool, abi.encodeWithSignature("burn(address,uint256)", _optyPool, _burnAmount));
        }
    }

    function getWithdrawAllCodes(
        address payable _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _redeemAmount = getLiquidityPoolTokenBalance(_optyPool, _underlyingTokens[0], _liquidityPool);
        return getWithdrawSomeCodes(_optyPool, _underlyingTokens, _liquidityPool, _redeemAmount);
    }

    function getLiquidityPoolToken(address, address _liquidityPool) public view override returns (address) {
        return _liquidityPool;
    }

    function getUnderlyingTokens(address _liquidityPool, address) public view override returns (address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = IFulcrum(_liquidityPool).loanTokenAddress();
    }

    function getAllAmountInToken(
        address payable _optyPool,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (uint256) {
        uint256 _liquidityPoolTokenBalance = getLiquidityPoolTokenBalance(_optyPool, _underlyingToken, _liquidityPool);
        if (_liquidityPoolTokenBalance > 0) {
            _liquidityPoolTokenBalance = IFulcrum(_liquidityPool).assetBalanceOf(_optyPool);
        }
        return _liquidityPoolTokenBalance;
    }

    function getLiquidityPoolTokenBalance(
        address payable _optyPool,
        address,
        address _liquidityPool
    ) public view override returns (uint256) {
        return IERC20(_liquidityPool).balanceOf(_optyPool);
    }

    function getSomeAmountInToken(
        address,
        address _liquidityPool,
        uint256 _liquidityPoolTokenAmount
    ) public view override returns (uint256) {
        if (_liquidityPoolTokenAmount > 0) {
            _liquidityPoolTokenAmount = _liquidityPoolTokenAmount.mul(IFulcrum(_liquidityPool).tokenPrice()).div(
                10**IFulcrum(_liquidityPool).decimals()
            );
        }
        return _liquidityPoolTokenAmount;
    }

    function calculateAmountInLPToken(
        address,
        address _liquidityPool,
        uint256 _depositAmount
    ) public view override returns (uint256) {
        return _depositAmount.mul(10**(IFulcrum(_liquidityPool).decimals())).div(IFulcrum(_liquidityPool).tokenPrice());
    }

    function calculateRedeemableLPTokenAmount(
        address payable _optyPool,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (uint256 _amount) {
        uint256 _liquidityPoolTokenBalance = getLiquidityPoolTokenBalance(_optyPool, _underlyingToken, _liquidityPool);
        uint256 _balanceInToken = getAllAmountInToken(_optyPool, _underlyingToken, _liquidityPool);
        // can have unintentional rounding errors
        _amount = (_liquidityPoolTokenBalance.mul(_redeemAmount)).div(_balanceInToken).add(1);
    }

    function isRedeemableAmountSufficient(
        address payable _optyPool,
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

    function getUnclaimedRewardTokenAmount(address payable, address) public view override returns (uint256) {
        revert("!empty");
    }

    function getHarvestSomeCodes(
        address payable,
        address,
        address,
        uint256
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getHarvestAllCodes(
        address payable,
        address,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getClaimRewardTokenCode(address payable, address) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function canStake(address) public view override returns (bool) {
        return false;
    }

    function getStakeSomeCodes(address, uint256) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getStakeAllCodes(
        address payable,
        address[] memory,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getUnstakeSomeCodes(address, uint256) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getUnstakeAllCodes(address payable, address) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getAllAmountInTokenStake(
        address payable,
        address,
        address
    ) public view override returns (uint256) {
        revert("!empty");
    }

    function getLiquidityPoolTokenBalanceStake(address payable, address) public view override returns (uint256) {
        revert("!empty");
    }

    function calculateRedeemableLPTokenAmountStake(
        address payable,
        address,
        address,
        uint256
    ) public view override returns (uint256) {
        revert("!empty");
    }

    function isRedeemableAmountSufficientStake(
        address payable,
        address,
        address,
        uint256
    ) public view override returns (bool) {
        revert("!empty");
    }

    function getUnstakeAndWithdrawSomeCodes(
        address payable,
        address[] memory,
        address,
        uint256
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getUnstakeAndWithdrawAllCodes(
        address payable,
        address[] memory,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    function setMaxExposure(uint256 _maxExposure) public onlyOperator {
        maxExposure = _maxExposure;
    }

    function _getDepositAmount(address _liquidityPool, uint256 _amount) internal view returns (uint256 _depositAmount) {
        _depositAmount = _amount;
        uint256 _poolValue = getPoolValue(_liquidityPool, address(0));
        uint256 _limit = (_poolValue.mul(maxExposure)).div(uint256(10000));
        if (_depositAmount > _limit) {
            _depositAmount = _limit;
        }
    }
}
