// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "./libraries/SafeERC20.sol";
import "./interfaces/opty/ICodeProvider.sol";
import "./controller/Registry.sol";
import "./controller/RegistryStorage.sol";
import "./libraries/Addresses.sol";
import "./utils/ERC20.sol";
import "./utils/Modifiers.sol";
import "./Gatherer.sol";

contract StrategyCodeProvider is Modifiers, Structs {
    using SafeERC20 for IERC20;
    using Address for address;

    Gatherer public gathererContract;

    constructor(address _registry, address _gatherer) public Modifiers(_registry) {
        setGatherer(_gatherer);
    }

    function getWithdrawAllStepsCount(bytes32 _hash) public view returns (uint8) {
        return _getWithdrawAllStepsCount(_hash);
    }

    function getDepositAllStepCount(bytes32 _hash) public view returns (uint8) {
        return _getDepositAllStepCount(_hash);
    }

    function getClaimRewardStepsCount(bytes32 _hash) public view returns (uint8) {
        return _getClaimRewardStepsCount(_hash);
    }

    function getHarvestRewardStepsCount(bytes32 _hash) public view returns (uint8) {
        return _getHarvestRewardStepsCount(_hash);
    }

    function getBalanceInToken(
        address payable _optyPool,
        address _underlyingToken,
        bytes32 _hash
    ) public view returns (uint256 _balance) {
        return _getBalanceInToken(_optyPool, _underlyingToken, _hash);
    }

    function getPoolDepositAllCodes(
        address payable _optyPool,
        address _underlyingToken,
        bytes32 _hash,
        uint8 _stepIndex,
        uint8 _stepCount
    ) public view returns (bytes[] memory _codes) {
        _codes = _getPoolDepositAllCodes(_optyPool, _underlyingToken, _hash, _stepIndex, _stepCount);
    }

    function getPoolWithdrawAllCodes(
        address payable _optyPool,
        address _underlyingToken,
        bytes32 _hash,
        uint8 _stepIndex,
        uint8 _stepCount
    ) public view returns (bytes[] memory _codes) {
        _codes = _getPoolWithdrawAllCodes(_optyPool, _underlyingToken, _hash, _stepIndex, _stepCount);
    }

    function getPoolClaimAllRewardCodes(
        address payable _optyPool,
        bytes32 _hash,
        uint8 _stepIndex,
        uint8 _stepCount
    ) public view returns (bytes[] memory _codes) {
        _codes = _getPoolClaimAllRewardCodes(_optyPool, _hash, _stepIndex, _stepCount);
    }

    function getPoolHarvestAllRewardCodes(
        address payable _optyPool,
        address _underlyingToken,
        bytes32 _hash,
        uint8 _stepIndex,
        uint8 _stepCount
    ) public view returns (bytes[] memory _codes) {
        _codes = _getPoolHarvestAllRewardCodes(_optyPool, _underlyingToken, _hash, _stepIndex, _stepCount);
    }

    function setGatherer(address _gatherer) public onlyOperator {
        gathererContract = Gatherer(_gatherer);
    }

    function _getStrategySteps(bytes32 _hash) internal view returns (StrategyStep[] memory _strategySteps) {
        (, _strategySteps) = registryContract.getStrategy(_hash);
    }

    function _getPoolDepositAllCodes(
        address payable _optyPool,
        address _underlyingToken,
        bytes32 _hash,
        uint8 _stepIndex,
        uint8
    ) internal view returns (bytes[] memory _codes) {
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

    function _getPoolWithdrawAllCodes(
        address payable _optyPool,
        address _underlyingToken,
        bytes32 _hash,
        uint8 _stepIndex,
        uint8 _stepCount
    ) internal view returns (bytes[] memory _codes) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        uint8 _subStepCounter = _stepCount - 1;
        for (uint8 _i = 0; _i < uint8(_strategySteps.length); _i++) {
            uint8 _iterator = uint8(_strategySteps.length) - 1 - _i;
            if (_strategySteps[_iterator].isBorrow) {
                address _outputToken = _strategySteps[_iterator].outputToken;
                if (_stepIndex == _subStepCounter) {
                    _underlyingToken = (_iterator != 0) ? _strategySteps[_iterator - 1].outputToken : _underlyingToken;
                    address _optyCodeProvider = registryContract.liquidityPoolToCodeProvider(_strategySteps[_iterator].pool);
                    address[] memory _underlyingTokens = new address[](1);
                    _underlyingTokens[0] = _underlyingToken;
                    _codes = ICodeProvider(_optyCodeProvider).getRepayAndWithdrawAllCodes(
                        _optyPool,
                        _underlyingTokens,
                        _strategySteps[_iterator].pool,
                        _outputToken
                    );
                    break;
                } // repayAndWithdraw at ith step
                if (_stepIndex == _subStepCounter - 1) {
                    _underlyingToken = (_iterator != 0) ? _strategySteps[_iterator - 1].outputToken : _underlyingToken;
                    uint256 _borrowTokenRemainingAmount = IERC20(_outputToken).balanceOf(_optyPool);
                    _codes = gathererContract.getHarvestCodes(_optyPool, _outputToken, _underlyingToken, _borrowTokenRemainingAmount);
                    break;
                } // swap at ith step
                _subStepCounter -= 2;
            } else {
                if (_stepIndex == _subStepCounter) {
                    _underlyingToken = (_iterator != 0) ? _strategySteps[_iterator - 1].outputToken : _underlyingToken;
                    address _optyCodeProvider = registryContract.liquidityPoolToCodeProvider(_strategySteps[_iterator].pool);
                    address[] memory _underlyingTokens = new address[](1);
                    _underlyingTokens[0] = _underlyingToken;
                    _codes = (_iterator == uint8(_strategySteps.length) - 1 &&
                        ICodeProvider(_optyCodeProvider).canStake(_strategySteps[_iterator].pool))
                        ? ICodeProvider(_optyCodeProvider).getUnstakeAndWithdrawAllCodes(
                            _optyPool,
                            _underlyingTokens,
                            _strategySteps[_iterator].pool
                        )
                        : ICodeProvider(_optyCodeProvider).getWithdrawAllCodes(_optyPool, _underlyingTokens, _strategySteps[_iterator].pool);
                    break;
                } // withdraw/unstakeAndWithdraw at _iterator th step
                _subStepCounter--;
            }
        }
    }

    function _getPoolHarvestAllRewardCodes(
        address payable _optyPool,
        address _underlyingToken,
        bytes32 _hash,
        uint8,
        uint8
    ) internal view returns (bytes[] memory _codes) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        address _liquidityPool = _strategySteps[_strategySteps.length - 1].pool;
        address _optyCodeProvider = registryContract.liquidityPoolToCodeProvider(_liquidityPool);
        _codes = ICodeProvider(_optyCodeProvider).getHarvestAllCodes(_optyPool, _underlyingToken, _liquidityPool);
    }

    function _getPoolClaimAllRewardCodes(
        address payable _optyPool,
        bytes32 _hash,
        uint8,
        uint8
    ) internal view returns (bytes[] memory _codes) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        address _liquidityPool = _strategySteps[_strategySteps.length - 1].pool;
        address _optyCodeProvider = registryContract.liquidityPoolToCodeProvider(_liquidityPool);
        _codes = ICodeProvider(_optyCodeProvider).getClaimRewardTokenCode(_optyPool, _liquidityPool);
    }

    function _getBalanceInToken(
        address payable _optyPool,
        address _underlyingToken,
        bytes32 _hash
    ) internal view returns (uint256 _balance) {
        uint8 _steps = uint8(_getStrategySteps(_hash).length);
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        _balance = 0;
        uint256 _outputTokenAmount = _balance;
        for (uint8 _i = 0; _i < _steps; _i++) {
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

    function _getHarvestRewardStepsCount(bytes32 _hash) internal view returns (uint8) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        uint8 _lastStepIndex = uint8(_strategySteps.length) - 1;
        address _lastStepLiquidityPool = _strategySteps[_lastStepIndex].pool;
        address _lastStepOptyCodeProvider = registryContract.liquidityPoolToCodeProvider(_lastStepLiquidityPool);
        if (ICodeProvider(_lastStepOptyCodeProvider).getRewardToken(_lastStepLiquidityPool) != address(0)) {
            return uint8(1);
        }
        return uint8(0);
    }

    function _getClaimRewardStepsCount(bytes32 _hash) internal view returns (uint8) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        uint8 _lastStepIndex = uint8(_strategySteps.length) - 1;
        address _lastStepLiquidityPool = _strategySteps[_lastStepIndex].pool;
        address _lastStepOptyCodeProvider = registryContract.liquidityPoolToCodeProvider(_lastStepLiquidityPool);
        if (ICodeProvider(_lastStepOptyCodeProvider).getRewardToken(_lastStepLiquidityPool) != address(0)) {
            return uint8(1);
        }
        return uint8(0);
    }

    function _getDepositAllStepCount(bytes32 _hash) internal view returns (uint8) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        uint8 _strategyStepCount = uint8(_strategySteps.length);
        uint8 _lastStepIndex = _strategyStepCount - 1;
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

    function _getWithdrawAllStepsCount(bytes32 _hash) internal view returns (uint8) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        uint8 _steps = uint8(_strategySteps.length);
        for (uint8 _i = 0; _i < uint8(_strategySteps.length); _i++) {
            if (_strategySteps[_i].isBorrow) {
                _steps++;
            }
        }
        return _steps;
    }
}
