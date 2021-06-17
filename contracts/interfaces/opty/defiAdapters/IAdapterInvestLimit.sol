// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import { DataTypes } from "../../../libraries/types/DataTypes.sol";

/**
 * @title Interface for setting deposit invest limit for DeFi adapters except Curve
 * @author Opty.fi
 * @notice Interface of the DeFi protocol adapter for setting invest limit for deposit
 * @dev Abstraction layer to different DeFi protocols like AaveV1, Compound etc except Curve.
 * It is used as an interface layer for setting max invest limit and its type in number or percentage for DeFi adapters
 */
interface IAdapterInvestLimit {
    /**
     * @notice Sets the default absolute max deposit value in underlying
     * @param _maxDepositAmountDefault absolute max deposit value in underlying to be set as default value
     */
    function setMaxDepositAmountDefault(uint256 _maxDepositAmountDefault) external;

    /**
     * @notice Sets the absolute max deposit value in underlying for the given liquidity pool
     * @param _liquidityPool liquidity pool address for which to set max deposit value (in absolute value)
     * @param _maxDepositAmount absolute max deposit amount in underlying to be set for given liquidity pool
     */
    function setMaxDepositAmount(address _liquidityPool, uint256 _maxDepositAmount) external;

    /**
     * @notice Sets the type of investment limit
     *                  1. Percentage of pool value
     *                  2. Amount in underlying token
     * @dev Types (can be number or percentage) supported for the maxDeposit value
     * @param _type Type of maxDeposit to be set (can be absolute value or percentage)
     */
    function setMaxDepositPoolType(DataTypes.MaxExposure _type) external;
}
