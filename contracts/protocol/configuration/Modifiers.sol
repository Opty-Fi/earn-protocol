// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

//  libraries
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { DataTypes } from "../../libraries/types/DataTypes.sol";

//  interfaces
import { IRegistry } from "../../interfaces/opty/IRegistry.sol";
import { IModifiers } from "../../interfaces/opty/IModifiers.sol";

/**
 * @title Modifiers Contract
 * @author Opty.fi
 * @notice Contract used to keep all the modifiers at one place
 * @dev Contract is used throughout the contracts expect registry contract
 */
abstract contract Modifiers is IModifiers {
    /**
     * @notice Registry contract instance address
     */
    IRegistry public registryContract;

    using Address for address;

    constructor(address _registry) internal {
        registryContract = IRegistry(_registry);
    }

    /**
     * @inheritdoc IModifiers
     */
    function setRegistry(address _registry) external override onlyOperator {
        require(_registry.isContract(), "!isContract");
        registryContract = IRegistry(_registry);
    }

    /**
     * @notice Modifier to check if the address is zero address or not
     */
    modifier onlyValidAddress() {
        require(msg.sender != address(0), "caller is zero address");
        _;
    }

    /**
     * @notice Modifier to check caller is governance or not
     */
    modifier onlyGovernance() {
        require(msg.sender == registryContract.getGovernance(), "caller is not having governance");
        _;
    }

    /**
     * @notice Modifier to check caller is financeOperator or not
     */
    modifier onlyFinanceOperator() {
        require(msg.sender == registryContract.getFinanceOperator(), "caller is not the financeOperator");
        _;
    }

    /**
     * @notice Modifier to check caller is riskOperator or not
     */
    modifier onlyRiskOperator() {
        require(msg.sender == registryContract.getRiskOperator(), "caller is not the riskOperator");
        _;
    }

    /**
     * @notice Modifier to check caller is operator or not
     */
    modifier onlyStrategyOperator() {
        require(msg.sender == registryContract.getStrategyOperator(), "caller is not the strategyOperator");
        _;
    }

    /**
     * @notice Modifier to check caller is operator or not
     */
    modifier onlyOperator() {
        require(msg.sender == registryContract.getOperator(), "caller is not the operator");
        _;
    }

    /**
     * @notice Modifier to check caller is optyDistributor or not
     */
    modifier onlyOPTYDistributor() {
        require(msg.sender == registryContract.getOPTYDistributor(), "!optyDistributor");
        _;
    }

    /**
     * @notice Modifier to check if vault is unpaused or discontinued
     * @param _vault Address of vault/stakingVault contract to disconitnue
     */
    modifier ifNotPausedAndDiscontinued(address _vault) {
        _ifNotPausedAndDiscontinued(_vault);
        _;
    }

    /**
     * @notice Modifier to check caller is registry or not
     */
    modifier onlyRegistry() {
        require(msg.sender == address(registryContract), "!Registry Contract");
        _;
    }

    function _ifNotPausedAndDiscontinued(address _vault) internal view {
        DataTypes.VaultConfiguration memory _vaultConfiguration = registryContract.getVaultConfiguration(_vault);
        require(_vaultConfiguration.unpaused && !_vaultConfiguration.discontinued, "paused or discontinued");
    }

    /**
     * @notice Checks if vault contract is paused or unpaused from usage
     * @param _vault Address of vault/stakingVault contract to pause/unpause
     */
    function _isUnpaused(address _vault) internal view {
        DataTypes.VaultConfiguration memory _vaultConfiguration = registryContract.getVaultConfiguration(_vault);
        require(_vaultConfiguration.unpaused, "paused");
    }
}
