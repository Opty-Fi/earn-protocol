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
     * @notice Sets the absolute max deposit value in underlying for the given liquidity pool
     * @param _liquidityPool liquidity pool address for which to set max deposit value (in absolute value)
     * @param _maxDepositAmount absolute max deposit amount in underlying to be set for given liquidity pool
     */
    function setMaxDepositAmount(address _liquidityPool, uint256 _maxDepositAmount) external;

    /**
     * @notice Sets the percentage of max deposit value for the given liquidity pool
     * @param _liquidityPool liquidity pool address
     * @param _maxDepositPoolPct liquidity pool's max deposit percentage (in basis points, For eg: 50% means 5000)
     */
    function setMaxDepositPoolPct(address _liquidityPool, uint256 _maxDepositPoolPct) external;

    /**
     * @notice Sets the percentage of max deposit protocol value
     * @param _maxDepositProtocolPct protocol's max deposit percentage (in basis points, For eg: 50% means 5000)
     */
    function setMaxDepositProtocolPct(uint256 _maxDepositProtocolPct) external;

    /**
     * @notice Sets the type of investment limit
     *                  1. Percentage of pool value
     *                  2. Amount in underlying token
     * @dev Types (can be number or percentage) supported for the maxDeposit value
     * @param _mode Mode of maxDeposit to be set (can be absolute value or percentage)
     */
    function setMaxDepositProtocolMode(DataTypes.MaxExposure _mode) external;
}
