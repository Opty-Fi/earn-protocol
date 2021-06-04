// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import { IAdapter } from "../../interfaces/opty/IAdapter.sol";
import { SafeERC20, IERC20, SafeMath, Address } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Modifiers } from "./Modifiers.sol";
import { DataTypes } from "../../libraries/types/DataTypes.sol";
import {
    IVaultStepInvestStrategyDefinitionRegistry
} from "../../interfaces/opty/IVaultStepInvestStrategyDefinitionRegistry.sol";
import { IStrategyManager } from "../../interfaces/opty/IStrategyManager.sol";
import { IHarvestCodeProvider } from "../../interfaces/opty/IHarvestCodeProvider.sol";

/**
 * @title StrategyManager Contract
 * @author Opty.fi
 * @notice Central processing unit of the earn protocol
 * @dev Contains the functionality for getting the codes for deposit/withdraw tokens,
 * claim/harvest reward tokens from the adapters and pass it onto vault contract
 */
contract StrategyManager is IStrategyManager, Modifiers {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    /**
     * @notice Zero bytes32 type Constant
     */
    bytes32 public constant ZERO_BYTES32 = 0x0000000000000000000000000000000000000000000000000000000000000000;

    /* solhint-disable no-empty-blocks */
    constructor(address _registry) public Modifiers(_registry) {}

    /**
     * @inheritdoc IStrategyManager
     */
    function getWithdrawAllStepsCount(bytes32 _investStrategyhash) public view override returns (uint8) {
        return _getWithdrawAllStepsCount(_investStrategyhash);
    }

    /**
     * @inheritdoc IStrategyManager
     */
    function getDepositAllStepCount(bytes32 _investStrategyhash) public view override returns (uint8) {
        return _getDepositAllStepCount(_investStrategyhash);
    }

    /**
     * @inheritdoc IStrategyManager
     */
    function getClaimRewardStepsCount(bytes32 _investStrategyhash) public view override returns (uint8) {
        return _getClaimRewardStepsCount(_investStrategyhash);
    }

    /**
     * @inheritdoc IStrategyManager
     */
    function getHarvestRewardStepsCount(bytes32 _investStrategyhash) public view override returns (uint8) {
        return _getHarvestRewardStepsCount(_investStrategyhash);
    }

    /**
     * @inheritdoc IStrategyManager
     */
    function getBalanceInUnderlyingToken(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyhash
    ) public view override returns (uint256 _balance) {
        return _getBalanceInUnderlyingToken(_vault, _underlyingToken, _investStrategyhash);
    }

    /**
     * @inheritdoc IStrategyManager
     */
    function getPoolDepositAllCodes(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyhash,
        uint8 _stepIndex,
        uint8 _stepCount
    ) public view override returns (bytes[] memory _codes) {
        _codes = _getPoolDepositAllCodes(_vault, _underlyingToken, _investStrategyhash, _stepIndex, _stepCount);
    }

    /**
     * @inheritdoc IStrategyManager
     */
    function getPoolWithdrawAllCodes(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyhash,
        uint8 _stepIndex,
        uint8 _stepCount
    ) public view override returns (bytes[] memory _codes) {
        _codes = _getPoolWithdrawAllCodes(_vault, _underlyingToken, _investStrategyhash, _stepIndex, _stepCount);
    }

    /**
     * @inheritdoc IStrategyManager
     */
    function getPoolClaimAllRewardCodes(address payable _vault, bytes32 _investStrategyhash)
        public
        view
        override
        returns (bytes[] memory _codes)
    {
        _codes = _getPoolClaimAllRewardCodes(_vault, _investStrategyhash);
    }

    /**
     * @inheritdoc IStrategyManager
     */
    function getPoolHarvestAllRewardCodes(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyHash
    ) public view override returns (bytes[] memory _codes) {
        _codes = _getPoolHarvestAllRewardCodes(_vault, _underlyingToken, _investStrategyHash);
    }

    /**
     * @inheritdoc IStrategyManager
     */
    function getPoolHarvestSomeRewardCodes(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyHash,
        DataTypes.VaultRewardStrategy memory _vaultRewardStrategy
    ) public view override returns (bytes[] memory _codes) {
        _codes = _getPoolHarvestSomeRewardCodes(_vault, _underlyingToken, _investStrategyHash, _vaultRewardStrategy);
    }

    /**
     * @inheritdoc IStrategyManager
     */
    function getUserRewardCodes(address _vault, address _from) public view override returns (bytes[] memory _codes) {
        _codes = _getUserRewardCodes(_vault, _from);
    }

    /**
     * @inheritdoc IStrategyManager
     */
    function getRewardToken(bytes32 _investStrategyHash) public view override returns (address _rewardToken) {
        (, , _rewardToken) = _getLastStepLiquidityPool(_investStrategyHash);
    }

    /**
     * @inheritdoc IStrategyManager
     */
    function getSplitPaymentCode(
        DataTypes.TreasuryShare[] memory _treasuryShares,
        address _account,
        address _underlyingToken,
        uint256 _redeemAmountInToken
    ) public pure override returns (bytes[] memory _treasuryCodes) {
        _treasuryCodes = _getSplitPaymentCode(_treasuryShares, _account, _underlyingToken, _redeemAmountInToken);
    }

    function _getStrategySteps(bytes32 _hash) internal view returns (DataTypes.StrategyStep[] memory _strategySteps) {
        IVaultStepInvestStrategyDefinitionRegistry _vaultStepInvestStrategyDefinitionRegistry =
            IVaultStepInvestStrategyDefinitionRegistry(registryContract.getVaultStepInvestStrategyDefinitionRegistry());
        (, _strategySteps) = _vaultStepInvestStrategyDefinitionRegistry.getStrategy(_hash);
    }

    function _getPoolDepositAllCodes(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyhash,
        uint8 _stepIndex,
        uint8
    ) internal view returns (bytes[] memory _codes) {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_investStrategyhash);
        uint8 _subStepCounter = 0;
        for (uint8 _i = 0; _i < uint8(_strategySteps.length); _i++) {
            if (_strategySteps[_i].isBorrow) {
                if (_stepIndex == _subStepCounter) {
                    address _liquidityPool = _strategySteps[_i].pool;
                    address _adapter = registryContract.getLiquidityPoolToAdapter(_liquidityPool);
                    address[] memory _underlyingTokens = new address[](1);
                    _underlyingTokens[0] = _underlyingToken;
                    if (_i != 0) {
                        _underlyingTokens[0] = _strategySteps[_i - 1].outputToken;
                    }
                    _codes = IAdapter(_adapter).getDepositAllCodes(_vault, _underlyingTokens, _liquidityPool);
                    break;
                } // deposit at ith step
                if (_stepIndex == _subStepCounter + 1) {
                    address _liquidityPool = _strategySteps[_i].pool;
                    address _outputToken = _strategySteps[_i].outputToken; // borrow token
                    address _adapter = registryContract.getLiquidityPoolToAdapter(_liquidityPool);
                    address[] memory _underlyingTokens = new address[](1);
                    _underlyingTokens[0] = _underlyingToken;
                    if (_i != 0) {
                        _underlyingTokens[0] = _strategySteps[_i - 1].outputToken;
                    }
                    _codes = IAdapter(_adapter).getBorrowAllCodes(
                        _vault,
                        _underlyingTokens,
                        _liquidityPool,
                        _outputToken
                    );
                    break;
                } // borrow at ith step
                _subStepCounter += 2;
            } else {
                if (_stepIndex == _subStepCounter) {
                    address _liquidityPool = _strategySteps[_i].pool;
                    address _adapter = registryContract.getLiquidityPoolToAdapter(_liquidityPool);
                    address[] memory _underlyingTokens = new address[](1);
                    _underlyingTokens[0] = _underlyingToken;
                    if (_i != 0) {
                        _underlyingTokens[0] = _strategySteps[_i - 1].outputToken;
                    }
                    _codes = IAdapter(_adapter).getDepositAllCodes(_vault, _underlyingTokens, _liquidityPool);
                    break;
                } // deposit at ith step
                if (_stepIndex == (_subStepCounter + 1) && _i == uint8(_strategySteps.length - 1)) {
                    address _liquidityPool = _strategySteps[_i].pool;
                    address _adapter = registryContract.getLiquidityPoolToAdapter(_liquidityPool);
                    address[] memory _underlyingTokens = new address[](1);
                    if (_i != 0) {
                        _underlyingTokens[0] = _strategySteps[_i - 1].outputToken;
                    }
                    _codes = IAdapter(_adapter).getStakeAllCodes(_vault, _underlyingTokens, _liquidityPool);
                    break;
                } // stake at ith step
                _subStepCounter++;
            }
        }
    }

    function _getPoolWithdrawAllCodes(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyhash,
        uint8 _stepIndex,
        uint8 _stepCount
    ) internal view returns (bytes[] memory _codes) {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_investStrategyhash);
        uint8 _subStepCounter = _stepCount - 1;
        for (uint8 _i = 0; _i < uint8(_strategySteps.length); _i++) {
            uint8 _iterator = uint8(_strategySteps.length) - 1 - _i;
            if (_strategySteps[_iterator].isBorrow) {
                address _outputToken = _strategySteps[_iterator].outputToken;
                if (_stepIndex == _subStepCounter) {
                    _underlyingToken = (_iterator != 0) ? _strategySteps[_iterator - 1].outputToken : _underlyingToken;
                    address _adapter = registryContract.getLiquidityPoolToAdapter(_strategySteps[_iterator].pool);
                    address[] memory _underlyingTokens = new address[](1);
                    _underlyingTokens[0] = _underlyingToken;
                    _codes = IAdapter(_adapter).getRepayAndWithdrawAllCodes(
                        _vault,
                        _underlyingTokens,
                        _strategySteps[_iterator].pool,
                        _outputToken
                    );
                    break;
                } // repayAndWithdraw at ith step
                if (_stepIndex == _subStepCounter - 1) {
                    _underlyingToken = (_iterator != 0) ? _strategySteps[_iterator - 1].outputToken : _underlyingToken;
                    uint256 _borrowTokenRemainingAmount = IERC20(_outputToken).balanceOf(_vault);
                    IHarvestCodeProvider _harvestCodeProviderContract =
                        IHarvestCodeProvider(registryContract.getHarvestCodeProvider());
                    _codes = _harvestCodeProviderContract.getHarvestCodes(
                        _vault,
                        _outputToken,
                        _underlyingToken,
                        _borrowTokenRemainingAmount
                    );
                    break;
                } // swap at ith step
                _subStepCounter -= 2;
            } else {
                if (_stepIndex == _subStepCounter) {
                    _underlyingToken = (_iterator != 0) ? _strategySteps[_iterator - 1].outputToken : _underlyingToken;
                    address _adapter = registryContract.getLiquidityPoolToAdapter(_strategySteps[_iterator].pool);
                    address[] memory _underlyingTokens = new address[](1);
                    _underlyingTokens[0] = _underlyingToken;
                    _codes = (_iterator == uint8(_strategySteps.length) - 1 &&
                        IAdapter(_adapter).canStake(_strategySteps[_iterator].pool))
                        ? IAdapter(_adapter).getUnstakeAndWithdrawAllCodes(
                            _vault,
                            _underlyingTokens,
                            _strategySteps[_iterator].pool
                        )
                        : IAdapter(_adapter).getWithdrawAllCodes(
                            _vault,
                            _underlyingTokens,
                            _strategySteps[_iterator].pool
                        );
                    break;
                } // withdraw/unstakeAndWithdraw at _iterator th step
                _subStepCounter--;
            }
        }
    }

    function _getPoolHarvestAllRewardCodes(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyHash
    ) internal view returns (bytes[] memory _codes) {
        (address _liquidityPool, address _adapter, ) = _getLastStepLiquidityPool(_investStrategyHash);
        _codes = IAdapter(_adapter).getHarvestAllCodes(_vault, _underlyingToken, _liquidityPool);
    }

    function _getPoolHarvestSomeRewardCodes(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyHash,
        DataTypes.VaultRewardStrategy memory _vaultRewardStrategy
    ) internal view returns (bytes[] memory _codes) {
        (address _liquidityPool, address _adapter, address _rewardToken) =
            _getLastStepLiquidityPool(_investStrategyHash);
        //  get reward token balance for vault
        uint256 _rewardTokenBalance = IERC20(_rewardToken).balanceOf(_vault);
        //  calculation in basis points
        uint256 _harvestableRewardTokens =
            _vaultRewardStrategy.hold == uint256(0) && _vaultRewardStrategy.convert == uint256(0)
                ? _rewardTokenBalance
                : _rewardTokenBalance.mul(_vaultRewardStrategy.convert).div(10000);
        _codes = IAdapter(_adapter).getHarvestSomeCodes(
            _vault,
            _underlyingToken,
            _liquidityPool,
            _harvestableRewardTokens
        );
    }

    function _getPoolClaimAllRewardCodes(address payable _vault, bytes32 _investStrategyhash)
        internal
        view
        returns (bytes[] memory _codes)
    {
        (address _liquidityPool, address _adapter, ) = _getLastStepLiquidityPool(_investStrategyhash);
        _codes = IAdapter(_adapter).getClaimRewardTokenCode(_vault, _liquidityPool);
    }

    function _getBalanceInUnderlyingToken(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyhash
    ) internal view returns (uint256 _balance) {
        uint8 _steps = uint8(_getStrategySteps(_investStrategyhash).length);
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_investStrategyhash);
        _balance = 0;
        uint256 _outputTokenAmount = _balance;
        for (uint8 _i = 0; _i < _steps; _i++) {
            uint256 _iterator = _steps - 1 - _i;
            address _liquidityPool = _strategySteps[_iterator].pool;
            address _adapter = registryContract.getLiquidityPoolToAdapter(_liquidityPool);
            address _inputToken = _underlyingToken;
            if (_iterator != 0) {
                _inputToken = _strategySteps[_iterator - 1].outputToken;
            }
            if (!_strategySteps[_iterator].isBorrow) {
                if (_iterator == (_steps - 1)) {
                    if (IAdapter(_adapter).canStake(_liquidityPool)) {
                        _balance = IAdapter(_adapter).getAllAmountInTokenStake(_vault, _inputToken, _liquidityPool);
                    } else {
                        _balance = IAdapter(_adapter).getAllAmountInToken(_vault, _inputToken, _liquidityPool);
                    }
                } else {
                    _balance = IAdapter(_adapter).getSomeAmountInToken(_inputToken, _liquidityPool, _outputTokenAmount);
                }
            }
            // deposit
            else {
                address _borrowToken = _strategySteps[_iterator].outputToken;
                _balance = IAdapter(_adapter).getAllAmountInTokenBorrow(
                    _vault,
                    _inputToken,
                    _liquidityPool,
                    _borrowToken,
                    _outputTokenAmount
                );
            } // borrow
            _outputTokenAmount = _balance;
        }
    }

    function _getHarvestRewardStepsCount(bytes32 _investStrategyhash) internal view returns (uint8) {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_investStrategyhash);
        uint8 _lastStepIndex = uint8(_strategySteps.length) - 1;
        address _lastStepLiquidityPool = _strategySteps[_lastStepIndex].pool;
        address _lastStepOptyAdapter = registryContract.getLiquidityPoolToAdapter(_lastStepLiquidityPool);
        if (IAdapter(_lastStepOptyAdapter).getRewardToken(_lastStepLiquidityPool) != address(0)) {
            return uint8(1);
        }
        return uint8(0);
    }

    function _getClaimRewardStepsCount(bytes32 _investStrategyhash) internal view returns (uint8) {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_investStrategyhash);
        uint8 _lastStepIndex = uint8(_strategySteps.length) - 1;
        address _lastStepLiquidityPool = _strategySteps[_lastStepIndex].pool;
        address _lastStepOptyAdapter = registryContract.getLiquidityPoolToAdapter(_lastStepLiquidityPool);
        if (IAdapter(_lastStepOptyAdapter).getRewardToken(_lastStepLiquidityPool) != address(0)) {
            return uint8(1);
        }
        return uint8(0);
    }

    function _getDepositAllStepCount(bytes32 _investStrategyhash) internal view returns (uint8) {
        if (_investStrategyhash == ZERO_BYTES32) {
            return uint8(0);
        }
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_investStrategyhash);
        uint8 _strategyStepCount = uint8(_strategySteps.length);
        uint8 _lastStepIndex = _strategyStepCount - 1;
        address _lastStepLiquidityPool = _strategySteps[_lastStepIndex].pool;
        address _lastStepOptyAdapter = registryContract.getLiquidityPoolToAdapter(_lastStepLiquidityPool);
        if (IAdapter(_lastStepOptyAdapter).canStake(_lastStepLiquidityPool)) {
            return (_strategyStepCount + 1);
        }
        for (uint8 i = 0; i < uint8(_strategySteps.length); i++) {
            if (_strategySteps[i].isBorrow) {
                _strategyStepCount++;
            }
        }
        return _strategyStepCount;
    }

    function _getWithdrawAllStepsCount(bytes32 _investStrategyhash) internal view returns (uint8) {
        if (_investStrategyhash == ZERO_BYTES32) {
            return uint8(0);
        }
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_investStrategyhash);
        uint8 _steps = uint8(_strategySteps.length);
        for (uint8 _i = 0; _i < uint8(_strategySteps.length); _i++) {
            if (_strategySteps[_i].isBorrow) {
                _steps++;
            }
        }
        return _steps;
    }

    function _getSplitPaymentCode(
        DataTypes.TreasuryShare[] memory _treasuryShares,
        address _account,
        address _underlyingToken,
        uint256 _redeemAmountInToken
    ) internal pure returns (bytes[] memory _treasuryCodes) {
        uint256 _fee = 0;
        if (_redeemAmountInToken > 0) {
            uint8 _i;
            uint256 _treasurySharesLength = _treasuryShares.length;
            _treasuryCodes = new bytes[](_treasurySharesLength.add(1));
            if (_treasurySharesLength > 0) {
                for (_i = 0; _i < uint8(_treasurySharesLength); _i++) {
                    if (_treasuryShares[_i].treasury != address(0)) {
                        uint256 _share = _treasuryShares[_i].share;
                        uint256 _treasuryAccountFee = ((_redeemAmountInToken).mul(_share)).div(10000);
                        _treasuryCodes[_i] = abi.encode(
                            _underlyingToken,
                            abi.encodeWithSignature(
                                "transfer(address,uint256)",
                                _treasuryShares[_i].treasury,
                                uint256(_treasuryAccountFee)
                            )
                        );
                        _fee = _fee.add(_treasuryAccountFee);
                    }
                }
            }
            _treasuryCodes[_i] = abi.encode(
                _underlyingToken,
                abi.encodeWithSignature("transfer(address,uint256)", _account, _redeemAmountInToken.sub(_fee))
            );
        }
    }

    function _getUserRewardCodes(address _vault, address _from) internal view returns (bytes[] memory _codes) {
        _codes = new bytes[](4);
        address _optyMinter = registryContract.getOptyMinter();
        _codes[0] = abi.encode(
            _optyMinter,
            abi.encodeWithSignature("updateUserRewards(address,address)", _vault, _from)
        );
        _codes[1] = abi.encode(
            _optyMinter,
            abi.encodeWithSignature("updateOptyVaultRatePerSecondAndVaultToken(address)", _vault)
        );
        _codes[2] = abi.encode(_optyMinter, abi.encodeWithSignature("updateOptyVaultIndex(address)", _vault));
        _codes[3] = abi.encode(
            _optyMinter,
            abi.encodeWithSignature("updateUserStateInVault(address,address)", _vault, _from)
        );
    }

    function _getLastStepLiquidityPool(bytes32 _investStrategyHash)
        internal
        view
        returns (
            address _liquidityPool,
            address _adapter,
            address _rewardToken
        )
    {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_investStrategyHash);
        _liquidityPool = _strategySteps[_strategySteps.length - 1].pool;
        _adapter = registryContract.getLiquidityPoolToAdapter(_liquidityPool);
        _rewardToken = IAdapter(_adapter).getRewardToken(_liquidityPool);
    }
}
