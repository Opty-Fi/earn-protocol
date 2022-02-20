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
interface IVaultV2 {
    /**
     * @notice Single function to configure the vault's value control params
     * @param _allowWhitelistedState vault's allow whitelisted state flag
     * @param _userDepositCapUT maximum amount in underlying allowed to be deposited by user
     * @param _minimumDepositValueUT minimum deposit value in underlying token required
     * @param _totalValueLockedLimitUT maximum TVL in underlying allowed for the vault
     * @param _maxVaultValueJump The standard deviation allowed for vault value
     */
    function setValueControlParams(
        bool _allowWhitelistedState,
        uint256 _userDepositCapUT,
        uint256 _minimumDepositValueUT,
        uint256 _totalValueLockedLimitUT,
        uint256 _maxVaultValueJump
    ) external;

    /**
     * @notice Single function to configure the vault's fee params
     * @param _depositFeeFlatUT flat deposit fee in underlying token
     * @param _depositFeePct deposit fee in basis points
     * @param _withdrawalFeeFlatUT flat withdrawal fee in underlying token
     * @param _withdrawalFeePct withdrawal fee in basis points
     * @param _vaultFeeCollector address that collects vault deposit and withdraw fee
     */
    function setFeeParams(
        uint256 _depositFeeFlatUT,
        uint256 _depositFeePct,
        uint256 _withdrawalFeeFlatUT,
        uint256 _withdrawalFeePct,
        address _vaultFeeCollector
    ) external;

    /**
     * @notice Set maximum absolute jump allowed of vault value in a single block
     * @dev the maximum vault value jump is in basis points set by governance
     *      A big drop in value can flag an exploit.
     *      Exploits usually involve big drop or big fall in pricePerFullShare.
     * @param _maxVaultValueJump the maximum variation allowed from a vault value in basis points
     */
    function setMaxVaultValueJump(uint256 _maxVaultValueJump) external;

    /**
     * @notice function to control whitelisted state
     * @param _allowWhitelistedState vault's allow whitelisted state flag
     */
    function setAllowWhitelistedState(bool _allowWhitelistedState) external;

    /**
     * @notice function to set the maximum amount in underlying token
     *         that a user could deposit in entire life cycle of this vault
     * @param _userDepositCapUT maximum amount in underlying allowed to be deposited by user
     */
    function setUserDepositCapUT(uint256 _userDepositCapUT) external;

    /**
     * @notice function to set minimum amount in underlying token required
     *         to be deposited by the user
     * @param _minimumDepositValueUT Minimum deposit value in underlying token required
     */
    function setMinimumDepositValueUT(uint256 _minimumDepositValueUT) external;

    /**
     * @notice function to set the total value locked limit in underlying token
     * @param _totalValueLockedLimitUT maximum TVL in underlying allowed for the vault
     */
    function setTotalValueLockedLimitUT(uint256 _totalValueLockedLimitUT) external;

    /**
     * @notice function to control the allowance of user interaction
     *         only when vault's whitelistedstate is enabled
     * @param _accounts externally owned account addresses
     * @param _whitelist list of flags indicating whitelist or not
     */
    function setWhitelistedAccounts(address[] memory _accounts, bool[] memory _whitelist) external;

    /**
     * @notice function to control the allowance of smart contract interaction
     *         with vault
     * @param _accounts smart contract account address
     * @param _whitelist list of flag indicating whitelist or not
     */
    function setWhitelistedCodes(address[] memory _accounts, bool[] memory _whitelist) external;

    /**
     * @notice Recall vault investments from current strategy, restricts deposits
     *         and allows redemption of the shares
     * @dev this function can be invoked by governance
     */
    function discontinue() external;

    /**
     * @notice This function can temporarily restrict user from depositing
     *         or withdrawing assets to and from the vault
     * @dev this function can be invoked by governance
     * @param _unpaused for invoking/revoking pause over the vault
     */
    function setUnpaused(bool _unpaused) external;

    /**
     * @notice Withdraw the underlying asset of vault from previous strategy if any,
     *         claims and swaps the reward tokens for the underlying token
     *         performs batch minting of shares for users deposited previously without rebalance,
     *         deposits the assets into the new strategy if any or holds the same in the vault
     * @dev the vault will be charged to compensate gas fees if operator calls this function
     */
    function rebalance() external;

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
     * @notice function to deposit whole balance of underlying token to current strategy
     */
    function vaultDepositAllToStrategy() external;

