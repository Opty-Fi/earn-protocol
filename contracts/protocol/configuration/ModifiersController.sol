// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

//  libraries
import { Address } from "@openzeppelin/contracts/utils/Address.sol";

//  helper contracts
import { RegistryStorage } from "./RegistryStorage.sol";

//  interfaces
import { IModifiersController } from "../../interfaces/opty/IModifiersController.sol";

/**
 * @title ModifiersController Contract
 * @author Opty.fi
 * @notice Contract used by registry contract and acts as source of truth
 * @dev It manages operator, optyDistributor addresses as well as modifiers
 */
abstract contract ModifiersController is IModifiersController, RegistryStorage {
    using Address for address;

    /**
     * @inheritdoc IModifiersController
     */
    function setOperator(address _operator) public override onlyGovernance {
        require(_operator != address(0), "!address(0)");
        operator = _operator;
        emit TransferOperator(operator, msg.sender);
    }

    /**
     * @inheritdoc IModifiersController
     */
    function setOPTYDistributor(address _optyDistributor) public override onlyGovernance {
        require(_optyDistributor != address(0), "!address(0)");
        optyDistributor = _optyDistributor;
        emit TransferOPTYDistributor(optyDistributor, msg.sender);
    }

    /**
     * @notice Modifier to check caller is governance or not
     */
    modifier onlyGovernance() {
        require(msg.sender == governance, "caller is not having governance");
        _;
    }

    /**
     * @notice Modifier to check caller is operator or not
     */
    modifier onlyOperator() {
        require(msg.sender == operator, "caller is not the operator");
        _;
    }

    /**
     * @notice Modifier to check caller is optyDistributor or not
     */
    modifier onlyOptyDistributor() {
        require(msg.sender == optyDistributor, "caller is not the optyDistributor");
        _;
    }
}
