// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

/**
 * @dev Contract to store the state variables of the
 *      RiskManager
 */

contract RiskManagerStorage {
    /**
     * @notice Active brains of Risk Manager
     */
    address public riskManagerImplementation;
    /**
     * @notice Pending brains of Risk Manager
     */
    address public pendingRiskManagerImplementation;

    bytes32 public constant ZERO_BYTES32 = 0x0000000000000000000000000000000000000000000000000000000000000000;
}
