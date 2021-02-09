// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "./../libraries/Addresses.sol";

/**
 * @dev Contract used to keep all the modifiers at one place
 */
contract ModifiersController {
    
    address public governance;
    address public operator;
    address public strategist;
    address public minter;
    
    using Address for address;
    
    /**
     * @dev Sets the owner, governance and strategist while deploying the contract
     */
    constructor (address _governance, address _strategist, address _operator, address _minter) internal {
        require(_governance != address(0),"!address(0)");
        governance = _governance;
        setStrategist(_strategist);
        setOperator(_operator);
        setMinter(_minter);
    }
    
    /**
     * @dev Transfers governance to a new account (`_governance`).
     * Can only be called by the current governance.
     */    
    function transferGovernance(address _governance) public onlyGovernance {
        require(_governance != address(0),"!address(0)");
        governance = _governance;
    }
    
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
