// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { Modifiers } from "./Modifiers.sol";
import { DataTypes } from "../../libraries/types/DataTypes.sol";

/**
 * @title VaultStepInvestStrategyDefinitionRegistry
 *
 * @author Opty.fi
 *
 * @dev Contract to persist vault's step invest strategy definition
 */
contract VaultStepInvestStrategyDefinitionRegistry is Modifiers {
    mapping(bytes32 => bytes32[]) public tokenToStrategies;
    mapping(bytes32 => DataTypes.Strategy) public strategies;
    bytes32[] public strategyHashIndexes;

    /**
     * @dev Emitted when `hash` strategy is set.
     *
     * Note that `token` cannot be zero address or EOA.
     */
    event LogSetVaultInvestStrategy(bytes32 indexed tokensHash, bytes32 indexed hash, address indexed caller);

    /* solhint-disable no-empty-blocks */
    constructor(address _registry) public Modifiers(_registry) {}

    /* solhint-disable no-empty-blocks */

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
    function setStrategy(bytes32 _tokensHash, DataTypes.StrategyStep[] memory _strategySteps)
        external
        onlyOperator
        returns (bool)
    {
        _setStrategy(_tokensHash, _strategySteps);
        return true;
    }

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
    function setStrategy(bytes32 _tokensHash, DataTypes.StrategyStep[][] memory _strategySteps)
        external
        onlyOperator
        returns (bool)
    {
        uint8 _len = uint8(_strategySteps.length);
        for (uint8 _i = 0; _i < _len; _i++) {
            _setStrategy(_tokensHash, _strategySteps[_i]);
        }
        return true;
    }

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
        onlyOperator
        returns (bool)
    {
        require(_tokensHash.length == _strategySteps.length, "!index mismatch");
        uint8 _len = uint8(_strategySteps.length);
        for (uint8 _i = 0; _i < _len; _i++) {
            _setStrategy(_tokensHash[_i], _strategySteps[_i]);
        }
        return true;
    }

    /**
     * @dev Returns the Strategy by `_hash`.
     */
    function getStrategy(bytes32 _hash)
        public
        view
        returns (uint256 _index, DataTypes.StrategyStep[] memory _strategySteps)
    {
        _index = strategies[_hash].index;
        _strategySteps = strategies[_hash].strategySteps;
    }

    /**
     * @dev Returns the list of strategy hashes by `_token`.
     */
    function getTokenToStrategies(bytes32 _tokensHash) public view returns (bytes32[] memory) {
        return tokenToStrategies[_tokensHash];
    }

    /**
     * @dev assign strategy in form of `_strategySteps` to the `_tokensHash`.
     *
     * Returns true indicating successful operation.
     *
     * Emits a {LogSetVaultInvestStrategy} event.
     *
     * Requirements:
     *
     * - msg.sender can be governance or strategist.
     * - `creditPool` and `borrowToken` in {_strategySteps}can be zero address simultaneously only
     * - `token`, `liquidityPool` and `strategyContract` cannot be zero address or EOA.
     */
    function _setStrategy(bytes32 _tokensHash, DataTypes.StrategyStep[] memory _strategySteps) internal returns (bool) {
        bytes32[] memory hashes = new bytes32[](_strategySteps.length);
        for (uint8 _i = 0; _i < uint8(_strategySteps.length); _i++) {
            hashes[_i] = keccak256(
                abi.encodePacked(_strategySteps[_i].pool, _strategySteps[_i].outputToken, _strategySteps[_i].isBorrow)
            );
        }
        bytes32 hash = keccak256(abi.encodePacked(_tokensHash, hashes));
        require(_isNewStrategy(hash), "isNewStrategy");
        for (uint8 _i = 0; _i < uint8(_strategySteps.length); _i++) {
            strategies[hash].strategySteps.push(
                DataTypes.StrategyStep(
                    _strategySteps[_i].pool,
                    _strategySteps[_i].outputToken,
                    _strategySteps[_i].isBorrow
                )
            );
        }
        strategyHashIndexes.push(hash);
        strategies[hash].index = strategyHashIndexes.length - 1;
        tokenToStrategies[_tokensHash].push(hash);
        emit LogSetVaultInvestStrategy(_tokensHash, hash, msg.sender);
        return true;
    }

    /**
     * @dev Check duplicate `_hash` Startegy from the {strategyHashIndexes} mapping.
     *
     * Returns a boolean value indicating whether duplicate `_hash` exists or not.
     *
     * Requirements:
     *
     * - {strategyHashIndexes} length should be more than zero.
     */
    function _isNewStrategy(bytes32 _hash) internal view returns (bool) {
        if (strategyHashIndexes.length == 0) {
            return true;
        }
        return (strategyHashIndexes[strategies[_hash].index] != _hash);
    }
}
