// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;

import "..//ERC20/IERC20.sol";

interface IAToken is IERC20{
    function redeem(uint256 amount) external;
    function isTransferAllowed(address user, uint256 amount) external returns(bool);
}