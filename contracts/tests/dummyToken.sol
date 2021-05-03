// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DummyToken is ERC20 {
    constructor(uint256 initialSupply) public ERC20("DummyToken", "DT") {
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
