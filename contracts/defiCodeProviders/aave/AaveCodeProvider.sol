// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "../../interfaces/opty/ICodeProvider.sol";
import "../../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../../interfaces/aave/IAave.sol";
import "../../interfaces/aave/IAToken.sol";
import "../../interfaces/ERC20/IERC20.sol";
import "../../libraries/SafeMath.sol";
import "../../utils/Modifiers.sol";

contract AaveCodeProvider is ICodeProvider, Modifiers {
    using SafeMath for uint256;

    uint256 public maxExposure; // basis points

    constructor(address _registry) public Modifiers(_registry) {
        setMaxExposure(uint256(5000)); // 50%
    }

    function getPoolValue(address _liquidityPoolAddressProvider, address _underlyingToken) public view override returns (uint256) {
        return IAave(_getLendingPool(_liquidityPoolAddressProvider)).getReserveData(_underlyingToken).availableLiquidity;
    }

    function getDepositSomeCodes(
        address,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProvider,
        uint256[] memory _amounts
    ) public view override returns (bytes[] memory _codes) {
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProvider);
        address _lendingPoolCore = _getLendingPoolCore(_liquidityPoolAddressProvider);
        uint256 _depositAmount = _getDepositAmount(_liquidityPoolAddressProvider, _underlyingTokens[0], _amounts[0]);
        _codes = new bytes[](3);
        _codes[0] = abi.encode(_underlyingTokens[0], abi.encodeWithSignature("approve(address,uint256)", _lendingPoolCore, uint256(0)));
        _codes[1] = abi.encode(_underlyingTokens[0], abi.encodeWithSignature("approve(address,uint256)", _lendingPoolCore, _depositAmount));
        _codes[2] = abi.encode(
            _lendingPool,
            abi.encodeWithSignature("deposit(address,uint256,uint16)", _underlyingTokens[0], _depositAmount, uint16(0))
        );
    }

    function getDepositAllCodes(
        address _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProvider
    ) public view override returns (bytes[] memory _codes) {
        uint256[] memory _amounts = new uint256[](1);
        _amounts[0] = IERC20(_underlyingTokens[0]).balanceOf(_optyPool);
        return getDepositSomeCodes(_optyPool, _underlyingTokens, _liquidityPoolAddressProvider, _amounts);
    }

    function getWithdrawSomeCodes(
        address,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProvider,
        uint256 _amount
    ) public view override returns (bytes[] memory _codes) {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(
            getLiquidityPoolToken(_underlyingTokens[0], _liquidityPoolAddressProvider),
            abi.encodeWithSignature("redeem(uint256)", _amount)
        );
    }

    function getWithdrawAllCodes(
        address _optyPool,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProvider
    ) public view override returns (bytes[] memory _codes) {
        uint256 _redeemAmount = getLiquidityPoolTokenBalance(_optyPool, _underlyingTokens[0], _liquidityPoolAddressProvider);
        return getWithdrawSomeCodes(_optyPool, _underlyingTokens, _liquidityPoolAddressProvider, _redeemAmount);
    }

    function getLiquidityPoolToken(address _underlyingToken, address _liquidityPoolAddressProvider) public view override returns (address) {
        address _lendingPool = _getLendingPool(_liquidityPoolAddressProvider);
        ReserveData memory _reserveData = IAave(_lendingPool).getReserveData(_underlyingToken);
        return _reserveData.aTokenAddress;
    }

    function getUnderlyingTokens(address, address _liquidityPoolToken) public view override returns (address[] memory _underlyingTokens) {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = IAToken(_liquidityPoolToken).underlyingAssetAddress();
    }

    function getAllAmountInToken(
        address _optyPool,
        address _underlyingToken,
        address _liquidityPoolAddressProvider
    ) public view override returns (uint256) {
        return getLiquidityPoolTokenBalance(_optyPool, _underlyingToken, _liquidityPoolAddressProvider);
    }

    function getLiquidityPoolTokenBalance(
        address _optyPool,
        address _underlyingToken,
        address _liquidityPoolAddressProvider
    ) public view override returns (uint256) {
        return IERC20(getLiquidityPoolToken(_underlyingToken, _liquidityPoolAddressProvider)).balanceOf(_optyPool);
    }

    function getSomeAmountInToken(
        address,
        address,
        uint256 _liquidityPoolTokenAmount
    ) public view override returns (uint256) {
        return _liquidityPoolTokenAmount;
    }

    function calculateAmountInLPToken(
        address,
        address,
        uint256 _underlyingTokenAmount
    ) public view override returns (uint256) {
        return _underlyingTokenAmount;
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

    function setMaxExposure(uint256 _maxExposure) public onlyOperator {
        maxExposure = _maxExposure;
    }

    function _getLendingPool(address _lendingPoolAddressProvider) internal view returns (address) {
        return ILendingPoolAddressesProvider(_lendingPoolAddressProvider).getLendingPool();
    }

    function _getLendingPoolCore(address _lendingPoolAddressProvider) internal view returns (address) {
        return ILendingPoolAddressesProvider(_lendingPoolAddressProvider).getLendingPoolCore();
    }

    function _getDepositAmount(
        address _liquidityPoolAddressProvider,
        address _underlyingToken,
        uint256 _amount
    ) internal view returns (uint256 _depositAmount) {
        _depositAmount = _amount;
        uint256 _poolValue = getPoolValue(_liquidityPoolAddressProvider, _underlyingToken);
        uint256 _limit = (_poolValue.mul(maxExposure)).div(uint256(10000));
        if (_depositAmount > _limit) {
            _depositAmount = _limit;
        }
    }
}
