// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

//  libraries
import { DataTypes } from "../../protocol/earn-protocol-configuration/contracts/libraries/types/DataTypes.sol";

/**
 * @title Interface for opty.fi's interest bearing vault
 * @author opty.fi
 * @notice Contains mix of permissioned and permissionless vault methods
 */
interface IVaultOracle {
    /**
     * @notice Set maximum standard deviation of vault value in a single block
     * @dev the maximum vault value jump is in percentage basis points set by governance
     * @param _maxVaultValueJump the standard deviation from a vault value in basis points
     */
    function setMaxVaultValueJump(uint256 _maxVaultValueJump) external;

    /**
     * @notice Withdraw the underying asset of vault from previous strategy if any,
     *         claims and swaps the reward tokens for the underlying token
     *         performs batch minting of shares for users deposited previously without rebalance,
     *         deposits the assets into the new strategy if any or holds the same in the vault
     * @dev the vault will be charged to compensate gas fees if operator calls this function
     */
    function rebalance() external;

    /**
     * @notice Claim the rewards if any strategy have it and swap for underlying token
     * @param _investStrategyHash vault invest strategy hash
     */
    function harvest(bytes32 _investStrategyHash) external;

    /**
     * @notice Deposit underlying tokens to the vault
     * @dev Mint the shares right away as per oracle based price per full share value
     * @param _userDepositUT Amount in underlying token
     */
    function userDepositVault(uint256 _userDepositUT) external;

    /**
     * @notice redeems the vault shares and transfers underlying token to the withdrawer
     * @dev Burn the shares right away as per oracle based price per full share value
     * @param _userWithdrawVT amount in vault token
     */
    function userWithdrawVault(uint256 _userWithdrawVT) external;

    /**
     * @notice Recall vault investments from current strategy, restricts deposits
     *         and allows redemption of the shares
     * @dev this function can be invoked by governance via registry
     */
    function discontinue() external;

    /**
     * @notice This function can temporarily restrict user from depositing
     *         or withdrawing assets to and from the vault
     * @dev this function can be invoked by governance via registry
     * @param _unpaused for invoking/revoking pause over the vault
     */
    function setUnpaused(bool _unpaused) external;

    /**
     * @notice Retrieve underlying token balance in the vault
     * @return The balance of underlying token in the vault
     */
    function balance() external view returns (uint256);

    /**
     * @notice Calculate the value of a vault share in underlying token
     * @return The underlying token worth a vault share is
     */
    function getPricePerFullShare() external view returns (uint256);

    /**
     * @notice Makes a decision based on vault configuration parameters
     *         to allow user deposits
     * @param _user address of the depositor
     * @param _userDepositUnderlying deposit amount in underlying
     * @return returns true if user deposit is permitted, false otherwise
     */
    function userDepositPermitted(address _user, uint256 _userDepositUnderlying) external view returns (bool);

    /**
     * @notice Assign a risk profile name
     * @dev name of the risk profile should be approved by governance
     * @param _riskProfileCode code of the risk profile
     */
    function setRiskProfileCode(uint256 _riskProfileCode) external;

    /**
     * @notice Assign the address of the underlying asset of the vault
     * @dev the underlying asset should be approved by the governance
     * @param _underlyingToken the address of the underlying asset
     */
    function setToken(address _underlyingToken) external;

    /**
     * @dev A helper function to validate the vault value will not be deviated from max vault value
     *      within the same block
     * @param _diff absolute difference between minimum and maximum vault value within a block
     * @param _currentVaultValue the underlying token balance of the vault
     * @return bool returns true if vault value jump is within permissible limits
     */
    function isMaxVaultValueJumpAllowed(uint256 _diff, uint256 _currentVaultValue) external view returns (bool);

    /**
     * @notice A function to be called in case vault needs to claim and harvest tokens in case a strategy
     *         provides multiple reward tokens
     * @param _codes Array of encoded data in bytes which acts as code to execute
     */
    function adminCall(bytes[] memory _codes) external;
}
