// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

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
     * @param tokenPriceFeed token address => oracle address
     * @param vaultFee vault address => fee
     * @param emptyProof an empty merkle proof (required for OptyFi Vault withdraw/deposit)
     * @param proof merkle proof for Limit Order contract (required for OptyFi Vaut withdraw/deposit)
     * @param id unique counter for limit orders
     * @param treasury the treasury to send liquidation fees to
     */
    struct Layout {
        mapping(address => mapping(address => DataTypes.Order)) userVaultOrder;
        mapping(address => mapping(address => bool)) userVaultOrderActive;
        mapping(address => address) tokenPriceFeed;
        mapping(address => uint256) vaultFee;
        bytes32[] emptyProof;
        bytes32[] proof;
        uint256 id;
        address treasury;
    }

    /**
     * @notice return the layout struct stored at STORAGE_SLOT
     * @return l the layout struct
     */
    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}
