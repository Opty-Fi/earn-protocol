// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

/**
 * @title Interface for setting deposit invest limit for Curve adapter
 * @author Opty.fi
 * @notice Interface for Curve adapters for setting invest limit for deposit
 * @dev Abstraction layer to Curve Adapters.
 * It is used as an interface layer for setting max invest limit and its type in number or percentage for Curve adapters
 */
interface IAdapterCurveInvestLimit {
    /**
     * @notice Sets the default absolute max deposit value in underlying
     * @param _maxDepositAmountDefault array of 4 absolute max deposit values in underlying to be set as default value
     */
    function setMaxDepositAmountDefault(uint256[4] memory _maxDepositAmountDefault) external;

    /**
     * @notice Sets the absolute max deposit value in underlying for the given liquidity pool
     * @param _liquidityPool liquidity pool address for which to set max deposit value (in absolute value)
     * @param _maxDepositAmount Array of 2 Pool's max deposit value in number to be set for the given liquidity pool
     */
    function setMaxDeposit2Amount(address _liquidityPool, uint256[2] memory _maxDepositAmount) external;

    /**
     * @notice Sets the absolute max deposit value in underlying for the given liquidity pool
     * @param _liquidityPool liquidity pool address for which to set max deposit value (in absolute value)
     * @param _maxDepositAmount Array of 3 Pool's max deposit value in number to be set for the given liquidity pool
     */
    function setMaxDeposit3Amount(address _liquidityPool, uint256[3] memory _maxDepositAmount) external;

    /**
     * @notice Sets the absolute max deposit value in underlying for the given liquidity pool
     * @param _liquidityPool liquidity pool address for which to set max deposit value (in absolute value)
     * @param _maxDepositAmount Array of 4 Pool's max deposit value in number to be set for the given liquidity pool
     */
    function setMaxDeposit4Amount(address _liquidityPool, uint256[4] memory _maxDepositAmount) external;
}
