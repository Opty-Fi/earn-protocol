// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

//  libraries
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { DataTypes } from "../earn-protocol-configuration/contracts/libraries/types/DataTypes.sol";

//  helper contracts
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

// interfaces
import { IAdapterFull } from "@optyfi/defi-legos/interfaces/defiAdapters/contracts/IAdapterFull.sol";
import {
    IInvestStrategyRegistry
} from "../earn-protocol-configuration/contracts/interfaces/opty/IInvestStrategyRegistry.sol";
import { IHarvestCodeProvider } from "../team-defi-adapters/contracts/1_ethereum/interfaces/IHarvestCodeProvider.sol";
import { Constants } from "../../utils/Constants.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title StrategyManager Library
 * @author Opty.fi
 * @notice Central processing unit of the earn protocol
 * @dev Contains the functionality for getting the codes for deposit/withdraw tokens,
 * claim/harvest reward tokens from the adapters and pass it onto vault contract
 */
library StrategyManagerLib {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    function getWithdrawStepsCount(bytes32 _investStrategyhash) internal view override returns (uint256) {
        if (_investStrategyhash == Constants.ZERO_BYTES32) {
            return uint256(0);
        }
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_investStrategyhash);
        uint256 _steps = _strategySteps.length;
        for (uint256 _i = 0; _i < _strategySteps.length; _i++) {
            if (_strategySteps[_i].isBorrow) {
                _steps++;
            }
        }
        return _steps;
    }

    function getDepositStepsCount(bytes32 _investStrategyhash) internal view override returns (uint256) {
        if (_investStrategyhash == Constants.ZERO_BYTES32) {
            return uint8(0);
        }
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_investStrategyhash);
        uint256 _strategyStepCount = _strategySteps.length;
        uint256 _lastStepIndex = _strategyStepCount - 1;
        address _lastStepLiquidityPool = _strategySteps[_lastStepIndex].pool;
        address _lastStepOptyAdapter = registryContract.getLiquidityPoolToAdapter(_lastStepLiquidityPool);
        if (IAdapterFull(_lastStepOptyAdapter).canStake(_lastStepLiquidityPool)) {
            return (_strategyStepCount + 1);
        }
        for (uint256 i = 0; i < _strategySteps.length; i++) {
            if (_strategySteps[i].isBorrow) {
                _strategyStepCount++;
            }
        }
        return _strategyStepCount;
    }

    function getClaimRewardStepsCount(bytes32 _investStrategyhash) internal view override returns (uint8) {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_investStrategyhash);
        uint256 _lastStepIndex = _strategySteps.length - 1;
        address _lastStepLiquidityPool = _strategySteps[_lastStepIndex].pool;
        address _lastStepOptyAdapter = registryContract.getLiquidityPoolToAdapter(_lastStepLiquidityPool);
        if (IAdapterFull(_lastStepOptyAdapter).getRewardToken(_lastStepLiquidityPool) != address(0)) {
            return uint8(1);
        }
        return uint8(0);
    }

    function getBalanceInUnderlyingToken(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyhash
    ) internal view override returns (uint256) {
        uint256 _steps = _getStrategySteps(_investStrategyhash).length;
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_investStrategyhash);
        _balance = 0;
        uint256 _outputTokenAmount = _balance;
        for (uint256 _i = 0; _i < _steps; _i++) {
            uint256 _iterator = _steps - 1 - _i;
            address _liquidityPool = _strategySteps[_iterator].pool;
            address _adapter = registryContract.getLiquidityPoolToAdapter(_liquidityPool);
            address _inputToken = _underlyingToken;
            if (_iterator != 0) {
                _inputToken = _strategySteps[_iterator - 1].outputToken;
            }
            if (!_strategySteps[_iterator].isBorrow) {
                if (_iterator == (_steps - 1)) {
                    if (IAdapterFull(_adapter).canStake(_liquidityPool)) {
                        _balance = IAdapterFull(_adapter).getAllAmountInTokenStake(_vault, _inputToken, _liquidityPool);
                    } else {
                        _balance = IAdapterFull(_adapter).getAllAmountInToken(_vault, _inputToken, _liquidityPool);
                    }
                } else {
                    _balance = IAdapterFull(_adapter).getSomeAmountInToken(
                        _inputToken,
                        _liquidityPool,
                        _outputTokenAmount
                    );
                }
            }
            // deposit
            else {
                address _borrowToken = _strategySteps[_iterator].outputToken;
                _balance = IAdapterFull(_adapter).getAllAmountInTokenBorrow(
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

    function getPoolDepositAllCodes(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyhash,
        uint256 _stepIndex,
        uint256 _stepCount
    ) internal view override returns (bytes[] memory) {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_investStrategyhash);
        uint8 _subStepCounter = 0;
        for (uint256 _i = 0; _i < _strategySteps.length; _i++) {
            if (_i != 0) {
                _underlyingToken = _strategySteps[_i - 1].outputToken;
            }
            if (_strategySteps[_i].isBorrow) {
                if (_stepIndex == _subStepCounter) {
                    address _liquidityPool = _strategySteps[_i].pool;
                    address _adapter = registryContract.getLiquidityPoolToAdapter(_liquidityPool);
                    _codes = IAdapterFull(_adapter).getDepositAllCodes(_vault, _underlyingToken, _liquidityPool);
                    break;
                } // deposit at ith step
                if (_stepIndex == _subStepCounter + 1) {
                    address _liquidityPool = _strategySteps[_i].pool;
                    address _outputToken = _strategySteps[_i].outputToken; // borrow token
                    address _adapter = registryContract.getLiquidityPoolToAdapter(_liquidityPool);
                    _codes = IAdapterFull(_adapter).getBorrowAllCodes(
                        _vault,
                        _underlyingToken,
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
                    _codes = IAdapterFull(_adapter).getDepositAllCodes(_vault, _underlyingToken, _liquidityPool);
                    break;
                } // deposit at ith step
                if (_stepIndex == (_subStepCounter + 1) && _i == (_strategySteps.length - 1)) {
                    address _liquidityPool = _strategySteps[_i].pool;
                    address _adapter = registryContract.getLiquidityPoolToAdapter(_liquidityPool);
                    _codes = IAdapterFull(_adapter).getStakeAllCodes(_vault, _underlyingToken, _liquidityPool);
                    break;
                } // stake at ith step
                _subStepCounter++;
            }
        }
    }

    function getPoolDepositSomeCodes(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyhash,
        uint256 _depositAmountUT,
        uint256 _stepIndex,
        uint256 _stepCount
    ) internal view override returns (bytes[] memory) {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_investStrategyhash);
        uint8 _subStepCounter = 0;
        for (uint256 _i = 0; _i < _strategySteps.length; _i++) {
            if (_i != 0) {
                _underlyingToken = _strategySteps[_i - 1].outputToken;
            }
            // assuming borrow step is not happening
            if (_stepIndex == _subStepCounter) {
                address _liquidityPool = _strategySteps[_i].pool;
                address _adapter = registryContract.getLiquidityPoolToAdapter(_liquidityPool);
                _codes = _stepIndex == 0
                    ? IAdapterFull(_adapter).getDepositSomeCodes(
                        _vault,
                        _underlyingToken,
                        _liquidityPool,
                        _depositAmountUT
                    )
                    : IAdapterFull(_adapter).getDepositAllCodes(_vault, _underlyingToken, _liquidityPool);
                break;
            } // deposit at ith step
            if (_stepIndex == (_subStepCounter + 1) && _i == (_strategySteps.length - 1)) {
                address _liquidityPool = _strategySteps[_i].pool;
                address _adapter = registryContract.getLiquidityPoolToAdapter(_liquidityPool);
                _codes = IAdapterFull(_adapter).getStakeAllCodes(_vault, _underlyingToken, _liquidityPool);
                break;
            } // stake at ith step
            _subStepCounter++;
        }
    }

    function getPoolWithdrawAllCodes(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyhash,
        uint256 _stepIndex,
        uint256 _stepCount
    ) internal view override returns (bytes[] memory) {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_investStrategyhash);
        uint256 _subStepCounter = _stepCount - 1;
        for (uint256 _i = 0; _i < _strategySteps.length; _i++) {
            uint256 _iterator = _strategySteps.length - 1 - _i;
            if (_strategySteps[_iterator].isBorrow) {
                address _outputToken = _strategySteps[_iterator].outputToken;
                if (_stepIndex == _subStepCounter) {
                    _underlyingToken = (_iterator != 0) ? _strategySteps[_iterator - 1].outputToken : _underlyingToken;
                    address _adapter = registryContract.getLiquidityPoolToAdapter(_strategySteps[_iterator].pool);
                    _codes = IAdapterFull(_adapter).getRepayAndWithdrawAllCodes(
                        _vault,
                        _underlyingToken,
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
                    _codes = (_iterator == (_strategySteps.length - 1) &&
                        IAdapterFull(_adapter).canStake(_strategySteps[_iterator].pool))
                        ? IAdapterFull(_adapter).getUnstakeAndWithdrawAllCodes(
                            _vault,
                            _underlyingToken,
                            _strategySteps[_iterator].pool
                        )
                        : IAdapterFull(_adapter).getWithdrawAllCodes(
                            _vault,
                            _underlyingToken,
                            _strategySteps[_iterator].pool
                        );
                    break;
                } // withdraw/unstakeAndWithdraw at _iterator th step
                _subStepCounter--;
            }
        }
    }

    function getPoolWithdrawSomeCodes(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyhash,
        uint256 _redeemAmountLP,
        uint256 _stepIndex,
        uint256 _stepCount
    ) internal view override returns (bytes[] memory) {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_investStrategyhash);
        uint256 _subStepCounter = _stepCount - 1;
        for (uint256 _i = 0; _i < _strategySteps.length; _i++) {
            uint256 _iterator = _strategySteps.length - 1 - _i;
            // Assuming borrow strategy is not happening
            if (_stepIndex == _subStepCounter) {
                _underlyingToken = (_iterator != 0) ? _strategySteps[_iterator - 1].outputToken : _underlyingToken;
                address _adapter = registryContract.getLiquidityPoolToAdapter(_strategySteps[_iterator].pool);
                _codes = (_iterator == (_strategySteps.length - 1) &&
                    IAdapterFull(_adapter).canStake(_strategySteps[_iterator].pool))
                    ? IAdapterFull(_adapter).getUnstakeAndWithdrawSomeCodes(
                        _vault,
                        _underlyingToken,
                        _strategySteps[_iterator].pool,
                        _redeemAmountLP
                    )
                    : IAdapterFull(_adapter).getWithdrawSomeCodes(
                        _vault,
                        _underlyingToken,
                        _strategySteps[_iterator].pool,
                        _redeemAmountLP
                    );
                break;
            } // withdraw/unstakeAndWithdraw at _iterator th step
            _subStepCounter--;
        }
    }

    function getPoolClaimAllRewardCodes(address payable _vault, bytes32 _investStrategyhash)
        internal
        view
        override
        returns (bytes[] memory)
    {
        return _getPoolClaimAllRewardCodes(_vault, _investStrategyhash);
    }

    function getPoolHarvestAllRewardCodes(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyHash
    ) internal view override returns (bytes[] memory) {
        return _getPoolHarvestAllRewardCodes(_vault, _underlyingToken, _investStrategyHash);
    }

    function getPoolHarvestSomeRewardCodes(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyHash,
        DataTypes.VaultRewardStrategy memory _vaultRewardStrategy
    ) internal view override returns (bytes[] memory) {
        return _getPoolHarvestSomeRewardCodes(_vault, _underlyingToken, _investStrategyHash, _vaultRewardStrategy);
    }

    /**
     * @inheritdoc IStrategyManager
     */
    function getAddLiquidityCodes(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyHash
    ) internal view override returns (bytes[] memory) {
        return _getAddLiquidityCodes(_vault, _underlyingToken, _investStrategyHash);
    }

    /**
     * @inheritdoc IStrategyManager
     */
    function getRewardToken(bytes32 _investStrategyHash) internal view override returns (address _rewardToken) {
        (, , _rewardToken) = _getLastStepLiquidityPool(_investStrategyHash);
    }

    function _getStrategySteps(bytes32 _hash) internal view returns (DataTypes.StrategyStep[] memory _strategySteps) {
        IInvestStrategyRegistry _investStrategyRegistry =
            IInvestStrategyRegistry(registryContract.getInvestStrategyRegistry());
        (, _strategySteps) = _investStrategyRegistry.getStrategy(_hash);
    }

    function _getPoolHarvestAllRewardCodes(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyHash
    ) internal view returns (bytes[] memory) {
        (address _liquidityPool, address _adapter, ) = _getLastStepLiquidityPool(_investStrategyHash);
        return IAdapterFull(_adapter).getHarvestAllCodes(_vault, _underlyingToken, _liquidityPool);
    }

    function _getPoolHarvestSomeRewardCodes(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyHash,
        DataTypes.VaultRewardStrategy memory _vaultRewardStrategy
    ) internal view returns (bytes[] memory) {
        (address _liquidityPool, address _adapter, address _rewardToken) =
            _getLastStepLiquidityPool(_investStrategyHash);
        //  get reward token balance for vault
        uint256 _rewardTokenBalance = IERC20(_rewardToken).balanceOf(_vault);
        //  calculation in basis points
        uint256 _harvestableRewardTokens =
            _vaultRewardStrategy.hold == uint256(0) && _vaultRewardStrategy.convert == uint256(0)
                ? _rewardTokenBalance
                : _rewardTokenBalance.mul(_vaultRewardStrategy.convert).div(10000);
        return
            IAdapterFull(_adapter).getHarvestSomeCodes(
                _vault,
                _underlyingToken,
                _liquidityPool,
                _harvestableRewardTokens
            );
    }

    function _getAddLiquidityCodes(
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyHash
    ) internal view returns (bytes[] memory) {
        (, address _adapter, ) = _getLastStepLiquidityPool(_investStrategyHash);
        return IAdapterFull(_adapter).getAddLiquidityCodes(_vault, _underlyingToken);
    }

    function _getPoolClaimAllRewardCodes(address payable _vault, bytes32 _investStrategyhash)
        internal
        view
        returns (bytes[] memory)
    {
        (address _liquidityPool, address _adapter, ) = _getLastStepLiquidityPool(_investStrategyhash);
        return IAdapterFull(_adapter).getClaimRewardTokenCode(_vault, _liquidityPool);
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
        _rewardToken = IAdapterFull(_adapter).getRewardToken(_liquidityPool);
    }
}
