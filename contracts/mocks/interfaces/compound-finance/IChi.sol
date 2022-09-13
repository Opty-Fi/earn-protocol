// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

/**
 * @dev Interface of the Opty.fi Vaults.
 */
interface IChi {
    function mint(uint256 value) external;

    function balanceOf(address user) external view returns (uint256);
}
