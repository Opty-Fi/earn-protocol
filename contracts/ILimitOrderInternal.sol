// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;
import { DataTypes } from './DataTypes.sol';

/**
 * @title interfaces to hold all LimitOrder Events
 * @author OptyFi
 */
interface ILimitOrderInternal {
    event LimitOrderCreated(DataTypes.Order order);
}
