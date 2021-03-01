// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "./../libraries/Addresses.sol";
import "./RegistryStorage.sol";

/**
 * @dev Contract used to keep all the modifiers at one place
 */
contract ModifiersController is RegistryStorage {
    using Address for address;
    
    /**
     * @dev Transfers operator to a new account (`_governance`).
     * Can only be called by the governance.
     */    
    function setOperator(address _operator) public onlyGovernance {
        require(_operator != address(0),"!address(0)");
        operator = _operator;
    }
    
    /**
     * @dev Transfers strategist to a new account (`_strategist`).
     * Can only be called by the current governance.
     */   
    function setStrategist(address _strategist) public onlyGovernance {
        require(_strategist != address(0),"!address(0)");
        strategist = _strategist;
    }
    
    /**
     * @dev Transfers minter to a new account (`_minter`).
     * Can only be called by the current governance.
     */   
    function setMinter(address _minter) public onlyGovernance {
        require(_minter != address(0),"!address(0)");
        minter = _minter;
    }
    
    /**
     * @dev Modifier to check caller is governance or not
     */
    modifier onlyGovernance() {
        require(msg.sender == governance, "caller is not having governance");
        _;
    }
    
    /**
     * @dev Modifier to check caller is operator or not
     */
    modifier onlyOperator() {
        require(msg.sender == operator, "caller is not the operator");
        _;
    }
    
    /**
     * @dev Modifier to check caller is strategist or not
     */
    modifier onlyStrategist() {
        require(msg.sender == strategist, "caller is not the strategist");
        _;
    }
    
    /**
     * @dev Modifier to check caller is minter or not
     */
    modifier onlyMinter() {
        require(msg.sender == minter, "caller is not the minter");
        _;
    }
}
