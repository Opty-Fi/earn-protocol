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
     * @param _beneficiary the address of the deposit beneficiary
     * @param _userDepositUT Amount in underlying token
     * @param _expectedOutput The minimum amount of vault tokens that must be minted
     *         for the transaction to not revert
     * @param _permitParams permit parameters: amount, deadline, v, s, r
     * @param _accountsProof merkle proof for caller
     */
    function userDepositVault(
        address _beneficiary,
        uint256 _userDepositUT,
        uint256 _expectedOutput,
        bytes calldata _permitParams,
        bytes32[] calldata _accountsProof
    ) external returns (uint256);

    /**
     * @notice redeems the vault shares and transfers underlying token to `_beneficiary`
     * @dev Burn the shares right away as per oracle based price per full share value
     * @param _receiver the address which will receive the underlying tokens
     * @param _userWithdrawVT amount in vault token
     * @param _expectedOutput minimum amount of underlying tokens that must be received
     *         to not revert transaction
     * @param _accountsProof merkle proof for caller
     */
    function userWithdrawVault(
        address _receiver,
        uint256 _userWithdrawVT,
        uint256 _expectedOutput,
        bytes32[] calldata _accountsProof
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
}
