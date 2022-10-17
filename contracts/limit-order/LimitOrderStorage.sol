// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;
import { DataTypes } from "./DataTypes.sol";

/**
 * @title Storage layout for Limit Orders
 * @author OptyFi
 */
library LimitOrderStorage {
    bytes32 internal constant STORAGE_SLOT = keccak256("optyfi.contracts.storage.LimitOrder");

    /**
     * @notice information container on user limit orders
     * @param userVaultOrder user => vault => Order
     * @param userVaultOrderActive user => vault => bool
     * @param vaultLiquidationFee vault address => liquidation fee
     * @param accountProofs mapping of OptyFi vault address => code merkle proof
     *        for Limit Order contract (required for OptyFi Vault withdraw/deposit)
     * @param vaults a whitelist of opVaults for which limit order can be created
     * @param stablecoinVaults a whitelist of opVaults which have stable coins as underlying tokens
     * @param treasury the treasury to send liquidation fees to
     * @param oracle the addres of the OptyFi Oracle
     * @param ops address of contract that helps automate limit order
     */
    struct Layout {
        mapping(address => mapping(address => DataTypes.Order)) userVaultOrder;
        mapping(address => mapping(address => bool)) userVaultOrderActive;
        mapping(address => uint256) vaultLiquidationFee;
        mapping(address => bytes32[]) accountProofs;
        mapping(address => bool) vaults;
        mapping(address => bool) stablecoinVaults;
        address treasury;
        address oracle;
        address ops;
    }

    /*solhint-disable  use-forbidden-name*/
    /*solhint-disable  no-inline-assembly*/
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
    /*solhint-enable  use-forbidden-name*/
    /*solhint-enable  no-inline-assembly*/
}
