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
import { IRegistry } from "../earn-protocol-configuration/contracts/interfaces/opty/IRegistry.sol";
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

    function getWithdrawStepsCount(IRegistry registryContract, bytes32 _investStrategyhash)
        internal
        view
        returns (uint256)
    {
        if (_investStrategyhash == Constants.ZERO_BYTES32) {
            return uint256(0);
        }
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(registryContract, _investStrategyhash);
        uint256 _steps = _strategySteps.length;
        for (uint256 _i = 0; _i < _strategySteps.length; _i++) {
            if (_strategySteps[_i].isBorrow) {
                _steps++;
            }
        }
        return _steps;
    }

    function getDepositStepsCount(IRegistry registryContract, bytes32 _investStrategyhash)
        internal
        view
        returns (uint256)
    {
        if (_investStrategyhash == Constants.ZERO_BYTES32) {
            return uint8(0);
        }
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(registryContract, _investStrategyhash);
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

    function getBalanceInUnderlyingToken(
        IRegistry registryContract,
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyhash
    ) internal view returns (uint256 _balance) {
        uint256 _steps = _getStrategySteps(registryContract, _investStrategyhash).length;
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(registryContract, _investStrategyhash);
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
        IRegistry registryContract,
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyhash,
        uint256 _stepIndex,
        uint256 _stepCount
    ) internal view returns (bytes[] memory _codes) {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(registryContract, _investStrategyhash);
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
        IRegistry registryContract,
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyhash,
        uint256 _depositAmountUT,
        uint256 _stepIndex,
        uint256 _stepCount
    ) internal view returns (bytes[] memory _codes) {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(registryContract, _investStrategyhash);
        uint8 _subStepCounter = 0;
        for (uint256 _i = 0; _i < _strategySteps.length; _i++) {
            if (_i != 0) {
                _underlyingToken = _strategySteps[_i - 1].outputToken;
                _depositAmountUT = IERC20(_underlyingToken).balanceOf(_vault);
            }
            // assuming borrow step is not happening
            if (_stepIndex == _subStepCounter) {
                address _liquidityPool = _strategySteps[_i].pool;
                address _adapter = registryContract.getLiquidityPoolToAdapter(_liquidityPool);
                _codes = IAdapterFull(_adapter).getDepositSomeCodes(
                    _vault,
                    _underlyingToken,
                    _liquidityPool,
                    _depositAmountUT
                );
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
        IRegistry registryContract,
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyhash,
        uint256 _stepIndex,
        uint256 _stepCount
    ) internal view returns (bytes[] memory _codes) {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(registryContract, _investStrategyhash);
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
        IRegistry registryContract,
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyhash,
        uint256 _redeemAmountLP,
        uint256 _stepIndex,
        uint256 _stepCount
    ) internal view returns (bytes[] memory _codes) {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(registryContract, _investStrategyhash);
        uint256 _subStepCounter = _stepCount - 1;
        for (uint256 _i = 0; _i < _strategySteps.length; _i++) {
            uint256 _iterator = _strategySteps.length - 1 - _i;
            // Assuming borrow strategy is not happening
            if (_stepIndex == _subStepCounter) {
                address _liquidityPool = _strategySteps[_iterator].pool;
                IAdapterFull _adapter = IAdapterFull(registryContract.getLiquidityPoolToAdapter(_liquidityPool));
                bool _canStake = _adapter.canStake(_liquidityPool);
                if (_iterator != 0) {
                    _underlyingToken = _strategySteps[_iterator - 1].outputToken;
                    _redeemAmountLP = _canStake
                        ? _adapter.getLiquidityPoolTokenBalanceStake(_vault, _liquidityPool)
                        : _adapter.getLiquidityPoolTokenBalance(_vault, _underlyingToken, _liquidityPool);
                }
                _codes = (_iterator == (_strategySteps.length - 1) && _canStake)
                    ? _adapter.getUnstakeAndWithdrawSomeCodes(_vault, _underlyingToken, _liquidityPool, _redeemAmountLP)
                    : _adapter.getWithdrawSomeCodes(_vault, _underlyingToken, _liquidityPool, _redeemAmountLP);
                break;
            } // withdraw/unstakeAndWithdraw at _iterator th step
            _subStepCounter--;
        }
    }

    function _getStrategySteps(IRegistry registryContract, bytes32 _hash)
        internal
        view
        returns (DataTypes.StrategyStep[] memory _strategySteps)
    {
        IInvestStrategyRegistry _investStrategyRegistry =
            IInvestStrategyRegistry(registryContract.getInvestStrategyRegistry());
        (, _strategySteps) = _investStrategyRegistry.getStrategy(_hash);
    }
}
