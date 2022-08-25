// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

//  libraries
import { DataTypes } from "../earn-protocol-configuration/contracts/libraries/types/DataTypes.sol";

// interfaces
import { IAdapterFull } from "@optyfi/defi-legos/interfaces/defiAdapters/contracts/IAdapterFull.sol";
import { IRegistry } from "../earn-protocol-configuration/contracts/interfaces/opty/IRegistry.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title StrategyManager Library
 * @author Opty.fi
 * @notice Central processing unit of the earn protocol
 * @dev Contains the functionality for getting the codes to deposit/withdraw tokens,
 * from the adapters and pass it onto vault contract
 */
library StrategyManager {
    function getDepositInternalTransactionCount(
        DataTypes.StrategyStep[] memory _strategySteps,
        address _registryContract
    ) public view returns (uint256) {
        uint256 _strategyStepCount = _strategySteps.length;
        address _lastStepLiquidityPool = _strategySteps[_strategyStepCount - 1].pool;
        if (
            IAdapterFull(IRegistry(_registryContract).getLiquidityPoolToAdapter(_lastStepLiquidityPool)).canStake(
                _lastStepLiquidityPool
            )
        ) {
            return (_strategyStepCount + 1);
        }
        return _strategyStepCount;
    }

    function getOraValueUT(
        DataTypes.StrategyStep[] memory _strategySteps,
        address _registryContract,
        address payable _vault,
        address _underlyingToken
    ) public view returns (uint256 _amountUT) {
        uint256 _nStrategySteps = _strategySteps.length;
        uint256 _outputTokenAmount;
        for (uint256 _i; _i < _nStrategySteps; _i++) {
            uint256 _iterator = _nStrategySteps - 1 - _i;
            address _liquidityPool = _strategySteps[_iterator].pool;
            IAdapterFull _adapter = 
                IAdapterFull(IRegistry(_registryContract).getLiquidityPoolToAdapter(_liquidityPool));
            address _inputToken = _underlyingToken;
            if (_iterator != 0) {
                _inputToken = _strategySteps[_iterator - 1].outputToken;
            }
            if (_iterator == (_nStrategySteps - 1)) {
                if (_adapter.canStake(_liquidityPool)) {
                    _amountUT = _adapter.getAllAmountInTokenStake(_vault, _inputToken, _liquidityPool);
                } else {
                    _amountUT = _adapter.getAllAmountInToken(_vault, _inputToken, _liquidityPool);
                }
            } else {
                _amountUT = _adapter.getSomeAmountInToken(_inputToken, _liquidityPool, _outputTokenAmount);
            }
            _outputTokenAmount = _amountUT;
        }
    }

    function getOraSomeValueLP(
        DataTypes.StrategyStep[] memory _strategySteps,
        address _registryContract,
        address _underlyingToken,
        uint256 _wantAmountUT
    ) public view returns (uint256 _amountLP) {
        uint256 _nStrategySteps = _strategySteps.length;
        for (uint256 _i; _i < _nStrategySteps; _i++) {
            address _liquidityPool = _strategySteps[_i].pool;
            IAdapterFull _adapter = 
                IAdapterFull(IRegistry(_registryContract).getLiquidityPoolToAdapter(_liquidityPool));
            address _inputToken = _underlyingToken;
            if (_i != 0) {
                _inputToken = _strategySteps[_i - 1].outputToken;
            }
            _amountLP = _adapter.calculateAmountInLPToken(
                _inputToken,
                _liquidityPool,
                _i == 0 ? _wantAmountUT : _amountLP
            );
            // the _amountLP will be actually _wantAmountUT for _i+1th step
        }
    }

    function getPoolDepositCodes(
        DataTypes.StrategyStep[] memory _strategySteps,
        DataTypes.StrategyConfigurationParams memory _strategyConfigurationParams
    ) public view returns (bytes[] memory _codes) {
        IRegistry _registryContract = IRegistry(_strategyConfigurationParams.registryContract);
        address _underlyingToken = _strategyConfigurationParams.underlyingToken;
        uint256 _depositAmountUT = _strategyConfigurationParams.initialStepInputAmount;
        uint256 _stepCount = _strategySteps.length;
        if (_strategyConfigurationParams.internalTransactionIndex == _stepCount) {
            address _liquidityPool = _strategySteps[_strategyConfigurationParams.internalTransactionIndex - 1].pool;
            IAdapterFull _adapter = IAdapterFull(_registryContract.getLiquidityPoolToAdapter(_liquidityPool));
            _underlyingToken = _strategySteps[_strategyConfigurationParams.internalTransactionIndex - 1].outputToken;
            _depositAmountUT = IERC20(_strategyConfigurationParams.underlyingToken).balanceOf(
                _strategyConfigurationParams.vault
            );
            _codes = _adapter.getStakeAllCodes(
                _strategyConfigurationParams.vault,
                _strategyConfigurationParams.underlyingToken,
                _liquidityPool
            );
        } else {
            address _liquidityPool = _strategySteps[_strategyConfigurationParams.internalTransactionIndex].pool;
            IAdapterFull _adapter = IAdapterFull(_registryContract.getLiquidityPoolToAdapter(_liquidityPool));
            if (_strategyConfigurationParams.internalTransactionIndex != 0) {
                _underlyingToken = _strategySteps[_strategyConfigurationParams.internalTransactionIndex - 1]
                    .outputToken;
                _depositAmountUT = IERC20(_underlyingToken).balanceOf(_strategyConfigurationParams.vault);
            }
            _codes = _adapter.getDepositSomeCodes(
                _strategyConfigurationParams.vault,
                _underlyingToken,
                _liquidityPool,
                _depositAmountUT
            );
        }
    }

    function getPoolWithdrawCodes(
        DataTypes.StrategyStep[] memory _strategySteps,
        DataTypes.StrategyConfigurationParams memory _strategyConfigurationParams
    ) public view returns (bytes[] memory _codes) {
        address _liquidityPool = _strategySteps[_strategyConfigurationParams.internalTransactionIndex].pool;
        IRegistry _registryContract = IRegistry(_strategyConfigurationParams.registryContract);
        IAdapterFull _adapter = IAdapterFull(_registryContract.getLiquidityPoolToAdapter(_liquidityPool));
        address _underlyingToken = _strategyConfigurationParams.underlyingToken;
        uint256 _redeemAmountLP = _strategyConfigurationParams.initialStepInputAmount;
        if (_strategyConfigurationParams.internalTransactionIndex != 0) {
            _underlyingToken = _strategySteps[_strategyConfigurationParams.internalTransactionIndex - 1].outputToken;
        }
        if (
            _strategyConfigurationParams.internalTransactionIndex !=
            (_strategyConfigurationParams.internalTransactionCount - 1)
        ) {
            _redeemAmountLP = IERC20(_strategySteps[_strategyConfigurationParams.internalTransactionIndex].outputToken)
                .balanceOf(_strategyConfigurationParams.vault);
        }
        _codes = (_strategyConfigurationParams.internalTransactionIndex ==
            (_strategyConfigurationParams.internalTransactionCount - 1) &&
            _adapter.canStake(_liquidityPool))
            ? _adapter.getUnstakeAndWithdrawSomeCodes(
                _strategyConfigurationParams.vault,
                _underlyingToken,
                _liquidityPool,
                _redeemAmountLP
            )
            : _adapter.getWithdrawSomeCodes(
                _strategyConfigurationParams.vault,
                _underlyingToken,
                _liquidityPool,
                _redeemAmountLP
            );
    }

    function getLastStrategyStepBalanceLP(
        DataTypes.StrategyStep[] memory _strategySteps,
        address _registryContract,
        address payable _vault,
        address _underlyingToken
    ) public view returns (uint256) {
        uint256 _strategyStepsLen = _strategySteps.length;
        address _liquidityPool = _strategySteps[_strategySteps.length - 1].pool;
        IAdapterFull _adapter = IAdapterFull(IRegistry(_registryContract).getLiquidityPoolToAdapter(_liquidityPool));
        if (_strategyStepsLen > 1) {
            // underlying token for last step is previous step's output token
            _underlyingToken = _strategySteps[_strategyStepsLen - 2].outputToken;
        }
        return
            _adapter.canStake(_liquidityPool)
                ? _adapter.getLiquidityPoolTokenBalanceStake(_vault, _liquidityPool)
                : _adapter.getLiquidityPoolTokenBalance(_vault, _underlyingToken, _liquidityPool);
    }
}