    /**
     * @notice A function to be called in case vault needs to claim and harvest tokens in case a strategy
     *         provides multiple reward tokens
     * @param _codes Array of encoded data in bytes which acts as code to execute
     */
    function adminCall(bytes[] memory _codes) external;

    /**
     * @notice Assign a risk profile code
     * @dev function to set code of risk profile
     * @param _riskProfileCode code of the risk profile
     */
    function setRiskProfileCode(uint256 _riskProfileCode) external;

    /**
     * @notice Assign the address of the underlying asset and its keccak256 hash
     * @dev the underlying asset should be approved by the governance
     * @param _underlyingToken the address of the underlying asset
     * @param _underlyingTokensHash keccak256 hash of underlying token address and chain id
     */
    function setUnderlyingTokenAndTokensHash(address _underlyingToken, bytes32 _underlyingTokensHash) external;

    /**
     * @notice Retrieve underlying token balance in the vault
     * @return The balance of underlying token in the vault
     */
    function balanceUT() external view returns (uint256);

    /**
     * @dev A helper function to validate the vault value will not surpass max or min vault value
     *      within the same block
     * @param _diff absolute difference between minimum and maximum vault value within a block
     * @param _currentVaultValue the underlying token balance of the vault
     * @return bool returns true if vault value jump is within permissible limits
     */
    function isMaxVaultValueJumpAllowed(uint256 _diff, uint256 _currentVaultValue) external view returns (bool);

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
     * @notice Makes a decision based on vault configuration parameters
     *         to allow user deposits
     * @param _user address of the depositor
     * @param _userDepositUT actual deposit amount after deducting
     *                               third party transfer fees and
     *                               deposit fees if any
     * @param _addUserDepositUT whether to add _userDepositUT while
     *                          checking for TVL
     * @return true if permitted, false otherwise
     * @return reason string if return false, empty otherwise
     */
    function userDepositPermitted(
        address _user,
        uint256 _userDepositUT,
        bool _addUserDepositUT
    ) external view returns (bool, string memory);

    /**
     * @notice function to decide whether to allow vault to deposit to the strategy
     * @return true if permitted, false otherwise
     * @return reason string if return false, empty otherwise
     */
    function vaultDepositPermitted() external view returns (bool, string memory);

    /**
     * @notice function to decide whether user can withdraw or not
     * @param _user account address of the user
     * @param _userWithdrawVT amount of vault tokens to burn
     * @return true if permitted, false otherwise
     * @return reason string if return false, empty otherwise
     */
    function userWithdrawPermitted(address _user, uint256 _userWithdrawVT) external view returns (bool, string memory);

    /**
     * @notice function to decide whether vault can withdraw from strategy or not
     * @return true if permitted, false otherwise
     * @return reason string if return false, empty otherwise
     */
    function vaultWithdrawPermitted() external view returns (bool, string memory);

    /**
     * @notice Computes deposit fee in underlying
     * @param _userDepositUT user deposit amount in underlying
     * @return deposit fee in underlying
     */
    function calcDepositFeeUT(uint256 _userDepositUT) external view returns (uint256);

    /**
     * @notice Computes withdrawal fee in underlying
     * @param _userWithdrawUT user withdraw amount in underlying
     * @return _withdrawalFeeUT withdrawal fee in underlying
     */
    function calcWithdrawalFeeUT(uint256 _userWithdrawUT) external view returns (uint256);

    /**
     * @notice Returns next best invest strategy that the vault will execute on next rebalance
     * @return the strategy metadata
     */
    function getNextBestInvestStrategy() external view returns (DataTypes.StrategyStep[] memory);

    /**
     * @notice function to compute the balance of lptoken of the vault
     *         in the last step of the strategy
     * @param _strategySteps array of strategy step tuple
     * @return balance in lptoken
     */
    function getLastStrategyStepBalanceLP(DataTypes.StrategyStep[] memory _strategySteps)
        external
        view
        returns (uint256);
}
