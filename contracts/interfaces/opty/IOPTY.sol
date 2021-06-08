// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

/**
 * @title Interface for the OPTY token
 * @author opty.fi
 * @notice Contains minting functionality required for OPTY token
 */
interface IOPTY {
    /**
     * @notice Mint new $OPTY tokens only by authorized minter
     * @param to account to receive the minted $OPTY
     * @param amount amount of new $OPTY minted
     */
    function mint(address to, uint256 amount) external;
}
