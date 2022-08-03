// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;
import { DataTypes } from './DataTypes.sol';

/**
 * @title interfaces to hold all LimitOrder Events
 * @author OptyFi
 */
interface ILimitOrderInternal {
    /**
     * @notice Logs when a LimitOrder is created
     * @param _order the order struct depicting the created LimitOrder
     */
    event LimitOrderCreated(DataTypes.Order _order);

    /**
     * @notice Logs when USDC is delivered to the maker of a LimitOrder post execution
     * @param _maker address of the maker of the LimitOrder
     * @param _amount the amount of USDC sent
     */
    event DeliverUSDC(address _maker, uint256 _amount);

    /**
     * @notice Logs when opVault shares are delivered to the maker of a LimitOrder post execution
     * @param _maker the address of the maker of the LimitOrder
     */
    event DeliverShares(address _maker);
}
