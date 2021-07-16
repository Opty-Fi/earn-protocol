// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

// helper contracts
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Modifiers } from "../configuration/Modifiers.sol";

// interfaces
import { IOPTY } from "../../interfaces/opty/IOPTY.sol";

/**
 * @title Governance token of the opty.fi's earn protocol
 * @author opty.fi
 * @notice implementation of the $OPTY token contract
 */

contract OPTY is IOPTY, ERC20, Modifiers {
    constructor(address _registry, uint256 initialSupply) public Modifiers(_registry) ERC20("Opty", "OPTY") {
        // pre-mint initial $OPTY tokens for the opty.fi stake holders
        _mint(msg.sender, initialSupply);
    }

    /**
     * @inheritdoc IOPTY
     */
    function mint(address to, uint256 amount) external override onlyOPTYDistributor {
        _mint(to, amount);
    }
}
