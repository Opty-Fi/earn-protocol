// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

/**
 * @title Interface for ModifiersController Contract
 * @author Opty.fi
 * @notice Interface used to authorize operator and minter accounts
 */
interface IModifiersController {
    /**
     * @notice Transfers operator to a new account (`_operator`)
     * @param _operator address of Operator's account
     */
    function setOperator(address _operator) external;

    /**
     * @notice Transfers optyDistributor to a new account (`_optyDistributor`)
     * @param _optyDistributor address of optyDistributor's account
     */
    function setOPTYDistributor(address _optyDistributor) external;
}
