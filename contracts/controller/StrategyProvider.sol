// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "../utils/Modifiers.sol";

contract StrategyProvider is Modifiers {
    mapping(bytes32 => bytes32) public tokenToBestRP1Strategies;
    mapping(bytes32 => bytes32) public tokenToDefaultRP1Strategies;
    mapping(bytes32 => bytes32) public tokenToBestRP2Strategies;
    mapping(bytes32 => bytes32) public tokenToDefaultRP2Strategies;
    mapping(bytes32 => bytes32) public tokenToBestRP3Strategies;
    mapping(bytes32 => bytes32) public tokenToDefaultRP3Strategies;

    constructor(address _registry) public Modifiers(_registry) {}

    function setBestRP1Strategy(bytes32 _tokenHash, bytes32 _strategyHash) public onlyOperator {
        tokenToBestRP1Strategies[_tokenHash] = _strategyHash;
    }

    function setBestRP2Strategy(bytes32 _tokenHash, bytes32 _strategyHash) public onlyOperator {
        tokenToBestRP2Strategies[_tokenHash] = _strategyHash;
    }

    function setBestRP3Strategy(bytes32 _tokenHash, bytes32 _strategyHash) public onlyOperator {
        tokenToBestRP3Strategies[_tokenHash] = _strategyHash;
    }

    function setDefaultRP1Strategy(bytes32 _tokenHash, bytes32 _strategyHash) public onlyOperator {
        tokenToDefaultRP1Strategies[_tokenHash] = _strategyHash;
    }

    function setDefaultRP2Strategy(bytes32 _tokenHash, bytes32 _strategyHash) public onlyOperator {
        tokenToDefaultRP2Strategies[_tokenHash] = _strategyHash;
    }

    function setDefaultRP3Strategy(bytes32 _tokenHash, bytes32 _strategyHash) public onlyOperator {
        tokenToDefaultRP3Strategies[_tokenHash] = _strategyHash;
    }
}