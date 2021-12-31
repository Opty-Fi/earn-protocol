// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

//  libraries
import { DataTypes } from "../earn-protocol-configuration/contracts/libraries/types/DataTypes.sol";

// interfaces
import { IAdapterFull } from "@optyfi/defi-legos/interfaces/defiAdapters/contracts/IAdapterFull.sol";
import { IRegistry } from "../earn-protocol-configuration/contracts/interfaces/opty/IRegistry.sol";
import {
    IInvestStrategyRegistry
} from "../earn-protocol-configuration/contracts/interfaces/opty/IInvestStrategyRegistry.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title StrategyBuilder Library
 * @author Opty.fi
 * @notice Central processing unit of the earn protocol
 * @dev Contains the functionality for getting the codes for deposit/withdraw tokens,
 * claim/harvest reward tokens from the adapters and pass it onto vault contract
 */
library StrategyBuilder {
    function getWithdrawStepsCount(IRegistry registryContract, bytes32 _investStrategyhash)
        internal
        view
        returns (uint256)
    {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(registryContract, _investStrategyhash);
        uint256 _strategyStepCount = _strategySteps.length;
        uint256 _nStrategySteps = _strategyStepCount;
        return _getStrategySteps(registryContract, _investStrategyhash).length;
    }

    function getDepositStepsCount(IRegistry registryContract, bytes32 _investStrategyhash)
        internal
        view
        returns (uint256)
    {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(registryContract, _investStrategyhash);
        uint256 _strategyStepCount = _strategySteps.length;
        uint256 _lastStepIndex = _strategyStepCount - 1;
        address _lastStepLiquidityPool = _strategySteps[_lastStepIndex].pool;
        IAdapterFull _lastStepAdapter =
            IAdapterFull(registryContract.getLiquidityPoolToAdapter(_lastStepLiquidityPool));
        if (_lastStepAdapter.canStake(_lastStepLiquidityPool)) {
            return (_strategyStepCount + 1);
        }
        return _strategyStepCount;
    }

    function getBalanceInUnderlyingToken(
        IRegistry registryContract,
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyhash
    ) internal view returns (uint256 _balance) {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(registryContract, _investStrategyhash);
        uint256 _nStrategySteps = _strategySteps.length;
        uint256 _outputTokenAmount;
        for (uint256 _i = 0; _i < _nStrategySteps; _i++) {
            uint256 _iterator = _nStrategySteps - 1 - _i;
            address _liquidityPool = _strategySteps[_iterator].pool;
            IAdapterFull _adapter = IAdapterFull(registryContract.getLiquidityPoolToAdapter(_liquidityPool));
            address _inputToken = _underlyingToken;
            if (_iterator != 0) {
                _inputToken = _strategySteps[_iterator - 1].outputToken;
            }
            if (_iterator == (_nStrategySteps - 1)) {
                if (_adapter.canStake(_liquidityPool)) {
                    _balance = _adapter.getAllAmountInTokenStake(_vault, _inputToken, _liquidityPool);
                } else {
                    _balance = _adapter.getAllAmountInToken(_vault, _inputToken, _liquidityPool);
                }
            } else {
                _balance = _adapter.getSomeAmountInToken(_inputToken, _liquidityPool, _outputTokenAmount);
            }
            _outputTokenAmount = _balance;
        }
    }

    function getPoolDepositCodes(
        IRegistry registryContract,
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyhash,
        uint256 _depositAmountUT,
        uint256 _stepIndex,
        uint256 _strategyStepCount
    ) internal view returns (bytes[] memory _codes) {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(registryContract, _investStrategyhash);
        address _liquidityPool;
        IAdapterFull _adapter;
        if (_stepIndex == _strategyStepCount) {
            _liquidityPool = _strategySteps[_stepIndex - 1].pool;
            _adapter = IAdapterFull(registryContract.getLiquidityPoolToAdapter(_liquidityPool));
            _underlyingToken = _strategySteps[_stepIndex - 1].outputToken;
            _depositAmountUT = IERC20(_underlyingToken).balanceOf(_vault);
            _codes = _adapter.getStakeAllCodes(_vault, _underlyingToken, _liquidityPool);
        } else {
            _liquidityPool = _strategySteps[_stepIndex].pool;
            _adapter = IAdapterFull(registryContract.getLiquidityPoolToAdapter(_liquidityPool));
            if (_stepIndex != 0) {
                _underlyingToken = _strategySteps[_stepIndex - 1].outputToken;
                _depositAmountUT = IERC20(_underlyingToken).balanceOf(_vault);
            }
            _codes = _adapter.getDepositSomeCodes(_vault, _underlyingToken, _liquidityPool, _depositAmountUT);
        }
    }

    function getPoolWithdrawCodes(
        IRegistry registryContract,
        address payable _vault,
        address _underlyingToken,
        bytes32 _investStrategyhash,
        uint256 _redeemAmountLP,
        uint256 _stepIndex,
        uint256 _strategyStepCount
    ) internal view returns (bytes[] memory _codes) {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(registryContract, _investStrategyhash);
        address _liquidityPool = _strategySteps[_stepIndex].pool;
        IAdapterFull _adapter = IAdapterFull(registryContract.getLiquidityPoolToAdapter(_liquidityPool));
        if (_stepIndex != 0) {
            _underlyingToken = _strategySteps[_stepIndex - 1].outputToken;
        }
        if (_stepIndex != (_strategyStepCount - 1)) {
            _redeemAmountLP = IERC20(_underlyingToken).balanceOf(_vault);
        }
        _codes = (_stepIndex == (_strategyStepCount - 1) && _adapter.canStake(_liquidityPool))
            ? _adapter.getUnstakeAndWithdrawSomeCodes(_vault, _underlyingToken, _liquidityPool, _redeemAmountLP)
            : _adapter.getWithdrawSomeCodes(_vault, _underlyingToken, _liquidityPool, _redeemAmountLP);
    }

    function _getStrategySteps(IRegistry registryContract, bytes32 _investStrategyhash)
        internal
        view
        returns (DataTypes.StrategyStep[] memory _strategySteps)
    {
        (, _strategySteps) = IInvestStrategyRegistry(registryContract.getInvestStrategyRegistry()).getStrategy(
            _investStrategyhash
        );
    }
}
