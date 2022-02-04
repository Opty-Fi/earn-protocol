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
     * @notice
     * @dev
     * @param _allowWhitelistedState vault's whitelisted state flag
     * @param _userDepositCapUT maximum amount in underlying allowed to be deposited by user
     * @param _minimumDepositValueUT minimum deposit value in underlying token required
     * @param _totalValueLockedLimitUT maximum TVL in underlying allowed for the vault
     * @param _maxVaultValueJump The standard deviation allowed for vault value
     * @param _depositFeeFlatUT flat deposit fee in underlying token
     * @param _depositFeePct deposit fee in percentage basis points
     * @param _withdrawalFeeFlatUT flat withdrawal fee in underlying token
     * @param _withdrawalFeePct withdrawal fee in percentage basis points
     * @param _vaultFeeAddress address that collects vault deposit and withdraw fee
     */
    function setVaultConfiguration(
        bool _allowWhitelistedState,
        uint256 _userDepositCapUT,
        uint256 _minimumDepositValueUT,
        uint256 _totalValueLockedLimitUT,
        uint256 _maxVaultValueJump,
        uint256 _depositFeeFlatUT,
        uint256 _depositFeePct,
        uint256 _withdrawalFeeFlatUT,
        uint256 _withdrawalFeePct,
        address _vaultFeeAddress
    ) external;

    /**
     * @notice Set maximum absolute jump allowed of vault value in a single block
     * @dev the maximum vault value jump is in percentage basis points set by governance
     *      A big drop in value can flag an exploit.
     *      Exploits usually involve big drop or big fall in priceFullShare.
     * @param _maxVaultValueJump the maximum absolute allowed from a vault value in basis points
     */
    function setMaxVaultValueJump(uint256 _maxVaultValueJump) external;

    /**
     * @notice sets flat deposit fee
     * @dev the deposit fee is in underlying token
     * @param _depositFeeFlatUT amount of deposit fee in underlying token
     */
    function setDepositFeeFlatUT(uint256 _depositFeeFlatUT) external;

    /**
     * @notice sets the deposit fee in percentage
     * @dev the deposit fee is in percentage basis points
     * @param _depositFeePct deposit fee in percentage basis points
     */
    function setDepositFeePct(uint256 _depositFeePct) external;

    /**
     * @notice sets flat withdrawal fee
     * @dev the withdrawal fee is in underlying token
     * @param _withdrawalFeeFlatUT amount of withdrawal fee in percentage basis points
     */
    function setWithdrawalFeeFlatUT(uint256 _withdrawalFeeFlatUT) external;

    /**
     * @notice sets the withdrawal fee in percentage
     * @dev the withdrawal fee is in percentage basis points
     * @param _withdrawalFeePct amount of withdrawal fee in percentage basis points
     */
    function setWithdrawalFeePct(uint256 _withdrawalFeePct) external;

    /**
     * @notice
     * @dev
     * @param _vaultFeeAddress address that collects vault deposit and withdraw fee
     */
    function setVaultFeeAddress(address _vaultFeeAddress) external;

    /**
     * @notice
     * @dev
     * @param _allowWhitelistedState vault's whitelisted state flag
     */
    function setAllowWhitelistedState(bool _allowWhitelistedState) external;

    /**
     * @notice
     * @dev
     * @param _userDepositCapUT maximum amount in underlying allowed to be deposited by user
     */
    function setUserDepositCapUT(uint256 _userDepositCapUT) external;

    /**
     * @notice
     * @dev
     * @param _minimumDepositValueUT Minimum deposit value in underlying token required
     */
    function setMinimumDepositValueUT(uint256 _minimumDepositValueUT) external;

    /**
     * @notice
     * @dev
     * @param _totalValueLockedLimitUT maximum TVL in underlying allowed for the vault
     */
    function setTotalValueLockedLimitUT(uint256 _totalValueLockedLimitUT) external;

    /**
     * @dev
     * @param _account externally owner account address
     * @param _whitelist flag indicating whitelist or not
     */
    function setWhitelistedAccounts(address[] memory _accounts, bool _whitelist) external;

    /**
     * @dev
     * @param _ca smart contract account address
     * @param _whitelist flag indicating whitelist or not
     */
    function setWhitelistedCodes(address[] memory _accounts, bool _whitelist) external;

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
     * @notice Withdraw the underying asset of vault from previous strategy if any,
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
     * @notice
     * @dev
     */
    function vaultDepositAllToStrategy() external;

    /**
     * @notice A function to be called in case vault needs to claim and harvest tokens in case a strategy
     *         provides multiple reward tokens
     * @param _codes Array of encoded data in bytes which acts as code to execute
     */
    function adminCall(bytes[] memory _codes) external;

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
     * @notice
     * @dev
     * @param _underlyingTokensHash keccak256 hash of the underlying tokens of the vault
     */
    function setTokensHash(bytes32 _underlyingTokensHash) external;

    /**
     * @notice Retrieve underlying token balance in the vault
     * @return The balance of underlying token in the vault
     */
    function balance() external view returns (uint256);

    /**
     * @dev A helper function to validate the vault value will not be deviated from max vault value
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
     *         Please note we relay on the getAmountUT() function of StrategyManager which in turn relies on individual
     *         protocol adapters to obtain the current underlying token amount. Thus we are relying on a third party
     *         contract (i.e. an oracle). This oracle should be made resilient via best practices.
     * @return The underlying token worth a vault share is
     */
    function getPricePerFullShare() external view returns (uint256);

    /**
     * @notice Makes a decision based on vault configuration parameters
     *         to allow user deposits
     * @param _user address of the depositor
     * @param _userDepositUnderlying deposit amount in underlying
     * @return returns true if user deposit is permitted, false otherwise with reason
     */
    function userDepositPermitted(address _user, uint256 _userDepositUnderlying)
        external
        view
        returns (bool, string memory);

    /**
     * @notice
     * @dev
     */
    function vaultDepositPermitted() external view returns (bool, string memory);

    /**
     * @notice
     * @dev
     * @param _user account address of the iser
     * @param _userWithdrawVT amount of vault tokens to burn
     */
    function userWithdrawPermitted(address _user, uint256 _userWithdrawVT) external view returns (bool, string memory);

    /**
     * @notice
     * @dev
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
     * @return the bytes32 hash of the invest strategy
     */
    function getNextBestStrategy() external view returns (bytes32);

    /**
     * @notice
     * @dev
     * @param _strategySteps array of strategy step tuple
     */
    function getLastStrategyStepBalanceLP(DataTypes.StrategyStep[] memory _strategySteps)
        external
        view
        returns (uint256);

    /**
     * @notice
     * @dev
     * @param _investStrategyHash keccak256 hash of the strategy step
     */
    function getStrategySteps(bytes32 _investStrategyHash)
        external
        view
        returns (DataTypes.StrategyStep[] memory _strategySteps);
}
