// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { DataTypes } from "../../libraries/types/DataTypes.sol";

/**
 * @dev Interface for strategy provider
 */
interface IStrategyProvider {
    function rpToTokenToBestStrategy(string memory _riskProfile, bytes32 _tokenHash) external view returns (bytes32);

    function rpToTokenToDefaultStrategy(string memory _riskProfile, bytes32 _tokenHash) external view returns (bytes32);

    function vaultRewardTokenHashToVaultRewardTokenStrategy(bytes32 _tokenHash)
        external
        view
        returns (DataTypes.VaultRewardStrategy memory);

    function setBestStrategy(
        string memory _riskProfile,
        bytes32 _tokenHash,
        bytes32 _strategyHash
    ) external;

    function setBestDefaultStrategy(
        string memory _riskProfile,
        bytes32 _tokenHash,
        bytes32 _strategyHash
    ) external;

    /**
     * @dev assign strategy in form of `_vaultRewardStrategy` to the `_vaultRewardTokenHash`.
     *
     * Returns a vaultRewardStrategy hash value indicating successful operation.
     *
     * Emits a {LogSetVaultRewardStrategy} event.
     *
     * Requirements:
     *
     * - msg.sender should be operator.
     * - `hold` in {_vaultRewardStrategy} shoould be greater than 0 and should be in `basis` format.
     *      For eg: If hold is 50%, then it's basis will be 5000, Similarly, if it 20%, then it's basis is 2000.
     * - `convert` in {_vaultRewardStrategy} should be approved
     *      For eg: If convert is 50%, then it's basis will be 5000, Similarly, if it 20%, then it's basis is 2000.
     */
    function setVaultRewardStrategy(
        bytes32 _vaultRewardTokenHash,
        DataTypes.VaultRewardStrategy memory _vaultRewardStrategy
    ) external returns (DataTypes.VaultRewardStrategy memory);
}
