// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

/**
 * @title MultiCall Contract
 * @author Opty.fi
 * @dev Provides functions used commonly for decoding codes and execute
 * the code calls for Opty.fi contracts
 */
abstract contract MultiCall {
    function executeCode(bytes memory _code, string memory _errorMsg) internal {
        (address _contract, bytes memory _data) = abi.decode(_code, (address, bytes));
        (bool _success, bytes memory _returnData) = _contract.call(_data); //solhint-disable-line avoid-low-level-calls
        require(_success, _getRevertMsg(_returnData, _errorMsg));
    }

    function executeCodes(bytes[] memory _codes, string memory _errorMsg) internal {
        for (uint256 _j = 0; _j < _codes.length; _j++) {
            executeCode(_codes[_j], _errorMsg);
        }
    }

    function _getRevertMsg(bytes memory _returnData, string memory _errorMsg) internal pure returns (string memory) {
        // If the _res length is less than 68, then the transaction failed silently (without a revert message)
        if (_returnData.length < 68) return _errorMsg;

        assembly {
            // Slice the sighash.
            _returnData := add(_returnData, 0x04)
        }
        return abi.decode(_returnData, (string)); // All that remains is the revert string
    }
}
