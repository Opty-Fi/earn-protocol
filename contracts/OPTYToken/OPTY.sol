// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "./../utils/ERC20.sol";
import "./../utils/ERC20Detailed.sol";
import "./../utils/Modifiers.sol";

contract OPTY is ERC20, ERC20Detailed, Modifiers {
    constructor(address _registry, uint256 initialSupply) public ERC20Detailed("Opty", "OPTY", 18) Modifiers(_registry) {
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) public onlyMinter {
        _mint(to, amount);
    }
}
