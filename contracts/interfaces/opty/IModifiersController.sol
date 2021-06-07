// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

/**
 * @dev Interface used to authorize and keep all the modifiers at one place
 */
interface IModifiersController {
    /**
     * @dev Transfers operator to a new account (`_governance`).
     * Can only be called by the governance.
     */

    function setOperator(address _operator) external;

    /**
     * @dev Transfers minter to a new account (`_minter`).
     * Can only be called by the current governance.
     */

    function setOPTYMinter(address _minter) external;
}
