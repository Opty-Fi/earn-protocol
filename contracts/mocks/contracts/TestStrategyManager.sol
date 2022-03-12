// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import { MultiCall } from "../../utils/MultiCall.sol";
import { StrategyManager } from "../../protocol/lib/StrategyManager.sol";
import { DataTypes } from "../../protocol/earn-protocol-configuration/contracts/libraries/types/DataTypes.sol";

contract TestStrategyManager is MultiCall {
    using StrategyManager for DataTypes.StrategyStep[];

    function testGetDepositInternalTransactionCount(
        DataTypes.StrategyStep[] calldata _strategySteps,
        address _registryContract,
        uint256 _expectedValue
    ) external view returns (bool) {
        return _expectedValue == _strategySteps.getDepositInternalTransactionCount(_registryContract);
    }

    function testOraValueUT(
        DataTypes.StrategyStep[] calldata _strategySteps,
        address _registryContract,
        address payable _vault,
        address _underlyingToken,
        uint256 _expectedAmountUT
    ) external view returns (bool) {
        return _expectedAmountUT == _strategySteps.getOraValueUT(_registryContract, _vault, _underlyingToken);
    }

    function testOraSomeValueLP(
        DataTypes.StrategyStep[] calldata _strategySteps,
        address _registryContract,
        address _underlyingToken,
        uint256 _wantAmountUT,
        uint256 _expectedAmountLP
    ) external view returns (bool) {
        return
            _expectedAmountLP == _strategySteps.getOraSomeValueLP(_registryContract, _underlyingToken, _wantAmountUT);
    }

    function testGetPoolDepositCodes(
        DataTypes.StrategyStep[] calldata _strategySteps,
        DataTypes.StrategyConfigurationParams memory _strategyConfigurationParams
    ) external {
        executeCodes(_strategySteps.getPoolDepositCodes(_strategyConfigurationParams), "!deposit");
    }

    function testGetPoolWithdrawCodes(
        DataTypes.StrategyStep[] calldata _strategySteps,
        DataTypes.StrategyConfigurationParams memory _strategyConfigurationParams
    ) external {
        executeCodes(_strategySteps.getPoolWithdrawCodes(_strategyConfigurationParams), "!withdraw");
    }

    function testGetLastStrategyStepBalanceLP(
        DataTypes.StrategyStep[] memory _strategySteps,
        address _registryContract,
        address payable _vault,
        address _underlyingToken,
        uint256 _expectedBalanceLP
    ) external view returns (bool) {
        return
            _expectedBalanceLP ==
            _strategySteps.getLastStrategyStepBalanceLP(_registryContract, _vault, _underlyingToken);
    }
}
