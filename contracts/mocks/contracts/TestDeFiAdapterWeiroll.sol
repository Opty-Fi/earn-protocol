// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "../../protocol/tokenization/VM.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

contract TestDeFiAdapterWeiroll is VM {
    using SafeERC20 for ERC20;

    function executeVMCommands(bytes32[] calldata commands, bytes[] memory state) external {
        _writeExecute(commands, state);
    }

    function giveAllowances(ERC20[] calldata _tokens, address[] calldata _spenders) external {
        uint256 _tokensLen = _tokens.length;
        require(_tokensLen == _spenders.length, "!LENGTH_MISMATCH");
        for (uint256 _i; _i < _tokens.length; _i++) {
            _tokens[_i].safeApprove(_spenders[_i], type(uint256).max);
        }
    }

    fallback() external payable {}
}
