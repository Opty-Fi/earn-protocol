// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { DataTypes } from "../../libraries/types/DataTypes.sol";
import { IRegistry } from "../../interfaces/opty/IRegistry.sol";
import { IModifiers } from "../../interfaces/opty/IModifiers.sol";

/**
 * @dev Contract used to keep all the modifiers at one place
 */
abstract contract Modifiers is IModifiers {
    IRegistry public registryContract;

    using Address for address;

    /**
     * @dev Sets the owner, governance while deploying the contract
     */
    constructor(address _registry) internal {
        registryContract = IRegistry(_registry);
    }

    function setRegistry(address _registry) public override onlyOperator {
        registryContract = IRegistry(_registry);
    }

    /**
     * @dev Modifier to check if the address is zero address or not
     */
    modifier onlyValidAddress() {
        require(msg.sender != address(0), "caller is zero address");
        _;
    }

    /**
     * @dev Modifier to check caller is governance or not
     */
    modifier onlyGovernance() {
        require(msg.sender == registryContract.getGovernance(), "caller is not having governance");
        _;
    }

    /**
     * @dev Modifier to check caller is operator or not
     */
    modifier onlyOperator() {
        require(msg.sender == registryContract.getOperator(), "caller is not the operator");
        _;
    }

    /**
     * @dev Modifier to check caller is minter or not
     */
    modifier onlyMinter() {
        require(msg.sender == registryContract.getOptyMinter(), "!minter");
        _;
    }

    modifier ifNotPausedAndDiscontinued(address _vault) {
        _ifNotPausedAndDiscontinued(_vault);
        _;
    }

    modifier onlyRegistry() {
        require(msg.sender == address(registryContract), "!Registry Contract");
        _;
    }

    function _ifNotPausedAndDiscontinued(address _vault) internal view {
        DataTypes.VaultConfiguration memory _vaultConfiguration = registryContract.getVaultConfiguration(_vault);
        require(_vaultConfiguration.unpaused && !_vaultConfiguration.discontinued, "paused or discontinued");
    }

    function _isUnpaused(address _vault) internal view {
        DataTypes.VaultConfiguration memory _vaultConfiguration = registryContract.getVaultConfiguration(_vault);
        require(_vaultConfiguration.unpaused, "paused");
    }
}
