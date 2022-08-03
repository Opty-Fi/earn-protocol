// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

/**
 * @title Interface for opty.fi's interest bearing vault
 * @author opty.fi
 */
interface IVault {
    /**
     * @notice Deposit underlying tokens to the vault
     * @dev Mint the shares right away as per oracle based price per full share value
     * @param _beneficiary the address of the deposit beneficiary,
     *        if _beneficiary = address(0) => _beneficiary = msg.sender
     * @param _userDepositUT Amount in underlying token
     * @param _permitParams permit parameters: amount, deadline, v, s, r
     * @param _accountsProof merkle proof for caller
     * @param _codesProof merkle proof for code hash if caller is smart contract
     */
    function userDepositVault(
        address _beneficiary,
        uint256 _userDepositUT,
        bytes calldata _permitParams,
        bytes32[] calldata _accountsProof,
        bytes32[] calldata _codesProof
    ) external returns (uint256);

    /**
     * @notice redeems the vault shares and transfers underlying token to `_beneficiary`
     * @dev Burn the shares right away as per oracle based price per full share value
     * @param _receiver the address which will receive the underlying tokens
     * @param _userWithdrawVT amount in vault token
     * @param _accountsProof merkle proof for caller
     * @param _codesProof merkle proof for code hash if caller is smart contract
     */
    function userWithdrawVault(
        address _receiver,
        uint256 _userWithdrawVT,
        bytes32[] calldata _accountsProof,
        bytes32[] calldata _codesProof
    ) external returns (uint256);

    /**
     * @notice Calculate the value of a vault share in underlying token
     *         read-only function to compute price per share of the vault
     *         Note : This function calculates the pricePerFullShare (i.e. the number of underlyingTokens
     *         per each vaultToken entitles you to).
     *
     *         Please note the following quantities are included in underlyingTokens :
     *         - underlyingTokens in vault that are not yet deployed in strategy
     *
     *        Please note the following quantities are *NOT* included in underlyingTokens :
     *         - unclaimed reward tokens from the current or past strategies
     *         - claimed reward tokens that are not yet harvested to underlyingTokens
     *         - any tokens other than underlyingTokens of the vault.
     *
     *         Please note we rely on the getOraValueUT() function of StrategyBuilder which in turn relies on individual
     *         protocol adapters to obtain the current underlying token amount. Thus we are relying on a third party
     *         contract (i.e. an oracle). This oracle should be made resilient via best practices.
     * @return The underlying token worth a vault share is
     */
    function getPricePerFullShare() external view returns (uint256);

    /**
     * @notice return the underlying token contract address of the OptyFi Vault (for example DAI)
     * @return underlying token address
     */
    function underlyingToken() external view returns (address);

    /**
     * @notice Single function to configure the vault's fee params
     * @dev bit 0-15 deposit fee in underlying token without decimals
     *      bit 16-31 deposit fee in basis points
     *      bit 32-47 withdrawal fee in underlying token without decimals
     *      bit 48-63 withdrawal fee in basis points
     *      bit 64-79 max vault value jump allowed in basis points (standard deviation allowed for vault value)
     *      bit 80-239 vault fee collection address
     *      bit 240-247 risk profile code
     *      bit 248 emergency shutdown flag
     *      bit 249 pause flag (deposit/withdraw is pause when bit is unset, unpause otherwise)
     *      bit 250 white list state flag
     * @param _vaultConfiguration bit banging value for vault config
     */
    function setVaultConfiguration(uint256 _vaultConfiguration) external;

    /**
     * @notice returns vault configuration
     * @return uint256 vaultConfiguration
     */
    function vaultConfiguration() external view returns (uint256);

    /**
     * @notice function to control the allowance of smart contract interaction
     *         with vault
     * @param _whitelistedCodesRoot whitelisted codes root hash
     */
    function setWhitelistedCodesRoot(bytes32 _whitelistedCodesRoot) external;

    function whitelistedCodesRoot() external view returns (bytes32);

    /**
     * @notice function to control the allowance of user interaction
     *         only when vault's whitelistedstate is enabled
     * @param _whitelistedAccountsRoot whitelisted accounts root hash
     */
    function setWhitelistedAccountsRoot(bytes32 _whitelistedAccountsRoot)
        external;

    /**
     * @notice function to set minimum amount in underlying token required
     *         to be deposited by the user
     * @param _minimumDepositValueUT Minimum deposit value in underlying token required
     */
    function setMinimumDepositValueUT(uint256 _minimumDepositValueUT) external;
}
