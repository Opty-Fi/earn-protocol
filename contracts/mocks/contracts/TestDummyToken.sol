// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestDummyToken is ERC20 {
    constructor(uint256 initialSupply) public ERC20("TestDummyToken", "TDT") {
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
