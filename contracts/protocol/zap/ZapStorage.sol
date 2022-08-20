// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { ISwapper } from "../optyfi-swapper/contracts/swap/ISwapper.sol";

/**
 * @title Storage for OptyFiZapper
 * @author OptyFi
 */
library ZapStorage {
    bytes32 internal constant STORAGE_SLOT = keccak256("optyfi.contracts.storage.Zap");

    struct Layout {
        ISwapper swapper;
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
