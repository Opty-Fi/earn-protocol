// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

//  libraries
import { DataTypes } from "../../libraries/types/DataTypes.sol";

/**
 * @title Interface for RiskManager contract
 * @author Opty.fi
 * @notice A layer between vault and registry contract to get the best invest strategy as well
 * as vault reward token strategy
 */
interface IRiskManager {
    /**
     * @notice Get the best strategy for respective RiskProfiles
     * @param _riskProfileCode Risk profile code (Eg: 1,2, and so on where 0 is reserved for 'no strategy')
     * corresponding to which get the best strategy
     * @param _underlyingTokens array of underlying token addresses
     * @return Returns the hash of the best strategy corresponding to the riskProfile provided
     */
    function getBestStrategy(uint256 _riskProfileCode, address[] memory _underlyingTokens)
        external
        view
        returns (bytes32);

    /**
     * @notice Get the VaultRewardToken strategy for respective VaultRewardToken hash
     * @param _underlyingTokens array of vault contract address and reward token address
     * @return _vaultRewardStrategy Returns the VaultRewardToken strategy for given vaultRewardTokenHash
     */
    function getVaultRewardTokenStrategy(address[] memory _underlyingTokens)
        external
        view
        returns (DataTypes.VaultRewardStrategy memory _vaultRewardStrategy);
}
