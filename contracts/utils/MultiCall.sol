// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;
import { IMultiCall } from "../interfaces/opty/IMultiCall.sol";

/**
 * @title MultiCall Contract
 *
 * @author Opty.fi
 *
 * @dev Provides functions used commonly for decoding codes and execute
 *      the code calls for Opty.Fi contracts
 */
abstract contract MultiCall is IMultiCall {
    /**
     * @notice Function for executing any functionlaity and check if it is working or not
     *
     * @dev Function to execute the code and revert with error message if code provided is incorrect
     *
     * @param _code Encoded data in bytes which acts as code to execute
     * @param _errorMsg Error message to throw when code execution call fails
     */
    function executeCode(bytes memory _code, string memory _errorMsg) public override {
        (address _contract, bytes memory _data) = abi.decode(_code, (address, bytes));
        (bool _success, ) = _contract.call(_data); //solhint-disable-line avoid-low-level-calls
        require(_success, _errorMsg);
    }

    /**
     * @notice Function for executing bunch of functionlaities and check if they are working or not
     *
     * @dev Function to execute the codes array and revert with error message if code provided is incorrect
     *
     * @param _codes Array of encoded data in bytes which acts as code to execute
     * @param _errorMsg Error message to throw when code execution call fails
     */
    function executeCodes(bytes[] memory _codes, string memory _errorMsg) public override {
        for (uint8 _j = 0; _j < uint8(_codes.length); _j++) {
            executeCode(_codes[_j], _errorMsg);
        }
    }
}
