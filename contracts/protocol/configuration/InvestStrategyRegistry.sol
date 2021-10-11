// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

//  libraries
import { DataTypes } from "../../libraries/types/DataTypes.sol";

//  helper contracts
import { Modifiers } from "./Modifiers.sol";

//  interfaces
import { IInvestStrategyRegistry } from "../../interfaces/opty/IInvestStrategyRegistry.sol";

/**
 * @title InvestStrategyRegistry Contract
 * @author Opty.fi
 * @dev Contract to persist vault's step invest strategy definition
 */
contract InvestStrategyRegistry is IInvestStrategyRegistry, Modifiers {
    /** @notice Mapping of hash (underlying Tokens hash) to strategy steps hash */
    mapping(bytes32 => bytes32[]) public tokenToStrategies;

    /** @notice Mapping of hash (tokens and strategy steps hash) to Strategy Steps */
    mapping(bytes32 => DataTypes.Strategy) public strategies;

    /** @notice Stores the indexes of all the strategies stored */
    bytes32[] public strategyHashIndexes;

    /**
     * @notice Emitted when hash strategy is set
     * @param tokensHash Hash of token/list of tokens for which strategy is set
     * @param strategyHash Hash of strategy steps which is set for the above tokensHash
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogSetVaultInvestStrategy(bytes32 indexed tokensHash, bytes32 indexed strategyHash, address indexed caller);

    /* solhint-disable no-empty-blocks */
    constructor(address _registry) public Modifiers(_registry) {}

    /**
     * @inheritdoc IInvestStrategyRegistry
     */
    function setStrategy(bytes32 _tokensHash, DataTypes.StrategyStep[] memory _strategySteps)
        external
        override
        onlyOperator
        returns (bool)
    {
        _setStrategy(_tokensHash, _strategySteps);
        return true;
    }

    /**
     * @inheritdoc IInvestStrategyRegistry
     */
    function setStrategy(bytes32 _tokensHash, DataTypes.StrategyStep[][] memory _strategySteps)
        external
        override
        onlyOperator
        returns (bool)
    {
        for (uint256 _i = 0; _i < _strategySteps.length; _i++) {
            _setStrategy(_tokensHash, _strategySteps[_i]);
        }
        return true;
    }

    /**
     * @inheritdoc IInvestStrategyRegistry
     */
    function setStrategy(bytes32[] memory _tokensHash, DataTypes.StrategyStep[][] memory _strategySteps)
        external
        override
        onlyOperator
        returns (bool)
    {
        require(_tokensHash.length == _strategySteps.length, "!index mismatch");
        for (uint256 _i = 0; _i < _strategySteps.length; _i++) {
            _setStrategy(_tokensHash[_i], _strategySteps[_i]);
        }
        return true;
    }

    /**
     * @inheritdoc IInvestStrategyRegistry
     */
    function getStrategy(bytes32 _hash)
        public
        view
        override
        returns (uint256 _index, DataTypes.StrategyStep[] memory _strategySteps)
    {
        _index = strategies[_hash].index;
        _strategySteps = strategies[_hash].strategySteps;
    }

    /**
     * @inheritdoc IInvestStrategyRegistry
     */
    function getTokenToStrategies(bytes32 _tokensHash) public view override returns (bytes32[] memory) {
        return tokenToStrategies[_tokensHash];
    }

    function _setStrategy(bytes32 _tokensHash, DataTypes.StrategyStep[] memory _strategySteps) internal returns (bool) {
        bytes32[] memory hashes = new bytes32[](_strategySteps.length);
        for (uint256 _i = 0; _i < _strategySteps.length; _i++) {
            hashes[_i] = keccak256(
                abi.encodePacked(_strategySteps[_i].pool, _strategySteps[_i].outputToken, _strategySteps[_i].isBorrow)
            );
        }
        bytes32 hash = keccak256(abi.encodePacked(_tokensHash, hashes));
        require(_isNewStrategy(hash), "isNewStrategy");
        for (uint256 _i = 0; _i < _strategySteps.length; _i++) {
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
     * @dev Check duplicate _hash Strategy
     * @param _hash Strategy Hash to be checked if it is new or not
     * @return Returns a boolean value indicating whether duplicate _hash exists or not.
     */
    function _isNewStrategy(bytes32 _hash) internal view returns (bool) {
        if (strategyHashIndexes.length == 0) {
            return true;
        }
        return (strategyHashIndexes[strategies[_hash].index] != _hash);
    }
}
