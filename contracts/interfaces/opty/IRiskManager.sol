// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { DataTypes } from "../../libraries/types/DataTypes.sol";

/**
 * @dev Interface for RiskManaget - An extra protection for the best strategy
 *      of the opty-fi vault's underlying token
 *
 */

interface IRiskManager {
    /**
     * @dev Get the best strategy for respective RiskProfiles
     *
     * Returns the hash of the best strategy corresponding to the riskProfile provided
     *
     * Requirements:
     *
     * - `_profile` can be among these values ["RP1"/"RP2"/"RP3"] or as decided by governance
     *      - Can not be empty
     * - `_underlyingTokens` is an array of underlying tokens like dai, usdc and so forth
     *      - Can not have length 0
     *
     */
    function getBestStrategy(string memory _profile, address[] memory _underlyingTokens)
        external
        view
        returns (bytes32);

    /**
     * @dev Get the VaultRewardToken strategy for respective VaultRewardToken hash
     *
     * Returns the hash of the VaultRewardToken strategy corresponding to the `_vaultRewardTokenHash` provided
     *
     * Requirements:
     *
     * - `_vaultRewardTokenHash` is the hash of Vault and RewardToken addresses
     *      - Can not be empty
     */
    function getVaultRewardTokenStrategy(bytes32 _vaultRewardTokenHash)
        external
        view
        returns (DataTypes.VaultRewardStrategy memory _vaultRewardStrategy);
}
