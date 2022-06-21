// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

import { DataTypes } from './DataTypes.sol';

/**
 * @title Storage layout for Limit Orders
 * @author OptyFi
 */
library LimitOrderStorage {
    bytes32 internal constant STORAGE_SLOT =
        keccak256('optyfi.contracts.storage.LimitOrder');

    /**
     * @notice information container on user limit orders
     * @param userVaultOrder user => vault => Order
     * @param userVaultOrderActive user => vault => bool
     */
    struct Layout {
        mapping(address => mapping(address => DataTypes.Order)) userVaultOrder;
        mapping(address => mapping(address => bool)) userVaultOrderActive;
    }

    /**
     * @notice return the layout struct stored at STORAGE_SLOT
     */
    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}
