// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

/**
 * @dev Interface for Compound.finance Comptroller functions.
 */
interface IComptroller {
    function mintGuardianPaused(address liquidityPool) external view returns (bool);
}
