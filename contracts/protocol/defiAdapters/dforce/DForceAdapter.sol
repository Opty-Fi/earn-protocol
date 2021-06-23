// solhint-disable no-unused-vars
// SPDX-License-Identifier:MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import { IDForceDeposit } from "../../../interfaces/dforce/IDForceDeposit.sol";
import { IDForceStake } from "../../../interfaces/dforce/IDForceStake.sol";
import { IERC20, SafeMath } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IAdapter } from "../../../interfaces/opty/IAdapter.sol";
import { Modifiers } from "../../configuration/Modifiers.sol";
import { DataTypes } from "../../../libraries/types/DataTypes.sol";
import { HarvestCodeProvider } from "../../configuration/HarvestCodeProvider.sol";

/**
 * @dev Abstraction layer to DForce's pools
 */

contract DForceAdapter is IAdapter, Modifiers {
    using SafeMath for uint256;

    mapping(address => address) public liquidityPoolToStakingVault;
    mapping(address => uint256) public maxDepositPoolPct; // basis points
    mapping(address => uint256) public maxDepositAmount;

    // deposit pools
    address public constant USDT_DEPOSIT_POOL = address(0x868277d475E0e475E38EC5CdA2d9C83B5E1D9fc8);
    address public constant USDC_DEPOSIT_POOL = address(0x16c9cF62d8daC4a38FB50Ae5fa5d51E9170F3179);
    address public constant DAI_DEPOSIT_POOL = address(0x02285AcaafEB533e03A7306C55EC031297df9224);

    // staking vaults
    address public constant USDT_STAKING_VAULT = address(0x324EebDAa45829c6A8eE903aFBc7B61AF48538df);
    address public constant USDC_STAKING_VAULT = address(0xB71dEFDd6240c45746EC58314a01dd6D833fD3b5);
    address public constant DAI_STAKING_VAULT = address(0xD2fA07cD6Cd4A5A96aa86BacfA6E50bB3aaDBA8B);

    HarvestCodeProvider public harvestCodeProviderContract;
    DataTypes.MaxExposure public maxExposureType;
    address public rewardToken;
    uint256 public maxDepositPoolPctDefault; // basis points
    uint256 public maxDepositAmountDefault;

    constructor(address _registry, address _harvestCodeProvider) public Modifiers(_registry) {
        setHarvestCodeProvider(_harvestCodeProvider);
        setRewardToken(address(0x431ad2ff6a9C365805eBaD47Ee021148d6f7DBe0));
        setLiquidityPoolToStakingVault(USDT_DEPOSIT_POOL, USDT_STAKING_VAULT);
        setLiquidityPoolToStakingVault(USDC_DEPOSIT_POOL, USDC_STAKING_VAULT);
        setLiquidityPoolToStakingVault(DAI_DEPOSIT_POOL, DAI_STAKING_VAULT);
        setMaxDepositPoolPctDefault(uint256(10000)); // 100%
        setMaxDepositPoolType(DataTypes.MaxExposure.Number);
    }

    function setMaxDepositPoolPct(address _liquidityPool, uint256 _maxDepositPoolPct) external onlyGovernance {
        maxDepositPoolPct[_liquidityPool] = _maxDepositPoolPct;
    }

    function setMaxDepositAmountDefault(uint256 _maxDepositAmountDefault) external onlyGovernance {
        maxDepositAmountDefault = _maxDepositAmountDefault;
    }

    function setMaxDepositAmount(address _liquidityPool, uint256 _maxDepositAmount) external onlyGovernance {
        maxDepositAmount[_liquidityPool] = _maxDepositAmount;
    }

    function getAllAmountInTokenStakeWrite(
        address payable,
        address,
        address
    ) external override returns (uint256) {
        revert("!empty");
    }

    function getDepositAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) external view override returns (bytes[] memory _codes) {
        uint256[] memory _amounts = new uint256[](1);
        _amounts[0] = IERC20(_underlyingTokens[0]).balanceOf(_optyVault);
        return getDepositSomeCodes(_optyVault, _underlyingTokens, _liquidityPool, _amounts);
    }

    function getBorrowAllCodes(
        address payable,
        address[] memory,
        address,
        address
    ) external view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getRepayAndWithdrawAllCodes(
        address payable,
        address[] memory,
        address,
        address
    ) external view override returns (bytes[] memory) {
        revert("!empty");
    }

    function getWithdrawAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) external view override returns (bytes[] memory _codes) {
        uint256 _redeemAmount = getLiquidityPoolTokenBalance(_optyVault, _underlyingTokens[0], _liquidityPool);
        return getWithdrawSomeCodes(_optyVault, _underlyingTokens, _liquidityPool, _redeemAmount);
    }

    function getUnderlyingTokens(address _liquidityPool, address)
        external
        view
        override
        returns (address[] memory _underlyingTokens)
    {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = IDForceDeposit(_liquidityPool).token();
    }

    function getSomeAmountInToken(
        address,
        address _liquidityPool,
        uint256 _liquidityPoolTokenAmount
    ) external view override returns (uint256) {
        if (_liquidityPoolTokenAmount > 0) {
            _liquidityPoolTokenAmount = _liquidityPoolTokenAmount
                .mul(IDForceDeposit(_liquidityPool).getExchangeRate())
                .div(10**IDForceDeposit(_liquidityPool).decimals());
        }
        return _liquidityPoolTokenAmount;
    }

    function getSomeAmountInTokenBorrow(
        address payable,
        address,
        address,
        uint256,
        address,
        uint256
    ) external view override returns (uint256) {
        revert("!empty");
    }

    function getAllAmountInTokenBorrow(
        address payable,
        address,
        address,
        address,
        uint256
    ) external view override returns (uint256) {
        revert("!empty");
    }

    function calculateAmountInLPToken(
        address,
        address _liquidityPool,
        uint256 _depositAmount
    ) external view override returns (uint256) {
        return
            _depositAmount.mul(10**(IDForceDeposit(_liquidityPool).decimals())).div(
                IDForceDeposit(_liquidityPool).getExchangeRate()
            );
    }

    function calculateRedeemableLPTokenAmount(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) external view override returns (uint256 _amount) {
        uint256 _liquidityPoolTokenBalance = getLiquidityPoolTokenBalance(_optyVault, _underlyingToken, _liquidityPool);
        uint256 _balanceInToken = getAllAmountInToken(_optyVault, _underlyingToken, _liquidityPool);
        // can have unintentional rounding errors
        _amount = (_liquidityPoolTokenBalance.mul(_redeemAmount)).div(_balanceInToken).add(1);
    }

    function isRedeemableAmountSufficient(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) external view override returns (bool) {
        uint256 _balanceInToken = getAllAmountInToken(_optyVault, _underlyingToken, _liquidityPool);
        return _balanceInToken >= _redeemAmount;
    }

    function getClaimRewardTokenCode(address payable, address _liquidityPool)
        external
        view
        override
        returns (bytes[] memory _codes)
    {
        address _stakingVault = liquidityPoolToStakingVault[_liquidityPool];
        _codes = new bytes[](1);
        _codes[0] = abi.encode(_stakingVault, abi.encodeWithSignature("getReward()"));
    }

    function getHarvestAllCodes(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool
    ) external view override returns (bytes[] memory _codes) {
        uint256 _rewardTokenAmount = IERC20(getRewardToken(_liquidityPool)).balanceOf(_optyVault);
        return getHarvestSomeCodes(_optyVault, _underlyingToken, _liquidityPool, _rewardTokenAmount);
    }

    function canStake(address _liquidityPool) public view override returns (bool) {
        if (liquidityPoolToStakingVault[_liquidityPool] == address(0)) {
            return false;
        }
        return true;
    }

    function getStakeAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) external view override returns (bytes[] memory _codes) {
        uint256 _stakeAmount = getLiquidityPoolTokenBalance(_optyVault, _underlyingTokens[0], _liquidityPool);
        return getStakeSomeCodes(_liquidityPool, _stakeAmount);
    }

    function getUnstakeAllCodes(address payable _optyVault, address _liquidityPool)
        external
        view
        override
        returns (bytes[] memory _codes)
    {
        uint256 _unstakeAmount = getLiquidityPoolTokenBalanceStake(_optyVault, _liquidityPool);
        return getUnstakeSomeCodes(_liquidityPool, _unstakeAmount);
    }

    function calculateRedeemableLPTokenAmountStake(
        address payable _optyVault,
        address,
        address _liquidityPool,
        uint256 _redeemAmount
    ) external view override returns (uint256 _amount) {
        address _stakingVault = liquidityPoolToStakingVault[_liquidityPool];
        uint256 _liquidityPoolTokenBalance = IERC20(_stakingVault).balanceOf(_optyVault);
        uint256 _balanceInTokenStake = getAllAmountInTokenStake(_optyVault, address(0), _liquidityPool);
        // can have unintentional rounding errors
        _amount = (_liquidityPoolTokenBalance.mul(_redeemAmount)).div(_balanceInTokenStake).add(1);
    }

    function isRedeemableAmountSufficientStake(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) external view override returns (bool) {
        uint256 _balanceInTokenStake = getAllAmountInTokenStake(_optyVault, _underlyingToken, _liquidityPool);
        return _balanceInTokenStake >= _redeemAmount;
    }

    function getUnstakeAndWithdrawAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) external view override returns (bytes[] memory _codes) {
        uint256 _redeemAmount = getLiquidityPoolTokenBalanceStake(_optyVault, _liquidityPool);
        return getUnstakeAndWithdrawSomeCodes(_optyVault, _underlyingTokens, _liquidityPool, _redeemAmount);
    }

    function setLiquidityPoolToStakingVault(address _liquidityPool, address _stakingVault) public onlyOperator {
        require(
            liquidityPoolToStakingVault[_liquidityPool] != _stakingVault,
            "liquidityPoolToStakingVault already set"
        );
        liquidityPoolToStakingVault[_liquidityPool] = _stakingVault;
    }

    function setHarvestCodeProvider(address _harvestCodeProvider) public onlyOperator {
        harvestCodeProviderContract = HarvestCodeProvider(_harvestCodeProvider);
    }

    function setRewardToken(address _rewardToken) public onlyOperator {
        rewardToken = _rewardToken;
    }

    function setMaxDepositPoolType(DataTypes.MaxExposure _type) public onlyGovernance {
        maxExposureType = _type;
    }

    function setMaxDepositPoolPctDefault(uint256 _maxDepositPoolPctDefault) public onlyGovernance {
        maxDepositPoolPctDefault = _maxDepositPoolPctDefault;
    }

    function getDepositSomeCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256[] memory _amounts
    ) public view override returns (bytes[] memory _codes) {
        if (_amounts[0] > 0) {
            uint256 _depositAmount = _getDepositAmount(_liquidityPool, _amounts[0]);
            _codes = new bytes[](3);
            _codes[0] = abi.encode(
                _underlyingTokens[0],
                abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, uint256(0))
            );
            _codes[1] = abi.encode(
                _underlyingTokens[0],
                abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _depositAmount)
            );
            _codes[2] = abi.encode(
                _liquidityPool,
                abi.encodeWithSignature("mint(address,uint256)", _optyVault, _depositAmount)
            );
        }
    }

    function getWithdrawSomeCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bytes[] memory _codes) {
        if (_redeemAmount > 0) {
            _codes = new bytes[](1);
            _codes[0] = abi.encode(
                getLiquidityPoolToken(_underlyingTokens[0], _liquidityPool),
                abi.encodeWithSignature("redeem(address,uint256)", _optyVault, _redeemAmount)
            );
        }
    }

    function getPoolValue(address _liquidityPool, address) public view override returns (uint256) {
        return IDForceDeposit(_liquidityPool).getLiquidity();
    }

    function getLiquidityPoolToken(address, address _liquidityPool) public view override returns (address) {
        return _liquidityPool;
    }

    function getAllAmountInToken(
        address payable _optyVault,
        address,
        address _liquidityPool
    ) public view override returns (uint256) {
        return IDForceDeposit(_liquidityPool).getTokenBalance(_optyVault);
    }

    function getLiquidityPoolTokenBalance(
        address payable _optyVault,
        address,
        address _liquidityPool
    ) public view override returns (uint256) {
        return IERC20(_liquidityPool).balanceOf(_optyVault);
    }

    function getRewardToken(address _liquidityPool) public view override returns (address) {
        if (canStake(_liquidityPool)) {
            return rewardToken;
        }
        return address(0);
    }

    function getUnclaimedRewardTokenAmount(address payable _optyVault, address _liquidityPool)
        public
        view
        override
        returns (uint256)
    {
        return IDForceStake(liquidityPoolToStakingVault[_liquidityPool]).earned(_optyVault);
    }

    function getHarvestSomeCodes(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _rewardTokenAmount
    ) public view override returns (bytes[] memory _codes) {
        return
            harvestCodeProviderContract.getHarvestCodes(
                _optyVault,
                getRewardToken(_liquidityPool),
                _underlyingToken,
                _rewardTokenAmount
            );
    }

    function getStakeSomeCodes(address _liquidityPool, uint256 _shares)
        public
        view
        override
        returns (bytes[] memory _codes)
    {
        if (_shares > 0) {
            address _stakingVault = liquidityPoolToStakingVault[_liquidityPool];
            address _liquidityPoolToken = getLiquidityPoolToken(address(0), _liquidityPool);
            _codes = new bytes[](3);
            _codes[0] = abi.encode(
                _liquidityPoolToken,
                abi.encodeWithSignature("approve(address,uint256)", _stakingVault, uint256(0))
            );
            _codes[1] = abi.encode(
                _liquidityPoolToken,
                abi.encodeWithSignature("approve(address,uint256)", _stakingVault, _shares)
            );
            _codes[2] = abi.encode(_stakingVault, abi.encodeWithSignature("stake(uint256)", _shares));
        }
    }

    function getUnstakeSomeCodes(address _liquidityPool, uint256 _shares)
        public
        view
        override
        returns (bytes[] memory _codes)
    {
        if (_shares > 0) {
            address _stakingVault = liquidityPoolToStakingVault[_liquidityPool];
            _codes = new bytes[](1);
            _codes[0] = abi.encode(_stakingVault, abi.encodeWithSignature("withdraw(uint256)", _shares));
        }
    }

    function getAllAmountInTokenStake(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (uint256) {
        address _stakingVault = liquidityPoolToStakingVault[_liquidityPool];
        uint256 b = IERC20(_stakingVault).balanceOf(_optyVault);
        if (b > 0) {
            b = b.mul(IDForceDeposit(getLiquidityPoolToken(_underlyingToken, _liquidityPool)).getExchangeRate()).div(
                1e18
            );
        }
        uint256 _unclaimedReward = getUnclaimedRewardTokenAmount(_optyVault, _liquidityPool);
        if (_unclaimedReward > 0) {
            b = b.add(
                harvestCodeProviderContract.rewardBalanceInUnderlyingTokens(
                    rewardToken,
                    _underlyingToken,
                    _unclaimedReward
                )
            );
        }
        return b;
    }

    function getLiquidityPoolTokenBalanceStake(address payable _optyVault, address _liquidityPool)
        public
        view
        override
        returns (uint256)
    {
        address _stakingVault = liquidityPoolToStakingVault[_liquidityPool];
        return IERC20(_stakingVault).balanceOf(_optyVault);
    }

    function getUnstakeAndWithdrawSomeCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bytes[] memory _codes) {
        if (_redeemAmount > 0) {
            _codes = new bytes[](2);
            _codes[0] = getUnstakeSomeCodes(_liquidityPool, _redeemAmount)[0];
            _codes[1] = getWithdrawSomeCodes(_optyVault, _underlyingTokens, _liquidityPool, _redeemAmount)[0];
        }
    }

    function _getDepositAmount(address _liquidityPool, uint256 _amount) internal view returns (uint256 _depositAmount) {
        _depositAmount = _amount;
        uint256 _limit =
            maxExposureType == DataTypes.MaxExposure.Pct
                ? _getMaxDepositAmountByPct(_liquidityPool, _amount)
                : _getMaxDepositAmount(_liquidityPool, _amount);
        if (_limit != 0 && _depositAmount > _limit) {
            _depositAmount = _limit;
        }
    }

    function _getMaxDepositAmountByPct(address _liquidityPool, uint256 _amount)
        internal
        view
        returns (uint256 _depositAmount)
    {
        _depositAmount = _amount;
        uint256 _poolValue = getPoolValue(_liquidityPool, address(0));
        uint256 maxPct = maxDepositPoolPct[_liquidityPool];
        if (maxPct == 0) {
            maxPct = maxDepositPoolPctDefault;
        }
        uint256 _limit = (_poolValue.mul(maxPct)).div(uint256(10000));
        if (_depositAmount > _limit) {
            _depositAmount = _limit;
        }
    }

    function _getMaxDepositAmount(address _liquidityPool, uint256 _amount)
        internal
        view
        returns (uint256 _depositAmount)
    {
        _depositAmount = _amount;
        uint256 maxDeposit = maxDepositAmount[_liquidityPool];
        if (maxDeposit == 0) {
            maxDeposit = maxDepositAmountDefault;
        }
        if (_depositAmount > maxDeposit) {
            _depositAmount = maxDeposit;
        }
    }
}
