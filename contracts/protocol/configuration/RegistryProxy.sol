// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import { RegistryStorage } from "./RegistryStorage.sol";
import { ModifiersController } from "./ModifiersController.sol";

/**
 * @title RegistryCore
 * @dev Storage for the Registry is at this address, while execution is delegated to the `registryImplementation`.
 * Registry should reference this contract as their controller.
 */
contract RegistryProxy is RegistryStorage, ModifiersController {
    /**
     * @notice Emitted when pendingComptrollerImplementation is changed
     */
    event NewPendingImplementation(address oldPendingImplementation, address newPendingImplementation);

    /**
     * @notice Emitted when pendingComptrollerImplementation is accepted,
     *         which means comptroller implementation is updated
     */
    event NewImplementation(address oldImplementation, address newImplementation);

    /**
     * @notice Emitted when pendingGovernance is changed
     */
    event NewPendingGovernance(address oldPendingGovernance, address newPendingGovernance);

    /**
     * @notice Emitted when pendingGovernance is accepted, which means governance is updated
     */
    event NewGovernance(address oldGovernance, address newGovernance);

    constructor() public {
        governance = msg.sender;
        setStrategist(msg.sender);
        setOperator(msg.sender);
        setOPTYMinter(msg.sender);
    }

    /*** Admin Functions ***/
    function setPendingImplementation(address newPendingImplementation) public onlyOperator {
        address oldPendingImplementation = pendingRegistryImplementation;

        pendingRegistryImplementation = newPendingImplementation;

        emit NewPendingImplementation(oldPendingImplementation, pendingRegistryImplementation);
    }

    /**
     * @notice Accepts new implementation of registry. msg.sender must be pendingImplementation
     * @dev Governance function for new implementation to accept it's role as implementation
     */
    function acceptImplementation() public returns (uint256) {
        // Check caller is pendingImplementation and pendingImplementation ≠ address(0)
        require(
            msg.sender == pendingRegistryImplementation && pendingRegistryImplementation != address(0),
            "!pendingRegistryImplementation"
        );

        // Save current values for inclusion in log
        address oldImplementation = registryImplementation;
        address oldPendingImplementation = pendingRegistryImplementation;

        registryImplementation = pendingRegistryImplementation;

        pendingRegistryImplementation = address(0);

        emit NewImplementation(oldImplementation, registryImplementation);
        emit NewPendingImplementation(oldPendingImplementation, pendingRegistryImplementation);

        return uint256(0);
    }

    /**
     * @notice Begins transfer of governance rights.
     *         The newPendingGovernance must call `acceptGovernance`
     *         to finalize the transfer.
     * @dev Governance function to begin change of governance.
     *      The newPendingGovernance must call `acceptGovernance`
     *      to finalize the transfer.
     * @param newPendingGovernance New pending governance.
     */
    function setPendingGovernance(address newPendingGovernance) public onlyOperator {
        // Save current value, if any, for inclusion in log
        address oldPendingGovernance = pendingGovernance;

        // Store pendingGovernance with value newPendingGovernance
        pendingGovernance = newPendingGovernance;

        // Emit NewPendingGovernance(oldPendingGovernance, newPendingGovernance)
        emit NewPendingGovernance(oldPendingGovernance, newPendingGovernance);
    }

    /**
     * @notice Accepts transfer of Governance rights. msg.sender must be pendingGovernance
     * @dev Governance function for pending governance to accept role and update Governance
     */
    function acceptGovernance() public returns (uint256) {
        require(msg.sender == pendingGovernance && msg.sender != address(0), "!pendingGovernance");

        // Save current values for inclusion in log
        address oldGovernance = governance;
        address oldPendingGovernance = pendingGovernance;

        // Store admin with value pendingGovernance
        governance = pendingGovernance;

        // Clear the pending value
        pendingGovernance = address(0);

        emit NewGovernance(oldGovernance, governance);
        emit NewPendingGovernance(oldPendingGovernance, pendingGovernance);
        return uint256(0);
    }

    /* solhint-disable */
    receive() external payable {
        revert();
    }

    /**
     * @dev Delegates execution to an implementation contract.
     * It returns to the external caller whatever the implementation returns
     * or forwards reverts.
     */
    fallback() external payable {
        // delegate all other functions to current implementation
        (bool success, ) = registryImplementation.delegatecall(msg.data);

        assembly {
            let free_mem_ptr := mload(0x40)
            returndatacopy(free_mem_ptr, 0, returndatasize())

            switch success
                case 0 {
                    revert(free_mem_ptr, returndatasize())
                }
                default {
                    return(free_mem_ptr, returndatasize())
                }
        }
    }
    /* solhint-disable */
}
