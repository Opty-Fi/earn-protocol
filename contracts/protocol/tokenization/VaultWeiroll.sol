// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "./VM.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract VaultWeiroll is VM, ERC20 {
    // command to
    // struct Abc {
    //     mapping(uint256 => bytes32) commands;
    //     mapping(uint256 => bytes) state;
    // }

    // Abc internal abc;

    constructor() public ERC20("Test", "TST") {}

    function userDepositVault(uint256 _amount) external {
        // bytes32[] memory _com = new bytes32[](1);
        // bytes[] memory _state = new bytes[](1);
        // _com[0] = abc.commands[0];
        // _state[0] = abc.state[0];
        bytes32[] memory commands = new bytes32[](1);
        bytes[] memory state = new bytes[](1);
        _execute(commands, state);
    }
}
