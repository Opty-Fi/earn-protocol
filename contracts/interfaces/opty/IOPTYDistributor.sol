// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

/**
 * @title The interface for OPTY distributor
 * @author opty.fi
 * @notice The OPTY distributor mints the governance token earned by loyal opty.fi users
 */

interface IOPTYDistributor {
    /**
     * @notice Set the period to keep $OPTY locked within maximum period set during deployment
     * @param _operatorUnlockClaimOPTYTimestamp The timestamp until which $OPTY cannot be claimed
     * @return _success returns true if unlock period is set successfuly
     */
    function setOperatorUnlockClaimOPTYTimestamp(uint256 _operatorUnlockClaimOPTYTimestamp)
        external
        returns (bool _success);

    /**
     * @notice Enable or disable the staking vault done only by operator
     * @dev It sets a boolean value to stakingVaults mapping
     * @param _stakingVault the contract address of the staking vault
     * @param _enable set or unset the staking vault
     * @return _success return true if staking vault is set
     */
    function setStakingVault(address _stakingVault, bool _enable) external returns (bool _success);

    /**
     * @notice Claim and stake $OPTY in single transaction
     * @dev call mint on $OPTY and invokes userStake on staking vault
     * @param _stakingVault The whitelisted staking vault address
     */
    function claimAndStake(address _stakingVault) external;

    /**
     * @notice Claim all the OPTY accrued by holder in all markets
     * @param _holder The address to claim OPTY for
     * @return _amount of the $OPTY tranfered to holder
     */
    function claimOpty(address _holder) external returns (uint256 _amount);

    /**
     * @notice Claim all the $OPTY accrued by holder in the specified markets
     * @dev runs a loop to calculate accrued $OPTY and mints the total
     * @param _holder The address to claim OPTY for
     * @param _vaults The list of vaults to claim $OPTY in
     * @return _amount returns the total amount of $OPTY transferred to _holder
     */
    function claimOpty(address _holder, address[] memory _vaults) external returns (uint256 _amount);

    /**
     * @notice Claim all $OPTY accrued by the holders in single transaction
     * @dev Runs a nested loop to claim $OPTY for all holders across all vaults
     * @param _holders The addresses to claim $OPTY for
     * @param _vaults The list of vaults to claim $OPTY in
     * @return _amount returns the total $OPTY claimed of all holders across all vaults
     */
    function claimOpty(address[] memory _holders, address[] memory _vaults) external returns (uint256 _amount);

    /**
     * @notice Calculate additional accrued OPTY for a contributor since last accrual
     * @dev Updates the state of the OPTYDistributor related to $OPTY rewards
     * @param _vault the vault to claim $OPTY in
     * @param _user The address to calculate contributor rewards for
     */
    function updateUserRewards(address _vault, address _user) external;

    /**
     * @notice Update the state of the OPTYDistributor related to a market and an user
     * @param _vault the vault for which user state will be updated
     * @param _user the account address of the user
     */
    function updateUserStateInVault(address _vault, address _user) external;

    /**
     * @notice Set the OPTY rate for a specific pool
     * @param _vault the market for whom $OPTY rate per second needs to get updated
     * @return _success return true on successfull update of $OPTY rate of a vault per second and vault token
     */
    function updateOptyVaultRatePerSecondAndVaultToken(address _vault) external returns (bool);

    /**
     * @notice Accrue OPTY to the market by updating the supply index
     * @param _vault The market whose index to update
     */
    function updateOptyVaultIndex(address _vault) external returns (uint224);

    /**
     * @notice Transfer $OPTY to the user
     * @dev If there is not enough $OPTY, we do not perform the transfer at all.
     * @param _user The address of the user to transfer $OPTY to
     * @param _amount The amount of $OPTY to (possibly) transfer
     * @return _mintedAmount The amount of $OPTY which was transferred to the user
     */
    function mintOpty(address _user, uint256 _amount) external returns (uint256 _mintedAmount);

    /**
     * @notice Set the $OPTY rate for a specific vault
     * @param _vault The market for which $OPTY rate is set
     * @param _rate The $OPTY rate per second for the given vault
     * @return _success returns true on successful setting of the $OPTY vault rate
     */
    function setOptyVaultRate(address _vault, uint256 _rate) external returns (bool _success);

    /**
     * @notice Add new markets to get it boosted by $OPTY rewards
     * @dev The vault users can only receive $OPTY rewards once vaults are whitelisted
     * @param _vault the market whose users can receive $OPTY rewards
     * @return _success returns true on successful addition of the new market
     */
    function addOptyVault(address _vault) external returns (bool _success);

    /**
     * @notice Whitelist the market (vault contracts)
     * @param _vault the market that will be set/unset
     * @param _enable true will whitelist the market
     * @return _success returns true on successful set/unset of vault
     */
    function setOptyVault(address _vault, bool _enable) external returns (bool _success);

    /**
     * @notice Claim all the $OPTY accrued by holder in all markets
     * @param _holder The address to claim $OPTY for
     * @return _amount The amount of unclaimed $OPTY
     */
    function claimableOpty(address _holder) external view returns (uint256 _amount);

    /**
     * @notice Claim all the $OPTY accrued by holder in the specified markets
     * @param _holder The address to claim OPTY for
     * @param _vaults The list of vaults to claim OPTY in
     * @return _amount The total amount of unclaimed $OPTY of user across all markets
     */
    function claimableOpty(address _holder, address[] memory _vaults) external view returns (uint256 _amount);

    /**
     * @dev Compute the index based on $OPTY accrued and vault tokens' total supply
     * @param _vault The vault to claim $OPTY in
     * @return _index returns current vault index
     */
    function currentOptyVaultIndex(address _vault) external view returns (uint256 _index);

    /**
     * @notice Retrieve the address of $OPTY token
     * @return _opty The contract address of the ERC20 based $OPTY token
     */
    function getOptyAddress() external view returns (address _opty);
}
