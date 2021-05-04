// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import { Modifiers } from "./Modifiers.sol";
import { RiskManagerStorage } from "./RiskManagerStorage.sol";

/**
 * @title RiskManagerCore
 * @dev Storage for the RiskManager is at this address, while execution is delegated to the `riskManagerImplementation`.
 * RiskManager should reference this contract as their controller.
 */
contract RiskManagerProxy is RiskManagerStorage, Modifiers {
    /**
     * @notice Emitted when pendingRiskManagerImplementation is changed
     */
    event NewPendingImplementation(address oldPendingImplementation, address newPendingImplementation);

    /**
     * @notice Emitted when RiskManager implementation is updated
     */
    event NewImplementation(address oldImplementation, address newImplementation);

    // solhint-disable no-empty-blocks
    constructor(address _registry) public Modifiers(_registry) {}

    /*** Admin Functions ***/
    function setPendingImplementation(address newPendingImplementation) public onlyOperator {
        address oldPendingImplementation = pendingRiskManagerImplementation;

        pendingRiskManagerImplementation = newPendingImplementation;

        emit NewPendingImplementation(oldPendingImplementation, pendingRiskManagerImplementation);
    }

    /**
     * @notice Accepts new implementation of riskManager. msg.sender must be pendingImplementation
     * @dev Governance function for new implementation to accept it's role as implementation
     */
    function acceptImplementation() public returns (uint256) {
        // Check caller is pendingImplementation and pendingImplementation ≠ address(0)
        require(
            msg.sender == pendingRiskManagerImplementation && pendingRiskManagerImplementation != address(0),
            "!pendingRiskManagerImplementation"
        );

        // Save current values for inclusion in log
        address oldImplementation = riskManagerImplementation;
        address oldPendingImplementation = pendingRiskManagerImplementation;

        riskManagerImplementation = pendingRiskManagerImplementation;

        pendingRiskManagerImplementation = address(0);

        emit NewImplementation(oldImplementation, riskManagerImplementation);
        emit NewPendingImplementation(oldPendingImplementation, pendingRiskManagerImplementation);

        return uint256(0);
    }

    /* solhint-disable */
    receive() external payable {
        revert();
    }

    /**
     * @dev Delegates execution to an riskManager implementation contract.
     * It returns to the external caller whatever the implementation returns
     * or forwards reverts.
     */
    fallback() external payable {
        // delegate all other functions to current implementation
        (bool success, ) = riskManagerImplementation.delegatecall(msg.data);

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
