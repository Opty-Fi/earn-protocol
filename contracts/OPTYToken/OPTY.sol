// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "./../utils/ERC20.sol";
import "./../utils/Modifiers.sol";

contract OPTY is ERC20, Modifiers {
    constructor(address _registry, uint256 initialSupply) public Modifiers(_registry) ERC20("Opty", "OPTY") {
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) public onlyMinter {
        _mint(to, amount);
    }
}