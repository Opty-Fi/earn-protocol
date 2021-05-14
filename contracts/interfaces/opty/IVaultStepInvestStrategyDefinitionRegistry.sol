// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { DataTypes } from "../../libraries/types/DataTypes.sol";

/**
 * @title IVaultStepInvestStrategyDefinitionRegistry
 *
 * @author Opty.fi
 *
 * @dev Interface for IVaultStepInvestStrategyDefinitionRegistry
 */
interface IVaultStepInvestStrategyDefinitionRegistry {
    /**
     * @dev assign strategy in form of `_strategySteps` to the `_tokensHash`.
     *
     * Returns true indicating successful operation.
     *
     * Emits a {LogSetVaultInvestStrategy} event.
     *
     * Requirements:
     *
     * - msg.sender should be operator.
     * - `creditPool` and `borrowToken` in {_strategySteps}can be zero address simultaneously only
     * - `token`, `liquidityPool` and `strategyContract` cannot be zero address or EOA.
     */
    function setStrategy(bytes32 _tokensHash, DataTypes.StrategyStep[] memory _strategySteps) external returns (bool);

    /**
     * @dev assign multiple strategies in form of `_strategySteps` to the `_tokensHash`.
     *
     * Emits a {LogSetVaultInvestStrategy} event per successful assignment of the strategy.
     *
     * Requirements:
     *
     * - msg.sender should be operator.
     * - `creditPool` and `borrowToken` in {_strategySteps}can be zero address simultaneously only
     * - `token`, `liquidityPool` and `strategyContract` cannot be zero address or EOA.
     */
    function setStrategy(bytes32 _tokensHash, DataTypes.StrategyStep[][] memory _strategySteps) external returns (bool);

    /**
     * @dev assign multiple strategies in form of `_strategySteps` to multiple tokens in form of `_tokensHash`.
     *
     * Emits a {LogSetVaultInvestStrategy} event per successful assignment of the strategy.
     *
     * Requirements:
     *
     * - msg.sender should be operator.
     * - `creditPool` and `borrowToken` in {_strategySteps}can be zero address simultaneously only
     * - `token`, `liquidityPool` and `strategyContract` cannot be zero address or EOA.
     */
    function setStrategy(bytes32[] memory _tokensHash, DataTypes.StrategyStep[][] memory _strategySteps)
        external
        returns (bool);

    /**
     * @dev Returns the Strategy by `_hash`.
     */
    function getStrategy(bytes32 _hash)
        external
        view
        returns (uint256 _index, DataTypes.StrategyStep[] memory _strategySteps);

    /**
     * @dev Returns the list of strategy hashes by `_token`.
     */
    function getTokenToStrategies(bytes32 _tokensHash) external view returns (bytes32[] memory);
}
