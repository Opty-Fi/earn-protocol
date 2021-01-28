// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "./libraries/SafeERC20.sol";
import "./interfaces/opty/ICodeProvider.sol";
import "./Registry.sol";
import "./libraries/Addresses.sol";
import "./utils/ERC20.sol";
import "./utils/Modifiers.sol";

contract StrategyCodeProvider is Modifiers {
    using SafeERC20 for IERC20;
    using Address for address;

    constructor(address _registry) public Modifiers(_registry) {}

    function getWithdrawAllStepsCount(bytes32 _hash) public view returns (uint256) {
        return _getStrategySteps(_hash).length;
    }

    function getDepositAllStepCount(bytes32 _hash) public view returns (uint256) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        uint256 _strategyStepCount = _strategySteps.length;
        uint256 _lastStepIndex = _strategyStepCount - 1;
        address _lastStepLiquidityPool = _strategySteps[_lastStepIndex].pool;
        address _lastStepOptyCodeProvider = registryContract.liquidityPoolToCodeProvider(_lastStepLiquidityPool);
        if (ICodeProvider(_lastStepOptyCodeProvider).canStake(_lastStepLiquidityPool)) {
            return (_strategyStepCount + 1);
        }
        for (uint8 i = 0; i < uint8(_strategySteps.length); i++) {
            if (_strategySteps[i].isBorrow) {
                _strategyStepCount++;
            }
        }
        return _strategyStepCount;
    }

    function getClaimRewardStepsCount(bytes32 _hash) public view returns (uint256) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        uint256 _lastStepIndex = _strategySteps.length - 1;
        address _lastStepLiquidityPool = _strategySteps[_lastStepIndex].pool;
        address _lastStepOptyCodeProvider = registryContract.liquidityPoolToCodeProvider(_lastStepLiquidityPool);
        if (ICodeProvider(_lastStepOptyCodeProvider).getRewardToken(_lastStepLiquidityPool) != address(0)) {
            return uint256(1);
        }
        return uint256(0);
    }

    function getHarvestRewardStepsCount(bytes32 _hash) public view returns (uint256) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        uint256 _lastStepIndex = _strategySteps.length - 1;
        address _lastStepLiquidityPool = _strategySteps[_lastStepIndex].pool;
        address _lastStepOptyCodeProvider = registryContract.liquidityPoolToCodeProvider(_lastStepLiquidityPool);
        if (ICodeProvider(_lastStepOptyCodeProvider).getRewardToken(_lastStepLiquidityPool) != address(0)) {
            return uint256(1);
        }
        return uint256(0);
    }

    function getBalanceInToken(
        address payable _optyPool,
        address _underlyingToken,
        bytes32 _hash
    ) public view returns (uint256 _balance) {
        uint256 _steps = _getStrategySteps(_hash).length;
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        _balance = 0;
        uint256 _outputTokenAmount = _balance;
        for (uint256 _i = 0; _i < _steps; _i++) {
            uint256 _iterator = _steps - 1 - _i;
            if (!_strategySteps[_iterator].isBorrow) {
                address _liquidityPool = _strategySteps[_iterator].pool;
                address _optyCodeProvider = registryContract.liquidityPoolToCodeProvider(_liquidityPool);
                address _inputToken = _underlyingToken;
                if (_iterator != 0) {
                    _inputToken = _strategySteps[_iterator - 1].outputToken;
                }
                if (_iterator == (_steps - 1)) {
                    if (ICodeProvider(_optyCodeProvider).canStake(_liquidityPool)) {
                        _balance = ICodeProvider(_optyCodeProvider).getAllAmountInTokenStake(_optyPool, _inputToken, _liquidityPool);
                    } else {
                        _balance = ICodeProvider(_optyCodeProvider).getAllAmountInToken(_optyPool, _inputToken, _liquidityPool);
                    }
                } else {
                    _balance = ICodeProvider(_optyCodeProvider).getSomeAmountInToken(_inputToken, _liquidityPool, _outputTokenAmount);
                }
            } else {
                // borrow
            }
            _outputTokenAmount = _balance;
        }
    }

    function getPoolDepositAllCodes(
        address payable _optyPool,
        address _underlyingToken,
        bytes32 _hash,
        uint256 _stepIndex
    ) public view returns (bytes[] memory _codes) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        uint8 _subStepCounter = 0;
        for (uint8 _i = 0; _i < uint8(_strategySteps.length); _i++) {
            if (_strategySteps[_i].isBorrow) {
                if (_stepIndex == _subStepCounter) {
                    address _liquidityPool = _strategySteps[_i].pool;
                    address _optyCodeProvider = registryContract.liquidityPoolToCodeProvider(_liquidityPool);
                    address[] memory _underlyingTokens = new address[](1);
                    _underlyingTokens[0] = _underlyingToken;
                    if (_i != 0) {
                        _underlyingTokens[0] = _strategySteps[_i - 1].outputToken;
                    }
                    _codes = ICodeProvider(_optyCodeProvider).getDepositAllCodes(_optyPool, _underlyingTokens, _liquidityPool);
                    break;
                } // deposit at ith step
                if (_stepIndex == _subStepCounter + 1) {
                    address _liquidityPool = _strategySteps[_i].pool;
                    address _outputToken = _strategySteps[_i].outputToken; // borrow token
                    address _optyCodeProvider = registryContract.liquidityPoolToCodeProvider(_liquidityPool);
                    address[] memory _underlyingTokens = new address[](1);
                    _underlyingTokens[0] = _underlyingToken;
                    if (_i != 0) {
                        _underlyingTokens[0] = _strategySteps[_i - 1].outputToken;
                    }
                    _codes = ICodeProvider(_optyCodeProvider).getBorrowAllCodes(_optyPool, _underlyingTokens, _liquidityPool, _outputToken);
                    break;
                } // borrow at ith step
                _subStepCounter += 2;
            } else {
                if (_stepIndex == _subStepCounter) {
                    address _liquidityPool = _strategySteps[_i].pool;
                    address _optyCodeProvider = registryContract.liquidityPoolToCodeProvider(_liquidityPool);
                    address[] memory _underlyingTokens = new address[](1);
                    _underlyingTokens[0] = _underlyingToken;
                    if (_i != 0) {
                        _underlyingTokens[0] = _strategySteps[_i - 1].outputToken;
                    }
                    _codes = ICodeProvider(_optyCodeProvider).getDepositAllCodes(_optyPool, _underlyingTokens, _liquidityPool);
                    break;
                } // deposit at ith step
                if (_stepIndex == (_subStepCounter + 1) && _i == uint8(_strategySteps.length - 1)) {
                    address _liquidityPool = _strategySteps[_i].pool;
                    address _optyCodeProvider = registryContract.liquidityPoolToCodeProvider(_liquidityPool);
                    address[] memory _underlyingTokens = new address[](1);
                    if (_i != 0) {
                        _underlyingTokens[0] = _strategySteps[_i - 1].outputToken;
                    }
                    _codes = ICodeProvider(_optyCodeProvider).getStakeAllCodes(_optyPool, _underlyingTokens, _liquidityPool);
                    break;
                } // stake at ith step
                _subStepCounter++;
            }
        }
    }

    function getPoolWithdrawAllCodes(
        address payable _optyPool,
        address _underlyingToken,
        bytes32 _hash,
        uint256 _stepIndex
    ) public view returns (bytes[] memory _codes) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        if (!_strategySteps[_stepIndex].isBorrow) {
            if (_stepIndex != 0) {
                _underlyingToken = _strategySteps[_stepIndex - 1].outputToken;
            }
            address[] memory _underlyingTokens = new address[](1);
            _underlyingTokens[0] = _underlyingToken;
            address _liquidityPool = _strategySteps[_stepIndex].pool;
            address _optyCodeProvider = registryContract.liquidityPoolToCodeProvider(_liquidityPool);
            if (_stepIndex == (_strategySteps.length - 1) && ICodeProvider(_optyCodeProvider).canStake(_liquidityPool)) {
                _codes = ICodeProvider(_optyCodeProvider).getUnstakeAndWithdrawAllCodes(_optyPool, _underlyingTokens, _liquidityPool);
            } else {
                _codes = ICodeProvider(_optyCodeProvider).getWithdrawAllCodes(_optyPool, _underlyingTokens, _liquidityPool);
            }
        } else {
            if (_stepIndex != 0) {
                _underlyingToken = _strategySteps[_stepIndex - 1].outputToken;
            }
            address[] memory _underlyingTokens = new address[](1);
            _underlyingTokens[0] = _underlyingToken;
            address _liquidityPool = _strategySteps[_stepIndex].pool;
            address _outputToken = _strategySteps[_stepIndex].outputToken;
            address _optyCodeProvider = registryContract.liquidityPoolToCodeProvider(_liquidityPool);
            _codes = ICodeProvider(_optyCodeProvider).getRepayAndWithdrawAllCodes(_optyPool, _underlyingTokens, _liquidityPool, _outputToken);
        }
    }

    function getPoolClaimAllRewardCodes(
        address payable _optyPool,
        bytes32 _hash,
        uint256
    ) public view returns (bytes[] memory _codes) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        address _liquidityPool = _strategySteps[_strategySteps.length - 1].pool;
        address _optyCodeProvider = registryContract.liquidityPoolToCodeProvider(_liquidityPool);
        _codes = ICodeProvider(_optyCodeProvider).getClaimRewardTokenCode(_optyPool, _liquidityPool);
    }

    function getPoolHarvestAllRewardCodes(
        address payable _optyPool,
        address _underlyingToken,
        bytes32 _hash,
        uint256
    ) public view returns (bytes[] memory _codes) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        address _liquidityPool = _strategySteps[_strategySteps.length - 1].pool;
        address _optyCodeProvider = registryContract.liquidityPoolToCodeProvider(_liquidityPool);
        _codes = ICodeProvider(_optyCodeProvider).getHarvestAllCodes(_optyPool, _underlyingToken, _liquidityPool);
    }

    function _getStrategySteps(bytes32 _hash) internal view returns (StrategyStep[] memory _strategySteps) {
        (, , , , _strategySteps) = registryContract.getStrategy(_hash);
    }
}
