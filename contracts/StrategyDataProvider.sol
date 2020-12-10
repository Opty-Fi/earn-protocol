// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "./libraries/SafeERC20.sol";
import "./interfaces/opty/IDepositDataProvider.sol";
import "./Registry.sol";
import "./libraries/Addresses.sol";
import "./utils/ERC20.sol";
import "./utils/Modifiers.sol";

contract StrategyDataProvider is Modifiers{
    
    using SafeERC20 for IERC20;
    using Address for address;

    Registry RegistryContract;

    constructor(address _registry) public {
        setRegistry(_registry);
    }

    function setRegistry(address _registry) public onlyGovernance {
        require(_registry.isContract(),"!_registry");
        RegistryContract = Registry(_registry);
    }
    
    function getStrategyStepsCount(bytes32 _hash) public view returns(uint) {
        return _getStrategySteps(_hash).length;
    }
    
    function getPoolDepositCodes(address _optyPool, address _underlyingToken, bytes32 _hash, uint _depositAmount, uint _stepIndex) public view 
    returns(bytes[] memory _codes) {
        // returns(address,address[] memory,address,uint[] memory) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        if(!_strategySteps[_stepIndex].isBorrow) {
            address _optyPoolProxy = RegistryContract.liquidityPoolToDepositPoolProxy(_strategySteps[_stepIndex].pool);
            address[] memory _underlyingTokens = IDepositDataProvider(_optyPoolProxy).getUnderlyingTokens(_strategySteps[_stepIndex].pool, _strategySteps[_stepIndex].outputToken);
            uint[] memory _amounts = new uint[](_underlyingTokens.length);
            if(_stepIndex != 0) {
                _underlyingToken = _strategySteps[_stepIndex - 1].outputToken;
            }
            for (uint8 i = 0 ; i < _underlyingTokens.length; i++) {
                if(_underlyingTokens[i] == _underlyingToken) {
                    if(_stepIndex != 0) {
                    _amounts[i] = IERC20(_underlyingToken).balanceOf(_optyPool);
                    } else {
                        _amounts[i] = _depositAmount;
                    }
                }
            }
            // return (_optyPoolProxy,_underlyingTokens,_strategySteps[_stepIndex].outputToken,_amounts);
            _codes = IDepositDataProvider(_optyPoolProxy).getDepositCodes(_optyPool,_underlyingTokens,_strategySteps[_stepIndex].pool,_strategySteps[_stepIndex].outputToken,_amounts);
        } else {
            // borrow
        }
    }
    
    function getPoolWithdrawCodes(address _optyPool, address _underlyingToken, bytes32 _hash, uint _redeemAmount, uint _stepIndex) public view returns(bytes[] memory _codes) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        if(!_strategySteps[_stepIndex].isBorrow) {
            address _optyPoolProxy = RegistryContract.liquidityPoolToDepositPoolProxy(_strategySteps[_stepIndex].pool);
            if(_stepIndex != 0) {
                _underlyingToken = _strategySteps[_stepIndex-1].outputToken;
            }
            address[] memory _underlyingTokens = new address[](1);
            _underlyingTokens[0] = _underlyingToken;
            if(_stepIndex != 0 && _stepIndex < (_strategySteps.length - 1)) {
                _redeemAmount = IERC20(_underlyingToken).balanceOf(_optyPool);
            }
            _codes = IDepositDataProvider(_optyPoolProxy).getWithdrawCodes(_optyPool,_underlyingTokens,_strategySteps[_stepIndex].pool,_strategySteps[_stepIndex].outputToken,_redeemAmount);
        } else {
            //borrow
        }
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
                address _optyPoolProxy = RegistryContract.liquidityPoolToDepositPoolProxy(_liquidityPool);
                address _liquidityPoolToken = _strategySteps[_iterator].outputToken;
                address _inputToken = _underlyingToken;
                if(_iterator != 0){
                    _inputToken = _strategySteps[_iterator - 1].outputToken;
                }
                if(_iterator == (_steps - 1)) {
                    _outputTokenAmount = IERC20(_liquidityPoolToken).balanceOf(_optyPool);
                    _balance = IDepositDataProvider(_optyPoolProxy).calculateAmountInToken(_inputToken, _liquidityPool, _liquidityPoolToken, _outputTokenAmount);
                } else {
                    _balance = IDepositDataProvider(_optyPoolProxy).calculateAmountInToken(_inputToken, _liquidityPool, _liquidityPoolToken, _outputTokenAmount);
                }        
            } else {
                // borrow
            }
            _outputTokenAmount = _balance;
        }
    }
    
    function _getStrategySteps(bytes32 _hash) internal view returns(StrategyStep[] memory _strategySteps) {
        (,,,, _strategySteps) = RegistryContract.getStrategy(_hash);
    }
    
    function getOutputToken(bytes32 _hash) public view returns(address _outputToken) {
        StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        require(_strategySteps.length > 0 , "!_strategySteps.length");
        uint index = _strategySteps.length - 1;
        _outputToken = _strategySteps[index].outputToken;
    }
}
