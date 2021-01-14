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

    constructor(address _registry) public Modifiers(_registry) {
    }
    
    function getWithdrawAllStepsCount(bytes32 _hash) public view returns(uint) {
        return _getStrategySteps(_hash).length;
    }
    
    function getDepositAllStepCount(bytes32 _hash) public view returns(uint) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        uint _strategyStepCount = _strategySteps.length;
        uint _lastStepIndex = _strategyStepCount - 1;
        address _liquidityPool = _strategySteps[_lastStepIndex].pool;
        address _optyCodeProvider = registryContract.liquidityPoolToCodeProvider(_liquidityPool);
        if (ICodeProvider(_optyCodeProvider).canStake(_liquidityPool)) {
            return (_strategyStepCount + 1);
        }
        return _strategyStepCount;
    }
    
    function getClaimRewardStepsCount(bytes32 _hash) public view returns(uint) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        uint _lastStepIndex = _strategySteps.length - 1;
        address _liquidityPool = _strategySteps[_lastStepIndex].pool;
        address _optyCodeProvider = registryContract.liquidityPoolToCodeProvider(_liquidityPool);
        if(ICodeProvider(_optyCodeProvider).getRewardToken(_liquidityPool) != address(0)) {
            return uint(1);
        }
        return uint(0);
    }
    
    function getHarvestRewardStepsCount(bytes32 _hash) public view returns(uint) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        uint _lastStepIndex = _strategySteps.length - 1;
        address _liquidityPool = _strategySteps[_lastStepIndex].pool;
        address _optyCodeProvider = registryContract.liquidityPoolToCodeProvider(_liquidityPool);
        if(ICodeProvider(_optyCodeProvider).getRewardToken(_liquidityPool) != address(0)) {
            return uint(1);
        }
        return uint(0);
    }
    
    function getBalanceInToken(address _optyPool, address _underlyingToken, bytes32 _hash) public view returns(uint _balance) {
        uint _steps = _getStrategySteps(_hash).length;
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        _balance = 0;
        uint _outputTokenAmount = _balance;
        for(uint _i = 0 ; _i < _steps ; _i++) {
            uint _iterator = _steps - 1 - _i;
            if(!_strategySteps[_iterator].isBorrow) {
                address _liquidityPool = _strategySteps[_iterator].pool;
                address _optyCodeProvider = registryContract.liquidityPoolToCodeProvider(_liquidityPool);
                address _inputToken = _underlyingToken;
                if(_iterator != 0) {
                    _inputToken = _strategySteps[_iterator - 1].outputToken;
                }
                if(_iterator == (_steps - 1)) {
                    if(ICodeProvider(_optyCodeProvider).canStake(_liquidityPool)) {
                        _balance = ICodeProvider(_optyCodeProvider).getAllAmountInTokenStake(_optyPool,_inputToken, _liquidityPool);
                    } else {
                        _balance = ICodeProvider(_optyCodeProvider).getAllAmountInToken(_optyPool,_inputToken, _liquidityPool);
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
    
    function getPoolDepositAllCodes(address _optyPool, address _underlyingToken, bytes32 _hash, uint _stepIndex) public view returns(bytes[] memory _codes) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        uint _actualStepIndex = _stepIndex;
        if(_stepIndex == _strategySteps.length) {
            _actualStepIndex = _stepIndex - 1;
        }
        if(!_strategySteps[_actualStepIndex].isBorrow) {
            address _liquidityPool = _strategySteps[_actualStepIndex].pool;
            address _outputToken = _strategySteps[_actualStepIndex].outputToken;
            address _optyCodeProvider = registryContract.liquidityPoolToCodeProvider(_liquidityPool);
            address[] memory _underlyingTokens = ICodeProvider(_optyCodeProvider).getUnderlyingTokens(_liquidityPool, _outputToken);
            if(_actualStepIndex != 0) {
                _underlyingToken = _strategySteps[_actualStepIndex - 1].outputToken;
            }
            // If step index is equal to length of strategy steps, it means staking is required for last step
            if(_stepIndex == _strategySteps.length) {
                _codes = ICodeProvider(_optyCodeProvider).getStakeAllCodes(_optyPool, _underlyingTokens, _liquidityPool);
            } else {
            _codes = ICodeProvider(_optyCodeProvider).getDepositAllCodes(_optyPool, _underlyingTokens, _liquidityPool);
            }
        } else {
            // borrow
        }
    }
    
    function getPoolWithdrawAllCodes(address _optyPool, address _underlyingToken, bytes32 _hash, uint _stepIndex) public view returns(bytes[] memory _codes) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        if(!_strategySteps[_stepIndex].isBorrow) {
            if(_stepIndex != 0) {
                _underlyingToken = _strategySteps[_stepIndex-1].outputToken;
            }
            address[] memory _underlyingTokens = new address[](1);
            _underlyingTokens[0] = _underlyingToken;
            address _liquidityPool = _strategySteps[_stepIndex].pool;
            address _optyCodeProvider = registryContract.liquidityPoolToCodeProvider(_liquidityPool);
            if(_stepIndex == (_strategySteps.length - 1) && ICodeProvider(_optyCodeProvider).canStake(_liquidityPool)) {
                _codes = ICodeProvider(_optyCodeProvider).getUnstakeAndWithdrawAllCodes(_optyPool,_underlyingTokens,_liquidityPool);
            } else {
                _codes = ICodeProvider(_optyCodeProvider).getWithdrawAllCodes(_optyPool,_underlyingTokens,_liquidityPool);
            }   
        } else {
            //borrow
        }
    }
    
    function getPoolClaimAllRewardCodes(address _optyPool, bytes32 _hash, uint) public view returns(bytes[] memory _codes) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        address _liquidityPool = _strategySteps[_strategySteps.length - 1].pool;
        address _optyCodeProvider = registryContract.liquidityPoolToCodeProvider(_liquidityPool);
        _codes = ICodeProvider(_optyCodeProvider).getClaimRewardTokenCode(_optyPool, _liquidityPool);
    }
    
    function getPoolHarvestAllRewardCodes(address _optyPool, address _underlyingToken, bytes32 _hash, uint) public view returns(bytes[] memory _codes) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        address _liquidityPool = _strategySteps[_strategySteps.length - 1].pool;
        address _optyCodeProvider = registryContract.liquidityPoolToCodeProvider(_liquidityPool);
        _codes = ICodeProvider(_optyCodeProvider).getHarvestAllCodes(_optyPool, _underlyingToken, _liquidityPool);
    }
    
    function _getStrategySteps(bytes32 _hash) internal view returns(StrategyStep[] memory _strategySteps) {
        (,,,, _strategySteps) = registryContract.getStrategy(_hash);
    }
}
