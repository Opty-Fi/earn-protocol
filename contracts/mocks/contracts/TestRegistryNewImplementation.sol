// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import { ModifiersController } from "../../protocol/configuration/ModifiersController.sol";
import { RegistryProxy } from "../../protocol/configuration/RegistryProxy.sol";
import { RegistryStorage } from "../../protocol/configuration/RegistryStorage.sol";
import { NewImplementationStorage } from "./NewImplementationStorage.sol";

contract TestRegistryNewImplementation is RegistryStorage, ModifiersController, NewImplementationStorage {
    /**
     * @dev Set TestRegistryNewImplementation to act as Registry
     * @param _registryProxy RegistryProxy Contract address to act as Registry
     */
    function become(RegistryProxy _registryProxy) external {
        require(msg.sender == _registryProxy.governance(), "!governance");
        require(_registryProxy.acceptImplementation() == 0, "!unauthorized");
    }

    function isNewContract() external view returns (bool) {
        return isNewVariable;
    }

    function getTokensHashToTokenList(bytes32 _tokensHash) public view returns (address[] memory) {
        return tokensHashToTokens[_tokensHash].tokens;
    }

    function getTokensHashByIndex(uint256 _index) public view returns (bytes32) {
        return tokensHashIndexes[_index];
    }
}