// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

/**
 * @title IMultiCall
 *
 * @author Opty.fi
 *
 * @dev Interface for functions to batch together multi calls
 */
interface IMultiCall {
    function executeCode(bytes calldata _code, string calldata _errorMsg) external;

    function executeCodes(bytes[] calldata _codes, string calldata _errorMsg) external;
}
