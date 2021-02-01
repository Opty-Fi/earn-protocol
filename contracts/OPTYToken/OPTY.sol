// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "./../utils/ERC20.sol";
import "./../utils/ERC20Detailed.sol";

contract OPTY is ERC20, ERC20Detailed {
    constructor(uint256 initialSupply) ERC20Detailed("Opty", "OPTY", 18) public {
        _mint(msg.sender, initialSupply);
    }
}