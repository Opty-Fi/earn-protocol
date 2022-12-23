// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

//  libraries
import { Address } from "@openzeppelin/contracts/utils/Address.sol";

//  interfaces
import { IRegistry } from "../earn-protocol-configuration/contracts/interfaces/opty/IRegistry.sol";
import { IModifiers } from "../earn-protocol-configuration/contracts/interfaces/opty/IModifiers.sol";

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
    function setRegistry(address _registry) external override {
        _onlyOperator();
        require(_registry.isContract(), "!isContract");
        registryContract = IRegistry(_registry);
    }

    function _onlyGovernance() internal view {
        _onlyAuthorizedUser(registryContract.getGovernance(), "caller is not having governance");
    }

    function _onlyFinanceOperator() internal view {
        _onlyAuthorizedUser(registryContract.getFinanceOperator(), "caller is not the financeOperator");
    }

    function _onlyRiskOperator() internal view {
        _onlyAuthorizedUser(registryContract.getRiskOperator(), "caller is not the riskOperator");
    }

    function _onlyOperator() internal view {
        _onlyAuthorizedUser(registryContract.getOperator(), "caller is not the operator");
    }

    function _onlyStrategyOperator() internal view {
        _onlyAuthorizedUser(registryContract.getStrategyOperator(), "caller is not the strategyOperator");
    }

    function _onlyOptyDistributor() internal view {
        _onlyAuthorizedUser(registryContract.getOPTYDistributor(), "!optyDistributor");
    }

    function _onlyRegistry() internal view {
        _onlyAuthorizedUser(address(registryContract), "!Registry Contract");
    }

    function _onlyAuthorizedUser(address authorizedUserAddress, string memory errorMessage) private view {
        require(msg.sender == authorizedUserAddress, errorMessage);
    }
}
