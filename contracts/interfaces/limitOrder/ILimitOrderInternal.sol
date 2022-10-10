// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { DataTypes } from "../../limitOrder/DataTypes.sol";

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
     * @notice Logs when opVault shares are delivered to the maker of a LimitOrder post execution
     * @param _maker the address of the maker of the LimitOrder
     */
    event DeliverShares(address _maker);
}
