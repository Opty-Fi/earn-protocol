// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "./../../libraries/SafeMath.sol";
import "./../../libraries/Addresses.sol";
import "./../../libraries/SafeERC20.sol";
import "./../../utils/Context.sol";
import "./../../utils/ERC20.sol";
import "./../../utils/ERC20Detailed.sol";
import "./../../utils/Modifiers.sol";

/**
 * @dev Opty.Fi's Basic Pool contract for DAI token
 */
contract OptyDAI0Pool is ERC20, ERC20Detailed, Modifiers {
    using SafeERC20 for IERC20;
    
    address public token;   //  store the Dai token contract address
    
    /**
     * @dev 
     *  - Constructor used to initialise the Opty.Fi token name, symbol, decimals for DAI token
     *  - Storing the DAI contract address also in the contract
     */
    constructor () public ERC20Detailed("Opty Fi DAI", "opDai", 18) {
        token = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);    //  DAI token contract address
    }
    
    /**
     * @dev Function for depositing DAI tokens into the contract and in return giving opDai tokens to the user
     * 
     * Requirements:
     * 
     *  - Amount should be greater than 0
     *  - Amount is in wad units, Eg: _amount = 1e18 wad means _amount = 1 DAI
     */
    function invest(uint256 _amount) external nonReentrant returns(bool _success) {
        require(_amount > 0, "deposit must be greater than 0");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), _amount);
        
        //  Funtion to mint the opDai tokens for the user equivallent to _amount send as DAI tokens
        _mint(msg.sender, _amount);
        _success = true;
    }
}