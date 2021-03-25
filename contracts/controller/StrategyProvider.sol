// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "../utils/Modifiers.sol";

contract StrategyProvider is Modifiers {
    mapping(bytes32 => bytes32) public tokenToBestBasicStrategies;
    mapping(bytes32 => bytes32) public tokenToDefaultBasicStrategies;
    mapping(bytes32 => bytes32) public tokenToBestAdvanceStrategies;
    mapping(bytes32 => bytes32) public tokenToDefaultAdvanceStrategies;
    mapping(bytes32 => bytes32) public tokenToBestAdvancePlusStrategies;
    mapping(bytes32 => bytes32) public tokenToDefaultAdvancePlusStrategies;

    constructor(address _registry) public {
        __Modifiers_init_unchained(_registry);
    }

    function setBestBasicStrategy(bytes32 _tokenHash, bytes32 _strategyHash) public onlyOperator {
        tokenToBestBasicStrategies[_tokenHash] = _strategyHash;
    }

    function setBestAdvanceStrategy(bytes32 _tokenHash, bytes32 _strategyHash) public onlyOperator {
        tokenToBestAdvanceStrategies[_tokenHash] = _strategyHash;
    }

    function setBestAdvancePlusStrategy(bytes32 _tokenHash, bytes32 _strategyHash) public onlyOperator {
        tokenToBestAdvancePlusStrategies[_tokenHash] = _strategyHash;
    }

    function setDefaultBasicStrategy(bytes32 _tokenHash, bytes32 _strategyHash) public onlyOperator {
        tokenToDefaultBasicStrategies[_tokenHash] = _strategyHash;
    }

    function setDefaultAdvanceStrategy(bytes32 _tokenHash, bytes32 _strategyHash) public onlyOperator {
        tokenToDefaultAdvanceStrategies[_tokenHash] = _strategyHash;
    }

    function setDefaultAdvancePlusStrategy(bytes32 _tokenHash, bytes32 _strategyHash) public onlyOperator {
        tokenToDefaultAdvancePlusStrategies[_tokenHash] = _strategyHash;
    }
}