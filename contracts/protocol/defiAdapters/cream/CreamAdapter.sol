// solhint-disable no-unused-vars
// SPDX-License-Identifier:MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

//  libraries
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { DataTypes } from "../../../libraries/types/DataTypes.sol";

//  helper contracts
import { Modifiers } from "../../configuration/Modifiers.sol";
import { HarvestCodeProvider } from "../../configuration/HarvestCodeProvider.sol";

//  interfaces
import { ICream } from "../../../interfaces/cream/ICream.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IAdapterMinimal } from "../../../interfaces/opty/defiAdapters/IAdapterMinimal.sol";
import { IAdapterProtocolConfig } from "../../../interfaces/opty/defiAdapters/IAdapterProtocolConfig.sol";
import { IAdapterHarvestReward } from "../../../interfaces/opty/defiAdapters/IAdapterHarvestReward.sol";
import { IAdapterInvestLimit } from "../../../interfaces/opty/defiAdapters/IAdapterInvestLimit.sol";

/**
 * @title Adapter for Cream protocol
 * @author Opty.fi
 * @dev Abstraction layer to Cream's pools
 */
contract CreamAdapter is
    IAdapterMinimal,
    IAdapterProtocolConfig,
    IAdapterHarvestReward,
    IAdapterInvestLimit,
    Modifiers
{
    using SafeMath for uint256;

    /** @notice HarvestCodeProvider contract instance */
    HarvestCodeProvider public harvestCodeProviderContract;
    /** @notice  Maps liquidityPool to max deposit value in percentage */
    mapping(address => uint256) public maxDepositPoolPct; // basis points
    /** @notice  Maps liquidityPool to max deposit value in absolute value */
    mapping(address => uint256) public maxDepositAmount;

    address public constant HBTC = address(0x0316EB71485b0Ab14103307bf65a021042c6d380);
    /** @notice max deposit value datatypes */
    DataTypes.MaxExposure public maxExposureType;
    /** @notice Cream's Comptroller contract address */
    address public comptroller;
    /** @notice Cream's Reward token address */
    address public rewardToken;
    /** @notice max deposit's default value in percentage */
    uint256 public maxDepositPoolPctDefault; // basis points
    /** @notice max deposit's default value in number */
    uint256 public maxDepositAmountDefault;

    constructor(address _registry, address _harvestCodeProvider) public Modifiers(_registry) {
        setComptroller(address(0x3d5BC3c8d13dcB8bF317092d84783c2697AE9258));
        setRewardToken(address(0x2ba592F78dB6436527729929AAf6c908497cB200));
        setHarvestCodeProvider(_harvestCodeProvider);
        setMaxDepositPoolPctDefault(uint256(10000)); // 100%
        setMaxDepositPoolType(DataTypes.MaxExposure.Number);
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function setMaxDepositPoolPct(address _liquidityPool, uint256 _maxDepositPoolPct) external override onlyGovernance {
        maxDepositPoolPct[_liquidityPool] = _maxDepositPoolPct;
    }

    /**
     * @inheritdoc IAdapterInvestLimit
     */
    function setMaxDepositAmountDefault(uint256 _maxDepositAmountDefault) external override onlyGovernance {
        maxDepositAmountDefault = _maxDepositAmountDefault;
    }

    /**
     * @inheritdoc IAdapterInvestLimit
     */
    function setMaxDepositAmount(address _liquidityPool, uint256 _maxDepositAmount) external override onlyGovernance {
        maxDepositAmount[_liquidityPool] = _maxDepositAmount;
    }

    /**
     * @notice Sets the Comptroller of Cream protocol
     * @param _comptroller Cream's Comptroller contract address
     */
    function setComptroller(address _comptroller) public onlyOperator {
        comptroller = _comptroller;
    }

    /**
     * @inheritdoc IAdapterHarvestReward
     */
    function setRewardToken(address _rewardToken) public override onlyOperator {
        rewardToken = _rewardToken;
    }

    /**
     * @inheritdoc IAdapterProtocolConfig
     */
    function setHarvestCodeProvider(address _harvestCodeProvider) public override onlyOperator {
        harvestCodeProviderContract = HarvestCodeProvider(_harvestCodeProvider);
    }

    /**
     * @inheritdoc IAdapterInvestLimit
     */
    function setMaxDepositPoolType(DataTypes.MaxExposure _type) public override onlyGovernance {
        maxExposureType = _type;
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function setMaxDepositPoolPctDefault(uint256 _maxDepositPoolPctDefault) public override onlyGovernance {
        maxDepositPoolPctDefault = _maxDepositPoolPctDefault;
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function getDepositAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256[] memory _amounts = new uint256[](1);
        _amounts[0] = IERC20(_underlyingTokens[0]).balanceOf(_optyVault);
        return getDepositSomeCodes(_optyVault, _underlyingTokens, _liquidityPool, _amounts);
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function getWithdrawAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _redeemAmount = getLiquidityPoolTokenBalance(_optyVault, _underlyingTokens[0], _liquidityPool);
        return getWithdrawSomeCodes(_optyVault, _underlyingTokens, _liquidityPool, _redeemAmount);
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function getUnderlyingTokens(address _liquidityPool, address)
        public
        view
        override
        returns (address[] memory _underlyingTokens)
    {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = ICream(_liquidityPool).underlying();
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function calculateAmountInLPToken(
        address _underlyingToken,
        address _liquidityPool,
        uint256 _depositAmount
    ) public view override returns (uint256) {
        return
            _depositAmount.mul(1e18).div(
                ICream(getLiquidityPoolToken(_underlyingToken, _liquidityPool)).exchangeRateStored()
            );
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function calculateRedeemableLPTokenAmount(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (uint256 _amount) {
        uint256 _liquidityPoolTokenBalance = getLiquidityPoolTokenBalance(_optyVault, _underlyingToken, _liquidityPool);
        uint256 _balanceInToken = getAllAmountInToken(_optyVault, _underlyingToken, _liquidityPool);
        // can have unintentional rounding errors
        _amount = (_liquidityPoolTokenBalance.mul(_redeemAmount)).div(_balanceInToken).add(1);
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function isRedeemableAmountSufficient(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bool) {
        uint256 _balanceInToken = getAllAmountInToken(_optyVault, _underlyingToken, _liquidityPool);
        return _balanceInToken >= _redeemAmount;
    }

    /**
     * @inheritdoc IAdapterHarvestReward
     */
    function getClaimRewardTokenCode(address payable _optyVault, address)
        public
        view
        override
        returns (bytes[] memory _codes)
    {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(comptroller, abi.encodeWithSignature("claimComp(address)", _optyVault));
    }

    /**
     * @inheritdoc IAdapterHarvestReward
     */
    function getHarvestAllCodes(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _rewardTokenAmount = IERC20(getRewardToken(_liquidityPool)).balanceOf(_optyVault);
        return getHarvestSomeCodes(_optyVault, _underlyingToken, _liquidityPool, _rewardTokenAmount);
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function canStake(address) public view override returns (bool) {
        return false;
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function getDepositSomeCodes(
        address payable,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256[] memory _amounts
    ) public view override returns (bytes[] memory _codes) {
        if (_amounts[0] > 0) {
            uint256 _depositAmount = _getDepositAmount(_liquidityPool, _amounts[0]);
            if (_underlyingTokens[0] == HBTC) {
                _codes = new bytes[](2);
                _codes[0] = abi.encode(
                    _underlyingTokens[0],
                    abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _amounts[0])
                );
                _codes[1] = abi.encode(_liquidityPool, abi.encodeWithSignature("mint(uint256)", _depositAmount));
            } else {
                _codes = new bytes[](3);
                _codes[0] = abi.encode(
                    _underlyingTokens[0],
                    abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, uint256(0))
                );
                _codes[1] = abi.encode(
                    _underlyingTokens[0],
                    abi.encodeWithSignature("approve(address,uint256)", _liquidityPool, _depositAmount)
                );
                _codes[2] = abi.encode(_liquidityPool, abi.encodeWithSignature("mint(uint256)", _depositAmount));
            }
        }
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function getWithdrawSomeCodes(
        address payable,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256 _amount
    ) public view override returns (bytes[] memory _codes) {
        if (_amount > 0) {
            _codes = new bytes[](1);
            _codes[0] = abi.encode(
                getLiquidityPoolToken(_underlyingTokens[0], _liquidityPool),
                abi.encodeWithSignature("redeem(uint256)", _amount)
            );
        }
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function getPoolValue(address _liquidityPool, address) public view override returns (uint256) {
        return ICream(_liquidityPool).getCash();
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function getLiquidityPoolToken(address, address _liquidityPool) public view override returns (address) {
        return _liquidityPool;
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function getAllAmountInToken(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (uint256) {
        // Mantisa 1e18 to decimals
        uint256 b =
            getSomeAmountInToken(
                _underlyingToken,
                _liquidityPool,
                getLiquidityPoolTokenBalance(_optyVault, _underlyingToken, _liquidityPool)
            );
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

    /**
     * @inheritdoc IAdapterMinimal
     */
    function getLiquidityPoolTokenBalance(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (uint256) {
        return IERC20(getLiquidityPoolToken(_underlyingToken, _liquidityPool)).balanceOf(_optyVault);
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function getSomeAmountInToken(
        address,
        address _liquidityPool,
        uint256 _liquidityPoolTokenAmount
    ) public view override returns (uint256) {
        if (_liquidityPoolTokenAmount > 0) {
            _liquidityPoolTokenAmount = _liquidityPoolTokenAmount.mul(ICream(_liquidityPool).exchangeRateStored()).div(
                1e18
            );
        }
        return _liquidityPoolTokenAmount;
    }

    /**
     * @inheritdoc IAdapterMinimal
     */
    function getRewardToken(address) public view override returns (address) {
        return rewardToken;
    }

    /**
     * @inheritdoc IAdapterHarvestReward
     */
    function getUnclaimedRewardTokenAmount(address payable _optyVault, address) public view override returns (uint256) {
        return ICream(comptroller).compAccrued(_optyVault);
    }

    /**
     * @inheritdoc IAdapterHarvestReward
     */
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
