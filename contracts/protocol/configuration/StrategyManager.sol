// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { IAdapter } from "../../interfaces/opty/IAdapter.sol";
import { SafeERC20, IERC20, SafeMath, Address } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Registry } from "./Registry.sol";
import { RegistryStorage } from "./RegistryStorage.sol";
import { Modifiers } from "./Modifiers.sol";
import { HarvestCodeProvider } from "./HarvestCodeProvider.sol";
import { DataTypes } from "../../libraries/types/DataTypes.sol";
import {
    IVaultStepInvestStrategyDefinitionRegistry
} from "../../interfaces/opty/IVaultStepInvestStrategyDefinitionRegistry.sol";

/**
 * @dev Central processing unit of the earn protocol
 */

contract StrategyManager is Modifiers {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    HarvestCodeProvider public harvestCodeProviderContract;

    bytes32 public constant ZERO_BYTES32 = 0x0000000000000000000000000000000000000000000000000000000000000000;

    constructor(address _registry, address _harvestCodeProvider) public Modifiers(_registry) {
        setHarvestCodeProvider(_harvestCodeProvider);
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

    function getBalanceInUnderlyingToken(
        address payable _optyVault,
        address _underlyingToken,
        bytes32 _hash
    ) public view returns (uint256 _balance) {
        return _getBalanceInUnderlyingToken(_optyVault, _underlyingToken, _hash);
    }

    function getPoolDepositAllCodes(
        address payable _optyVault,
        address _underlyingToken,
        bytes32 _hash,
        uint8 _stepIndex,
        uint8 _stepCount
    ) public view returns (bytes[] memory _codes) {
        _codes = _getPoolDepositAllCodes(_optyVault, _underlyingToken, _hash, _stepIndex, _stepCount);
    }

    function getPoolWithdrawAllCodes(
        address payable _optyVault,
        address _underlyingToken,
        bytes32 _hash,
        uint8 _stepIndex,
        uint8 _stepCount
    ) public view returns (bytes[] memory _codes) {
        _codes = _getPoolWithdrawAllCodes(_optyVault, _underlyingToken, _hash, _stepIndex, _stepCount);
    }

    function getPoolClaimAllRewardCodes(
        address payable _optyVault,
        bytes32 _hash,
        uint8 _stepIndex,
        uint8 _stepCount
    ) public view returns (bytes[] memory _codes) {
        _codes = _getPoolClaimAllRewardCodes(_optyVault, _hash, _stepIndex, _stepCount);
    }

    function getPoolHarvestAllRewardCodes(
        address payable _optyVault,
        address _underlyingToken,
        bytes32 _investStrategyHash,
        uint8 _stepIndex,
        uint8 _stepCount
    ) public view returns (bytes[] memory _codes) {
        _codes = _getPoolHarvestAllRewardCodes(
            _optyVault,
            _underlyingToken,
            _investStrategyHash,
            _stepIndex,
            _stepCount
        );
    }

    function getPoolHarvestSomeRewardCodes(
        address payable _optyVault,
        address _underlyingToken,
        bytes32 _investStrategyHash,
        uint256 _convertRewardTokensPercent,
        uint8 _stepIndex,
        uint8 _stepCount
    ) public view returns (bytes[] memory _codes) {
        _codes = _getPoolHarvestSomeRewardCodes(
            _optyVault,
            _underlyingToken,
            _investStrategyHash,
            _convertRewardTokensPercent,
            _stepIndex,
            _stepCount
        );
    }

    function setHarvestCodeProvider(address _harvestCodeProvider) public onlyOperator {
        harvestCodeProviderContract = HarvestCodeProvider(_harvestCodeProvider);
    }

    function getFeeTransferAllCodes(
        DataTypes.TreasuryShare[] memory _treasuryShares,
        address _account,
        address _underlyingToken,
        uint256 _redeemAmountInToken,
        uint256 _withdrawalFee
    ) external pure returns (bytes[] memory _treasuryCodes, bytes memory _accountCode) {
        if (_redeemAmountInToken > 0) {
            uint256 _fee = 0;
            if (_treasuryShares.length > 0 && _withdrawalFee > 0) {
                uint8 _treasurySharesLength = uint8(_treasuryShares.length);
                _treasuryCodes = new bytes[](_treasurySharesLength);
                for (uint8 _i = 0; _i < uint8(_treasuryShares.length); _i++) {
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
            require(_account != address(0), "Account==0x0");
            _accountCode = abi.encode(
                _underlyingToken,
                abi.encodeWithSignature("transfer(address,uint256)", _account, _redeemAmountInToken.sub(_fee))
            );
        }
    }

    function _getStrategySteps(bytes32 _hash) internal view returns (DataTypes.StrategyStep[] memory _strategySteps) {
        IVaultStepInvestStrategyDefinitionRegistry _vaultStepInvestStrategyDefinitionRegistry =
            IVaultStepInvestStrategyDefinitionRegistry(registryContract.vaultStepInvestStrategyDefinitionRegistry());
        (, _strategySteps) = _vaultStepInvestStrategyDefinitionRegistry.getStrategy(_hash);
    }

    function _getPoolDepositAllCodes(
        address payable _optyVault,
        address _underlyingToken,
        bytes32 _hash,
        uint8 _stepIndex,
        uint8
    ) internal view returns (bytes[] memory _codes) {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        uint8 _subStepCounter = 0;
        for (uint8 _i = 0; _i < uint8(_strategySteps.length); _i++) {
            if (_strategySteps[_i].isBorrow) {
                if (_stepIndex == _subStepCounter) {
                    address _liquidityPool = _strategySteps[_i].pool;
                    address _optyAdapter = registryContract.liquidityPoolToAdapter(_liquidityPool);
                    address[] memory _underlyingTokens = new address[](1);
                    _underlyingTokens[0] = _underlyingToken;
                    if (_i != 0) {
                        _underlyingTokens[0] = _strategySteps[_i - 1].outputToken;
                    }
                    _codes = IAdapter(_optyAdapter).getDepositAllCodes(_optyVault, _underlyingTokens, _liquidityPool);
                    break;
                } // deposit at ith step
                if (_stepIndex == _subStepCounter + 1) {
                    address _liquidityPool = _strategySteps[_i].pool;
                    address _outputToken = _strategySteps[_i].outputToken; // borrow token
                    address _optyAdapter = registryContract.liquidityPoolToAdapter(_liquidityPool);
                    address[] memory _underlyingTokens = new address[](1);
                    _underlyingTokens[0] = _underlyingToken;
                    if (_i != 0) {
                        _underlyingTokens[0] = _strategySteps[_i - 1].outputToken;
                    }
                    _codes = IAdapter(_optyAdapter).getBorrowAllCodes(
                        _optyVault,
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
                    address _optyAdapter = registryContract.liquidityPoolToAdapter(_liquidityPool);
                    address[] memory _underlyingTokens = new address[](1);
                    _underlyingTokens[0] = _underlyingToken;
                    if (_i != 0) {
                        _underlyingTokens[0] = _strategySteps[_i - 1].outputToken;
                    }
                    _codes = IAdapter(_optyAdapter).getDepositAllCodes(_optyVault, _underlyingTokens, _liquidityPool);
                    break;
                } // deposit at ith step
                if (_stepIndex == (_subStepCounter + 1) && _i == uint8(_strategySteps.length - 1)) {
                    address _liquidityPool = _strategySteps[_i].pool;
                    address _optyAdapter = registryContract.liquidityPoolToAdapter(_liquidityPool);
                    address[] memory _underlyingTokens = new address[](1);
                    if (_i != 0) {
                        _underlyingTokens[0] = _strategySteps[_i - 1].outputToken;
                    }
                    _codes = IAdapter(_optyAdapter).getStakeAllCodes(_optyVault, _underlyingTokens, _liquidityPool);
                    break;
                } // stake at ith step
                _subStepCounter++;
            }
        }
    }

    function _getPoolWithdrawAllCodes(
        address payable _optyVault,
        address _underlyingToken,
        bytes32 _hash,
        uint8 _stepIndex,
        uint8 _stepCount
    ) internal view returns (bytes[] memory _codes) {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        uint8 _subStepCounter = _stepCount - 1;
        for (uint8 _i = 0; _i < uint8(_strategySteps.length); _i++) {
            uint8 _iterator = uint8(_strategySteps.length) - 1 - _i;
            if (_strategySteps[_iterator].isBorrow) {
                address _outputToken = _strategySteps[_iterator].outputToken;
                if (_stepIndex == _subStepCounter) {
                    _underlyingToken = (_iterator != 0) ? _strategySteps[_iterator - 1].outputToken : _underlyingToken;
                    address _optyAdapter = registryContract.liquidityPoolToAdapter(_strategySteps[_iterator].pool);
                    address[] memory _underlyingTokens = new address[](1);
                    _underlyingTokens[0] = _underlyingToken;
                    _codes = IAdapter(_optyAdapter).getRepayAndWithdrawAllCodes(
                        _optyVault,
                        _underlyingTokens,
                        _strategySteps[_iterator].pool,
                        _outputToken
                    );
                    break;
                } // repayAndWithdraw at ith step
                if (_stepIndex == _subStepCounter - 1) {
                    _underlyingToken = (_iterator != 0) ? _strategySteps[_iterator - 1].outputToken : _underlyingToken;
                    uint256 _borrowTokenRemainingAmount = IERC20(_outputToken).balanceOf(_optyVault);
                    _codes = harvestCodeProviderContract.getHarvestCodes(
                        _optyVault,
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
                    address _optyAdapter = registryContract.liquidityPoolToAdapter(_strategySteps[_iterator].pool);
                    address[] memory _underlyingTokens = new address[](1);
                    _underlyingTokens[0] = _underlyingToken;
                    _codes = (_iterator == uint8(_strategySteps.length) - 1 &&
                        IAdapter(_optyAdapter).canStake(_strategySteps[_iterator].pool))
                        ? IAdapter(_optyAdapter).getUnstakeAndWithdrawAllCodes(
                            _optyVault,
                            _underlyingTokens,
                            _strategySteps[_iterator].pool
                        )
                        : IAdapter(_optyAdapter).getWithdrawAllCodes(
                            _optyVault,
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
        address payable _optyVault,
        address _underlyingToken,
        bytes32 _investStrategyHash,
        uint8,
        uint8
    ) internal view returns (bytes[] memory _codes) {
        (address _liquidityPool, address _optyAdapter, ) = getLpAdapterRewardToken(_investStrategyHash);
        _codes = IAdapter(_optyAdapter).getHarvestAllCodes(_optyVault, _underlyingToken, _liquidityPool);
    }

    function _getPoolHarvestSomeRewardCodes(
        address payable _optyVault,
        address _underlyingToken,
        bytes32 _investStrategyHash,
        uint256 _convertRewardTokensPercent,
        uint8,
        uint8
    ) internal view returns (bytes[] memory _codes) {
        (address _liquidityPool, address _optyAdapter, address _rewardToken) =
            getLpAdapterRewardToken(_investStrategyHash);
        //  get reward token balance for optyVault
        uint256 _rewardTokenBalance = IERC20(_rewardToken).balanceOf(_optyVault);
        //  calculation in basis
        uint256 _redeemRewardTokens = _rewardTokenBalance.mul(_convertRewardTokensPercent).div(10000);
        _codes = IAdapter(_optyAdapter).getHarvestSomeCodes(
            _optyVault,
            _underlyingToken,
            _liquidityPool,
            _redeemRewardTokens
        );
    }

    function getLpAdapterRewardToken(bytes32 _investStrategyHash)
        public
        view
        returns (
            address _liquidityPool,
            address _optyAdapter,
            address _rewardToken
        )
    {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_investStrategyHash);
        _liquidityPool = _strategySteps[_strategySteps.length - 1].pool;
        _optyAdapter = registryContract.liquidityPoolToAdapter(_liquidityPool);
        _rewardToken = IAdapter(_optyAdapter).getRewardToken(_liquidityPool);
    }

    function _getPoolClaimAllRewardCodes(
        address payable _optyVault,
        bytes32 _hash,
        uint8,
        uint8
    ) internal view returns (bytes[] memory _codes) {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        address _liquidityPool = _strategySteps[_strategySteps.length - 1].pool;
        address _optyAdapter = registryContract.liquidityPoolToAdapter(_liquidityPool);
        _codes = IAdapter(_optyAdapter).getClaimRewardTokenCode(_optyVault, _liquidityPool);
    }

    function _getBalanceInUnderlyingToken(
        address payable _optyVault,
        address _underlyingToken,
        bytes32 _hash
    ) internal view returns (uint256 _balance) {
        uint8 _steps = uint8(_getStrategySteps(_hash).length);
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        _balance = 0;
        uint256 _outputTokenAmount = _balance;
        for (uint8 _i = 0; _i < _steps; _i++) {
            uint256 _iterator = _steps - 1 - _i;
            address _liquidityPool = _strategySteps[_iterator].pool;
            address _optyAdapter = registryContract.liquidityPoolToAdapter(_liquidityPool);
            address _inputToken = _underlyingToken;
            if (_iterator != 0) {
                _inputToken = _strategySteps[_iterator - 1].outputToken;
            }
            if (!_strategySteps[_iterator].isBorrow) {
                if (_iterator == (_steps - 1)) {
                    if (IAdapter(_optyAdapter).canStake(_liquidityPool)) {
                        _balance = IAdapter(_optyAdapter).getAllAmountInTokenStake(
                            _optyVault,
                            _inputToken,
                            _liquidityPool
                        );
                    } else {
                        _balance = IAdapter(_optyAdapter).getAllAmountInToken(_optyVault, _inputToken, _liquidityPool);
                    }
                } else {
                    _balance = IAdapter(_optyAdapter).getSomeAmountInToken(
                        _inputToken,
                        _liquidityPool,
                        _outputTokenAmount
                    );
                }
            }
            // deposit
            else {
                address _borrowToken = _strategySteps[_iterator].outputToken;
                _balance = IAdapter(_optyAdapter).getAllAmountInTokenBorrow(
                    _optyVault,
                    _inputToken,
                    _liquidityPool,
                    _borrowToken,
                    _outputTokenAmount
                );
            } // borrow
            _outputTokenAmount = _balance;
        }
    }

    function _getHarvestRewardStepsCount(bytes32 _hash) internal view returns (uint8) {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        uint8 _lastStepIndex = uint8(_strategySteps.length) - 1;
        address _lastStepLiquidityPool = _strategySteps[_lastStepIndex].pool;
        address _lastStepOptyAdapter = registryContract.liquidityPoolToAdapter(_lastStepLiquidityPool);
        if (IAdapter(_lastStepOptyAdapter).getRewardToken(_lastStepLiquidityPool) != address(0)) {
            return uint8(1);
        }
        return uint8(0);
    }

    function _getClaimRewardStepsCount(bytes32 _hash) internal view returns (uint8) {
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        uint8 _lastStepIndex = uint8(_strategySteps.length) - 1;
        address _lastStepLiquidityPool = _strategySteps[_lastStepIndex].pool;
        address _lastStepOptyAdapter = registryContract.liquidityPoolToAdapter(_lastStepLiquidityPool);
        if (IAdapter(_lastStepOptyAdapter).getRewardToken(_lastStepLiquidityPool) != address(0)) {
            return uint8(1);
        }
        return uint8(0);
    }

    function _getDepositAllStepCount(bytes32 _hash) internal view returns (uint8) {
        if (_hash == ZERO_BYTES32) {
            return uint8(0);
        }
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        uint8 _strategyStepCount = uint8(_strategySteps.length);
        uint8 _lastStepIndex = _strategyStepCount - 1;
        address _lastStepLiquidityPool = _strategySteps[_lastStepIndex].pool;
        address _lastStepOptyAdapter = registryContract.liquidityPoolToAdapter(_lastStepLiquidityPool);
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

    function _getWithdrawAllStepsCount(bytes32 _hash) internal view returns (uint8) {
        if (_hash == ZERO_BYTES32) {
            return uint8(0);
        }
        DataTypes.StrategyStep[] memory _strategySteps = _getStrategySteps(_hash);
        uint8 _steps = uint8(_strategySteps.length);
        for (uint8 _i = 0; _i < uint8(_strategySteps.length); _i++) {
            if (_strategySteps[_i].isBorrow) {
                _steps++;
            }
        }
        return _steps;
    }
}
