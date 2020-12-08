// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "./../libraries/Addresses.sol";

/**
 * @dev Contract used to keep all the modifiers at one place
 */
contract Modifiers {
    
    address public owner;
    address public governance;
    address public controller;
    
    using Address for address;
    
    /**
     * @dev Sets the owner, governance and strategist while deploying the contract
     */
    constructor () internal {
               owner = msg.sender;
          governance = msg.sender;
    }
    
    /**
     * @dev Function to check if the address is zero address or not
     */
    function isZeroAddress(address _address) internal pure returns(bool) {
        require(_address != address(0), "Modifiers: caller is zero address");
        return true;
    }
    
    /**
     * @dev Transfers governance to a new account (`_governance`).
     * Can only be called by the current governance.
     */    
    function transferGovernance(address _governance) public onlyGovernance {
        governance = _governance;
    }
    
    /**
     * @dev Transfers controller to a new account (`_governance`).
     * Can only be called by the governance.
     */    
    function setController(address _controller) public onlyGovernance {
        require(_controller.isContract(),"!isContract");
        controller = _controller;
    }
    
    /**
     * @dev Transfers ownership to a new account (`_owner`).
     * Can only be called by the current owner.
     */    
    function transferOwnership(address _owner) public onlyOwner {
        owner = _owner;
    }
    
    /**
     * @dev Modifier to check if the address is zero address or not
     */
    modifier onlyValidAddress() {
        require(msg.sender != address(0), "caller is zero address");
        _;
    }
    
    /**
     * @dev Modifier to check caller is owner or not
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "caller is not owner");
        _;
    }
    
    /**
     * @dev Modifier to check caller is governance or not
     */
    modifier onlyGovernance() {
        require(msg.sender == governance, "caller is not having governance");
        _;
    }
    
    /**
     * @dev Modifier to check caller is controller or not
     */
    modifier onlyController() {
        require(msg.sender == controller, "caller is not constructor");
        _;
    }
}