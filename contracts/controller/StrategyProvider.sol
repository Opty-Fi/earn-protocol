// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "../utils/Modifiers.sol";

contract StrategyProvider is Modifiers {
    mapping(string => mapping(bytes32 => bytes32)) public rpToTokenToBestStrategy;
    mapping(string => mapping(bytes32 => bytes32)) public rpToTokenToDefaultStrategy;

    constructor(address _registry) public Modifiers(_registry) {}

    function setBestStrategy(string memory _riskProfile, bytes32 _tokenHash, bytes32 _strategyHash) public onlyOperator {
        (,,bool _profileExists) = registryContract.riskProfiles(_riskProfile);
        require(_profileExists, "!Rp_Exists");
        rpToTokenToBestStrategy[_riskProfile][_tokenHash] = _strategyHash;
    }
    
    function setBestDefaultStrategy(string memory _riskProfile, bytes32 _tokenHash, bytes32 _strategyHash) public onlyOperator {
        (,,bool _profileExists) = registryContract.riskProfiles(_riskProfile);
        require(_profileExists, "!Rp_Exists");
        rpToTokenToDefaultStrategy[_riskProfile][_tokenHash] = _strategyHash;
    }
}