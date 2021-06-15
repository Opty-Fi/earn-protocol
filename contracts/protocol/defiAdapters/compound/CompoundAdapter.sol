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
import { ICompound } from "../../../interfaces/compound/ICompound.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IAdapter } from "../../../interfaces/opty/IAdapter.sol";

/**
 * @title Adapter for Compound protocol
 * @author Opty.fi
 * @dev Abstraction layer to Compound's pools
 */
contract CompoundAdapter is IAdapter, Modifiers {
    using SafeMath for uint256;

    /** @notice HarvestCodeProvider contract instance */
    HarvestCodeProvider public harvestCodeProviderContract;

    /** @notice  Maps liquidityPool to max deposit value in percentage */
    mapping(address => uint256) public maxDepositPoolPct; // basis points

    /** @notice  Maps liquidityPool to max deposit value in absolute value */
    mapping(address => uint256) public maxDepositAmount;

    /** WETH ERC20 token address */
    address public constant WETH = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);

    /** @notice max deposit value datatypes */
    DataTypes.MaxExposure public maxExposureType;

    /** @notice Compound's comptroller contract address */
    address public comptroller;

    /** @notice Compound's reward token (COMP) address */
    address public rewardToken;

    /** @notice max deposit's default value in percentage */
    uint256 public maxDepositPoolPctDefault; // basis points

    /** @notice max deposit's default value in number */
    uint256 public maxDepositAmountDefault;

    constructor(address _registry, address _harvestCodeProvider) public Modifiers(_registry) {
        setRewardToken(address(0xc00e94Cb662C3520282E6f5717214004A7f26888));
        setComptroller(address(0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B));
        setHarvestCodeProvider(_harvestCodeProvider);
        setMaxDepositPoolPctDefault(uint256(10000)); // 100%
        setMaxDepositPoolType(DataTypes.MaxExposure.Number);
    }

    /**
     * @notice Sets the percentage of max deposit value for the given liquidity pool
     * @param _liquidityPool liquidity pool address
     * @param _maxDepositPoolPct liquidity pool's max deposit percentage (in basis points, For eg: 50% means 5000)
     */
    function setMaxDepositPoolPct(address _liquidityPool, uint256 _maxDepositPoolPct) external onlyGovernance {
        maxDepositPoolPct[_liquidityPool] = _maxDepositPoolPct;
    }

    /**
     * @notice Sets the default absolute max deposit value in underlying
     * @param _maxDepositAmountDefault absolute max deposit value in underlying to be set as default value
     */
    function setMaxDepositAmountDefault(uint256 _maxDepositAmountDefault) external onlyGovernance {
        maxDepositAmountDefault = _maxDepositAmountDefault;
    }

    /**
     * @notice Sets the absolute max deposit value in underlying for the given liquidity pool
     * @param _liquidityPool liquidity pool address for which to set max deposit value (in absolute value)
     * @param _maxDepositAmount absolute max deposit amount in underlying to be set for given liquidity pool
     */
    function setMaxDepositAmount(address _liquidityPool, uint256 _maxDepositAmount) external onlyGovernance {
        maxDepositAmount[_liquidityPool] = _maxDepositAmount;
    }

    /**
     * @notice Sets the reward token for Compound protocol
     * @param _rewardToken Address of reward token to be set
     */
    function setRewardToken(address _rewardToken) public onlyOperator {
        rewardToken = _rewardToken;
    }

    /**
     * @notice Sets the Comptroller of Compound protocol
     * @param _comptroller Compound's Comptroller contract address
     */
    function setComptroller(address _comptroller) public onlyOperator {
        comptroller = _comptroller;
    }

    /**
     * @notice Sets the HarvestCodeProvider contract address
     * @param _harvestCodeProvider Optyfi's HarvestCodeProvider contract address
     */
    function setHarvestCodeProvider(address _harvestCodeProvider) public onlyOperator {
        harvestCodeProviderContract = HarvestCodeProvider(_harvestCodeProvider);
    }

    /**
     * @notice Sets the type of investment limit
     *                  1. Percentage of pool value
     *                  2. Amount in underlying token
     * @dev Types (can be number or percentage) supported for the maxDeposit value
     * @param _type Type of maxDeposit to be set (can be absolute value or percentage)
     */
    function setMaxDepositPoolType(DataTypes.MaxExposure _type) public onlyGovernance {
        maxExposureType = _type;
    }

    /**
     * @notice Sets the default percentage of max deposit pool value
     * @param _maxDepositPoolPctDefault Pool's max deposit percentage (in basis points, For eg: 50% means 5000)
     * to be set as default value
     */
    function setMaxDepositPoolPctDefault(uint256 _maxDepositPoolPctDefault) public onlyGovernance {
        maxDepositPoolPctDefault = _maxDepositPoolPctDefault;
    }

    /**
     * @inheritdoc IAdapter
     */
    function getDepositAllCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256[] memory _amounts = new uint256[](1);
        _amounts[0] = IERC20(_underlyingTokens[0]).balanceOf(_vault);
        return getDepositSomeCodes(_vault, _underlyingTokens, _liquidityPool, _amounts);
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
     */
    function getBorrowAllCodes(
        address payable,
        address[] memory,
        address,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
     */
    function getRepayAndWithdrawAllCodes(
        address payable,
        address[] memory,
        address,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     */
    function getWithdrawAllCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _redeemAmount = getLiquidityPoolTokenBalance(_vault, _underlyingTokens[0], _liquidityPool);
        return getWithdrawSomeCodes(_vault, _underlyingTokens, _liquidityPool, _redeemAmount);
    }

    /**
     * @inheritdoc IAdapter
     */
    function getUnderlyingTokens(address _liquidityPool, address)
        public
        view
        override
        returns (address[] memory _underlyingTokens)
    {
        _underlyingTokens = new address[](1);
        _underlyingTokens[0] = ICompound(_liquidityPool).underlying();
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
     */
    function getSomeAmountInTokenBorrow(
        address payable,
        address,
        address,
        uint256,
        address,
        uint256
    ) public view override returns (uint256) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
     */
    function getAllAmountInTokenBorrow(
        address payable,
        address,
        address,
        address,
        uint256
    ) public view override returns (uint256) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     */
    function calculateAmountInLPToken(
        address _underlyingToken,
        address _liquidityPool,
        uint256 _depositAmount
    ) public view override returns (uint256) {
        return
            _depositAmount.mul(1e18).div(
                ICompound(getLiquidityPoolToken(_underlyingToken, _liquidityPool)).exchangeRateStored()
            );
    }

    /**
     * @inheritdoc IAdapter
     */
    function calculateRedeemableLPTokenAmount(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (uint256 _amount) {
        uint256 _liquidityPoolTokenBalance = getLiquidityPoolTokenBalance(_vault, _underlyingToken, _liquidityPool);
        uint256 _balanceInToken = getAllAmountInToken(_vault, _underlyingToken, _liquidityPool);
        // can have unintentional rounding errors
        _amount = (_liquidityPoolTokenBalance.mul(_redeemAmount)).div(_balanceInToken).add(1);
    }

    /**
     * @inheritdoc IAdapter
     */
    function isRedeemableAmountSufficient(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) public view override returns (bool) {
        uint256 _balanceInToken = getAllAmountInToken(_vault, _underlyingToken, _liquidityPool);
        return _balanceInToken >= _redeemAmount;
    }

    /**
     * @inheritdoc IAdapter
     */
    function getClaimRewardTokenCode(address payable _vault, address)
        public
        view
        override
        returns (bytes[] memory _codes)
    {
        _codes = new bytes[](1);
        _codes[0] = abi.encode(comptroller, abi.encodeWithSignature("claimComp(address)", _vault));
    }

    /**
     * @inheritdoc IAdapter
     */
    function getHarvestAllCodes(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (bytes[] memory _codes) {
        uint256 _rewardTokenAmount = IERC20(getRewardToken(_liquidityPool)).balanceOf(_vault);
        return getHarvestSomeCodes(_vault, _underlyingToken, _liquidityPool, _rewardTokenAmount);
    }

    /**
     * @inheritdoc IAdapter
     */
    function canStake(address) public view override returns (bool) {
        return false;
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
     */
    function getStakeSomeCodes(address, uint256) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
     */
    function getStakeAllCodes(
        address payable,
        address[] memory,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
     */
    function getUnstakeSomeCodes(address, uint256) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
     */
    function getUnstakeAllCodes(address payable, address) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
     */
    function getAllAmountInTokenStake(
        address payable,
        address,
        address
    ) public view override returns (uint256) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
     */
    function getLiquidityPoolTokenBalanceStake(address payable, address) public view override returns (uint256) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
     */
    function calculateRedeemableLPTokenAmountStake(
        address payable,
        address,
        address,
        uint256
    ) public view override returns (uint256) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
     */
    function isRedeemableAmountSufficientStake(
        address payable,
        address,
        address,
        uint256
    ) public view override returns (bool) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
     */
    function getUnstakeAndWithdrawSomeCodes(
        address payable,
        address[] memory,
        address,
        uint256
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
     */
    function getUnstakeAndWithdrawAllCodes(
        address payable,
        address[] memory,
        address
    ) public view override returns (bytes[] memory) {
        revert("!empty");
    }

    /**
     * @inheritdoc IAdapter
     */
    function getDepositSomeCodes(
        address payable,
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
            _codes[2] = abi.encode(_liquidityPool, abi.encodeWithSignature("mint(uint256)", uint256(_depositAmount)));
        }
    }

    /**
     * @inheritdoc IAdapter
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
                abi.encodeWithSignature("redeem(uint256)", uint256(_amount))
            );
        }
    }

    /**
     * @inheritdoc IAdapter
     */
    function getPoolValue(address _liquidityPool, address) public view override returns (uint256) {
        return ICompound(_liquidityPool).getCash();
    }

    /**
     * @inheritdoc IAdapter
     */
    function getLiquidityPoolToken(address, address _liquidityPool) public view override returns (address) {
        return _liquidityPool;
    }

    /**
     * @inheritdoc IAdapter
     */
    function getAllAmountInToken(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (uint256) {
        // Mantisa 1e18 to decimals
        uint256 b =
            getSomeAmountInToken(
                _underlyingToken,
                _liquidityPool,
                getLiquidityPoolTokenBalance(_vault, _underlyingToken, _liquidityPool)
            );
        uint256 _unclaimedReward = getUnclaimedRewardTokenAmount(_vault, _liquidityPool);
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
     * @inheritdoc IAdapter
     */
    function getLiquidityPoolTokenBalance(
        address payable _vault,
        address,
        address _liquidityPool
    ) public view override returns (uint256) {
        return IERC20(_liquidityPool).balanceOf(_vault);
    }

    /**
     * @inheritdoc IAdapter
     */
    function getSomeAmountInToken(
        address,
        address _liquidityPool,
        uint256 _liquidityPoolTokenAmount
    ) public view override returns (uint256) {
        if (_liquidityPoolTokenAmount > 0) {
            _liquidityPoolTokenAmount = _liquidityPoolTokenAmount
                .mul(ICompound(_liquidityPool).exchangeRateStored())
                .div(1e18);
        }
        return _liquidityPoolTokenAmount;
    }

    /**
     * @inheritdoc IAdapter
     */
    function getRewardToken(address) public view override returns (address) {
        return rewardToken;
    }

    /**
     * @inheritdoc IAdapter
     */
    function getUnclaimedRewardTokenAmount(address payable _vault, address) public view override returns (uint256) {
        return ICompound(comptroller).compAccrued(_vault);
    }

    /**
     * @inheritdoc IAdapter
     */
    function getHarvestSomeCodes(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _rewardTokenAmount
    ) public view override returns (bytes[] memory _codes) {
        return
            harvestCodeProviderContract.getHarvestCodes(
                _vault,
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
