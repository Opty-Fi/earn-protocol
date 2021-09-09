// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

//  helper contracts
import { Modifiers } from "./Modifiers.sol";
import { RiskManagerStorage } from "./RiskManagerStorage.sol";

/**
 * @title RiskManagerProxy Contract
 * @author Opty.fi
 * @dev Storage for the RiskManager is at this address, while execution is delegated to the
 * riskManagerImplementation. RiskManager should reference this contract as their controller.
 * It defines a fallback function that delegates all calls to the address returned by the
 * abstract _implementation() internal function.
 */
contract RiskManagerProxy is RiskManagerStorage, Modifiers {
    /**
     * @notice Emitted when pendingRiskManagerImplementation is changed
     * @param oldPendingImplementation Old RiskManager contract's implementation address which is still pending
     * @param newPendingImplementation New RiskManager contract's implementation address which is still pending
     */
    event NewPendingImplementation(address oldPendingImplementation, address newPendingImplementation);

    /**
     * @notice Emitted when RiskManager implementation is updated
     * @param oldImplementation Old RiskManager Contract's implementation address
     * @param newImplementation New RiskManager Contract's implementation address
     */
    event NewImplementation(address oldImplementation, address newImplementation);

    /* solhint-disable no-empty-blocks */
    constructor(address _registry) public Modifiers(_registry) {}

    /* solhint-disable */
    receive() external payable {
        revert();
    }

    /**
     * @notice Delegates execution to an riskManager implementation contract
     * @dev Returns to external caller whatever implementation returns or forwards reverts
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

    /*** Admin Functions ***/
    /**
     * @dev Set the riskManager contract as pending implementation initally
     * @param newPendingImplementation riskManager address to act as pending implementation
     */
    function setPendingImplementation(address newPendingImplementation) external onlyOperator {
        address oldPendingImplementation = pendingRiskManagerImplementation;

        pendingRiskManagerImplementation = newPendingImplementation;

        emit NewPendingImplementation(oldPendingImplementation, pendingRiskManagerImplementation);
    }

    /**
     * @notice Accepts new implementation of riskManager
     * @dev Governance function for new implementation to accept it's role as implementation
     */
    function acceptImplementation() external returns (uint256) {
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
}
