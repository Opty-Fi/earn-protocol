// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "./../../libraries/SafeMath.sol";
import "./../../libraries/Addresses.sol";
import "./../../libraries/SafeERC20.sol";
import "./../../utils/Context.sol";
import "./../../utils/ERC20.sol";
import "./../../utils/ERC20Detailed.sol";
import "./../../utils/Modifiers.sol";

contract OptyDAI0Pool is ERC20, ERC20Detailed, Modifiers {
    using SafeERC20 for IERC20;
    
    address public token;
    address public compound;
    
    constructor () public ERC20Detailed("Opty Fi DAI", "opDai", 18) {
        token = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);    //  DAI token contract address
        
    }
    
    function invest(uint256 _amount) external nonReentrant returns(bool _success) {
        require(_amount > 0, "deposit must be greater than 0");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), _amount);
        
        _mint(msg.sender, _amount); 
        _success = true;
    }

}