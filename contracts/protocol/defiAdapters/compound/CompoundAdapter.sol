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
import { IAdapterMinimal } from "../../../interfaces/opty/IAdapterMinimal.sol";
// import { IAdapterBorrow } from "../../../interfaces/opty/IAdapterBorrow.sol";
import { IAdapterProtocolConfig } from "../../../interfaces/opty/IAdapterProtocolConfig.sol";
import { IAdapterHarvestReward } from "../../../interfaces/opty/IAdapterHarvestReward.sol";
// import { IAdapterComptroller } from "../../../interfaces/opty/IAdapterComptroller.sol";
// import { IAdapterStaking } from "../../../interfaces/opty/IAdapterStaking.sol";
import { IAdapterInvestLimit } from "../../../interfaces/opty/IAdapterInvestLimit.sol";

/**
 * @title Adapter for Compound protocol
 * @author Opty.fi
 * @dev Abstraction layer to Compound's pools
 */
contract CompoundAdapter is
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

    /** @notice  Maps liquidityPool to max deposit value in number */
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
     * @param _liquidityPool liquidity pool address for which to set max deposit percentage
     * @param _maxDepositPoolPct Pool's Max deposit percentage to be set for the given liquidity pool
     */
    /**
     * @notice TODO IADAPTER INHERIT TAG
     */
    function setMaxDepositPoolPct(address _liquidityPool, uint256 _maxDepositPoolPct) external override onlyGovernance {
        maxDepositPoolPct[_liquidityPool] = _maxDepositPoolPct;
    }

    /**
     * @notice TODO IADAPTER INHERIT TAG
     */
    function setMaxDepositAmountDefault(uint256 _maxDepositAmountDefault) external override onlyGovernance {
        maxDepositAmountDefault = _maxDepositAmountDefault;
    }

    /**
     * @notice TODO IADAPTER INHERIT TAG
     */
    function setMaxDepositAmount(address _liquidityPool, uint256 _maxDepositAmount) external override onlyGovernance {
        maxDepositAmount[_liquidityPool] = _maxDepositAmount;
    }

    /**
     * @notice Sets the reward token for Compound protocol
     * @param _rewardToken Address of reward token to be set
     */
    function setRewardToken(address _rewardToken) public override onlyOperator {
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
    function setHarvestCodeProvider(address _harvestCodeProvider) public override onlyOperator {
        harvestCodeProviderContract = HarvestCodeProvider(_harvestCodeProvider);
    }

    /**
     * @notice Sets the max deposit amount's data type
     * @dev Types (can be number or percentage) supported for the maxDeposit value
     * @param _type Type of maxDeposit to be set (can be Number or percentage)
     */
    function setMaxDepositPoolType(DataTypes.MaxExposure _type) public override onlyGovernance {
        maxExposureType = _type;
    }

    /**
     * @notice Sets the default percentage of max deposit pool value
     * @param _maxDepositPoolPctDefault Pool's Max deposit percentage to be set as default value
     */
    function setMaxDepositPoolPctDefault(uint256 _maxDepositPoolPctDefault) public override onlyGovernance {
        maxDepositPoolPctDefault = _maxDepositPoolPctDefault;
    }

    /**
     * @notice TODO IADAPTER INHERIT TAG
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

    // /**
    //  * @notice TODO IADAPTER INHERIT TAG
    //  * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
    //  */
    // function getBorrowAllCodes(
    //     address payable,
    //     address[] memory,
    //     address,
    //     address
    // ) public view override returns (bytes[] memory) {
    //     revert("!empty");
    // }

    // /**
    //  * @notice TODO IADAPTER INHERIT TAG
    //  * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
    //  */
    // function getRepayAndWithdrawAllCodes(
    //     address payable,
    //     address[] memory,
    //     address,
    //     address
    // ) public view override returns (bytes[] memory) {
    //     revert("!empty");
    // }

    /**
     * @notice TODO IADAPTER INHERIT TAG
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
     * @notice TODO IADAPTER INHERIT TAG
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

    // /**
    //  * @notice TODO IADAPTER INHERIT TAG
    //  * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
    //  */
    // function getSomeAmountInTokenBorrow(
    //     address payable,
    //     address,
    //     address,
    //     uint256,
    //     address,
    //     uint256
    // ) public view override returns (uint256) {
    //     revert("!empty");
    // }

    // /**
    //  * @notice TODO IADAPTER INHERIT TAG
    //  * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
    //  */
    // function getAllAmountInTokenBorrow(
    //     address payable,
    //     address,
    //     address,
    //     address,
    //     uint256
    // ) public view override returns (uint256) {
    //     revert("!empty");
    // }

    /**
     * @notice TODO IADAPTER INHERIT TAG
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
     * @notice TODO IADAPTER INHERIT TAG
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
     * @notice TODO IADAPTER INHERIT TAG
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
     * @notice TODO IADAPTER INHERIT TAG
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
     * @notice TODO IADAPTER INHERIT TAG
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
     * @notice TODO IADAPTER INHERIT TAG
     */
    function canStake(address) public view override returns (bool) {
        return false;
    }

    // /**
    //  * @notice TODO IADAPTER INHERIT TAG
    //  * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
    //  */
    // function getStakeSomeCodes(address, uint256) public view override returns (bytes[] memory) {
    //     revert("!empty");
    // }

    // /**
    //  * @notice TODO IADAPTER INHERIT TAG
    //  * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
    //  */
    // function getStakeAllCodes(
    //     address payable,
    //     address[] memory,
    //     address
    // ) public view override returns (bytes[] memory) {
    //     revert("!empty");
    // }

    // /**
    //  * @notice TODO IADAPTER INHERIT TAG
    //  * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
    //  */
    // function getUnstakeSomeCodes(address, uint256) public view override returns (bytes[] memory) {
    //     revert("!empty");
    // }

    // /**
    //  * @notice TODO IADAPTER INHERIT TAG
    //  * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
    //  */
    // function getUnstakeAllCodes(address payable, address) public view override returns (bytes[] memory) {
    //     revert("!empty");
    // }

    // /**
    //  * @notice TODO IADAPTER INHERIT TAG
    //  * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
    //  */
    // function getAllAmountInTokenStake(
    //     address payable,
    //     address,
    //     address
    // ) public view override returns (uint256) {
    //     revert("!empty");
    // }

    // /**
    //  * @notice TODO IADAPTER INHERIT TAG
    //  * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
    //  */
    // function getLiquidityPoolTokenBalanceStake(address payable, address) public view override returns (uint256) {
    //     revert("!empty");
    // }

    // /**
    //  * @notice TODO IADAPTER INHERIT TAG
    //  * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
    //  */
    // function calculateRedeemableLPTokenAmountStake(
    //     address payable,
    //     address,
    //     address,
    //     uint256
    // ) public view override returns (uint256) {
    //     revert("!empty");
    // }

    // /**
    //  * @notice TODO IADAPTER INHERIT TAG
    //  * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
    //  */
    // function isRedeemableAmountSufficientStake(
    //     address payable,
    //     address,
    //     address,
    //     uint256
    // ) public view override returns (bool) {
    //     revert("!empty");
    // }

    // /**
    //  * @notice TODO IADAPTER INHERIT TAG
    //  * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
    //  */
    // function getUnstakeAndWithdrawSomeCodes(
    //     address payable,
    //     address[] memory,
    //     address,
    //     uint256
    // ) public view override returns (bytes[] memory) {
    //     revert("!empty");
    // }

    // /**
    //  * @notice TODO IADAPTER INHERIT TAG
    //  * @dev Reverting '!empty' message as there is no related functionality for this in Compound protocol
    //  */
    // function getUnstakeAndWithdrawAllCodes(
    //     address payable,
    //     address[] memory,
    //     address
    // ) public view override returns (bytes[] memory) {
    //     revert("!empty");
    // }

    /**
     * @notice TODO IADAPTER INHERIT TAG
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
     * @notice TODO IADAPTER INHERIT TAG
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
     * @notice TODO IADAPTER INHERIT TAG
     */
    function getPoolValue(address _liquidityPool, address) public view override returns (uint256) {
        return ICompound(_liquidityPool).getCash();
    }

    /**
     * @notice TODO IADAPTER INHERIT TAG
     */
    function getLiquidityPoolToken(address, address _liquidityPool) public view override returns (address) {
        return _liquidityPool;
    }

    /**
     * @notice TODO IADAPTER INHERIT TAG
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
     * @notice TODO IADAPTER INHERIT TAG
     */
    function getLiquidityPoolTokenBalance(
        address payable _optyVault,
        address,
        address _liquidityPool
    ) public view override returns (uint256) {
        return IERC20(_liquidityPool).balanceOf(_optyVault);
    }

    /**
     * @notice TODO IADAPTER INHERIT TAG
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
     * @notice TODO IADAPTER INHERIT TAG
     */
    function getRewardToken(address) public view override returns (address) {
        return rewardToken;
    }

    /**
     * @notice TODO IADAPTER INHERIT TAG
     */
    function getUnclaimedRewardTokenAmount(address payable _optyVault, address) public view override returns (uint256) {
        return ICompound(comptroller).compAccrued(_optyVault);
    }

    /**
     * @notice TODO IADAPTER INHERIT TAG
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
