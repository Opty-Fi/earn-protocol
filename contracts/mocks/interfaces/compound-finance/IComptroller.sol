// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

/**
 * @dev Interface for Compound.finance Comptroller functions.
 */
interface IComptroller {
    function mintGuardianPaused(address liquidityPool) external view returns (bool);

    /*** The rate at which comp is distributed to the corresponding supply market (per block) ***/
    function compSupplySpeeds(address cToken) external view returns (uint256);
}
