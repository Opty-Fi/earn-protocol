// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "./OPTYMinterStorage.sol";
import "../utils/Modifiers.sol";

/**
 * @title OPTYMinterProxy
 * @dev Storage for the OPTYMinter is at this address, while execution is delegated to the `optyMinterImplementation`.
 * OPTYMinter should reference this contract as their controller.
 */
contract OPTYMinterProxy is OPTYMinterStorage, Modifiers {
    /**
     * @notice Emitted when pendingComptrollerImplementation is changed
     */
    event NewPendingImplementation(address oldPendingImplementation, address newPendingImplementation);

    /**
     * @notice Emitted when pendingComptrollerImplementation is accepted, which means comptroller implementation is updated
     */
    event NewImplementation(address oldImplementation, address newImplementation);

    constructor(address _registry) public Modifiers(_registry) {}

    /*** Admin Functions ***/
    function setPendingImplementation(address newPendingImplementation) public onlyOperator {
        address oldPendingImplementation = pendingOPTYMinterImplementation;

        pendingOPTYMinterImplementation = newPendingImplementation;

        emit NewPendingImplementation(oldPendingImplementation, pendingOPTYMinterImplementation);
    }

    /**
     * @notice Accepts new implementation of registry. msg.sender must be pendingImplementation
     * @dev Governance function for new implementation to accept it's role as implementation
     */
    function acceptImplementation() public returns (uint256) {
        // Check caller is pendingImplementation and pendingImplementation ≠ address(0)
        require(msg.sender == pendingOPTYMinterImplementation && pendingOPTYMinterImplementation != address(0), "!pendingOPTYMinterImplementation");

        // Save current values for inclusion in log
        address oldImplementation = optyMinterImplementation;
        address oldPendingImplementation = pendingOPTYMinterImplementation;

        optyMinterImplementation = pendingOPTYMinterImplementation;

        pendingOPTYMinterImplementation = address(0);

        emit NewImplementation(oldImplementation, optyMinterImplementation);
        emit NewPendingImplementation(oldPendingImplementation, pendingOPTYMinterImplementation);

        return uint256(0);
    }

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
        (bool success, ) = optyMinterImplementation.delegatecall(msg.data);

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
}
