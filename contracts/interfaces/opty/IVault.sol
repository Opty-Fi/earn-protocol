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
interface IVault {
    /**
     * @notice Assign a risk profile code
     * @dev function to set code of risk profile
     * @param _riskProfileCode code of the risk profile
     */
    function setRiskProfileCode(uint256 _riskProfileCode) external;

    /**
     * @notice Assign the address of the underlying asset and its keccak256 hash
     * @dev the underlying asset should be approved by the governance
     * @param _underlyingTokensHash keccak256 hash of underlying token address and chain id
     */
    function setUnderlyingTokensHash(bytes32 _underlyingTokensHash) external;

    /**
     * @notice Single function to configure the vault's value control params
     * @param _userDepositCapUT maximum amount in underlying token allowed to be deposited by user
     * @param _minimumDepositValueUT minimum deposit value in underlying token required
     * @param _totalValueLockedLimitUT maximum TVL in underlying token allowed for the vault
     */
    function setValueControlParams(
        uint256 _userDepositCapUT,
        uint256 _minimumDepositValueUT,
        uint256 _totalValueLockedLimitUT
    ) external;

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
     * @notice function to set the maximum amount in underlying token
     *         that a user could deposit in entire life cycle of this vault
     * @param _userDepositCapUT maximum amount in underlying token allowed to be deposited by user
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
     * @param _totalValueLockedLimitUT maximum TVL in underlying token allowed for the vault
     */
    function setTotalValueLockedLimitUT(uint256 _totalValueLockedLimitUT) external;

    /**
     * @notice function to control the allowance of user interaction
     *         only when vault's whitelistedstate is enabled
     * @param _whitelistedAccountsRoot whitelisted accounts root hash
     */
    function setWhitelistedAccountsRoot(bytes32 _whitelistedAccountsRoot) external;

    /**
     * @notice function to control the allowance of smart contract interaction
     *         with vault
     * @param _whitelistedCodesRoot whitelisted codes root hash
     */
    function setWhitelistedCodesRoot(bytes32 _whitelistedCodesRoot) external;

    /**
     * @notice activates or deactives vault mode where
     *        all strategies go into full withdrawal. During emergency shutdown
     *        - No Users may deposit into the Vault (but may withdraw as usual.)
     *        - Only Governance may undo Emergency Shutdown.
     *        - No user may transfer vault tokens
     * @dev current strategy will be null
     * @param _active If true, the Vault goes into Emergency Shutdown. If false, the Vault
     *        goes back into Normal Operation
     */
    function setEmergencyShutdown(bool _active) external;

    /**
     * @notice activates or deactivates vault mode where all strategies
     *        go into full withdrawal. During pause
     *        - No users may deposit nor withdraw from vault
     *        - No user may transfer vault tokens
     *        This function can only be invoked by governance
     * @dev current strategy of vault will be null
     * @param _unpaused If true, the vault goes into unpause mode. If false(default), the vault
     *        goes into pause mode
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
     * @param _beneficiary the address of the deposit beneficiary
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
     * @notice function to claim the whole balance of reward tokens
     * @param _liquidityPool Liquidity pool's contract address from where to claim the reward token
     */
    function claimRewardToken(address _liquidityPool) external;

    /**
     * @notice function to claim _rewardTokenAmount of reward tokens and swap for the vault's underlying tokens
     * @param _liquidityPool Liquidity pool's contract address from where to claim the reward token
     * @param _rewardTokenAmount amount of reward token to harvest/swap
     */
    function harvestSome(address _liquidityPool, uint256 _rewardTokenAmount) external;

    /**
     * @notice function to claim the whole balance of reward tokens and swap for the vault's underlying tokens
     * @param _liquidityPool Liquidity pool's contract address from where to claim the reward token
     */
    function harvestAll(address _liquidityPool) external;

    /**
     * @notice Retrieve underlying token balance in the vault
     * @return The balance of underlying token in the vault
     */
    function balanceUT() external view returns (uint256);

    /**
     * @notice Retrieve the vault's balance of the reward token of a given liquidity pool
     * @param _liquidityPool Liquidity pool's contract address
     * @return The vault's balance of claimed reward tokens of a given liquidity pool.
     */
    function balanceClaimedRewardToken(address _liquidityPool) external view returns (uint256);

    /**
     * @notice Retrieve reward token unclaimed balance for a given liquidity pool
     *         Some protocols might not have a view function to return the unclaimed reward tokens
     * @param _liquidityPool Liquidity pool's contract address
     * @return The unclaimed balance of reward token for a given liquidity pool
     */
    function balanceUnclaimedRewardToken(address _liquidityPool) external view returns (uint256);

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
     * @param _addUserDepositUT whether to add _userDepositUT while
     *         checking for TVL limit reached.
     * @param _userDepositUTWithDeductions actual deposit amount after deducting
     *        third party transfer fees and deposit fees if any
     * @param _deductions amount in underlying token to not consider in as a part of
     *       user deposit amount
     * @param _accountsProof merkle proof for caller
     * @param _codesProof merkle proof for code hash if caller is smart contract
     * @return true if permitted, false otherwise
     * @return reason string if return false, empty otherwise
     */
    function userDepositPermitted(
        address _user,
        bool _addUserDepositUT,
        uint256 _userDepositUTWithDeductions,
        uint256 _deductions,
        bytes32[] calldata _accountsProof,
        bytes32[] calldata _codesProof
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
     * @param _accountsProof merkle proof for caller
     * @param _codesProof merkle proof for code hash if caller is smart contract
     * @return true if permitted, false otherwise
     * @return reason string if return false, empty otherwise
     */
    function userWithdrawPermitted(
        address _user,
        uint256 _userWithdrawVT,
        bytes32[] memory _accountsProof,
        bytes32[] memory _codesProof
    ) external view returns (bool, string memory);

    /**
     * @notice function to decide whether vault can withdraw from strategy or not
     * @return true if permitted, false otherwise
     * @return reason string if return false, empty otherwise
     */
    function vaultWithdrawPermitted() external view returns (bool, string memory);

    /**
     * @notice Computes deposit fee in underlying token
     * @param _userDepositUT user deposit amount in underlying token
     * @return deposit fee in underlying token
     */
    function calcDepositFeeUT(uint256 _userDepositUT) external view returns (uint256);

    /**
     * @notice Computes withdrawal fee in underlying token
     * @param _userWithdrawUT user withdraw amount in underlying token
     * @return _withdrawalFeeUT withdrawal fee in underlying token
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

    /**
     * @notice retireves current strategy metadata
     * @return array of strategy steps
     */
    function getInvestStrategySteps() external view returns (DataTypes.StrategyStep[] memory);

    /**
     * @dev function to compute the keccak256 hash of the strategy steps
     * @param _investStrategySteps metadata for invest strategy
     * @return keccak256 hash of the invest strategy and underlying tokens hash
     */
    function computeInvestStrategyHash(DataTypes.StrategyStep[] memory _investStrategySteps)
        external
        view
        returns (bytes32);

    /**
     * @dev Emitted when emergency shutdown over vault is changed
     * @param emergencyShutdown true mean vault is in emergency shutdown mode
     * @param caller address of user who has called the respective function to trigger this event
     */
    event LogEmergencyShutdown(bool indexed emergencyShutdown, address indexed caller);

    /**
     * @notice Emitted when Pause over vault is activated/deactivated
     * @param unpaused Unpause status of OptyFi's Vault contract - false (if paused) and true (if unpaused)
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogUnpause(bool indexed unpaused, address indexed caller);

    /**
     * @notice Emitted when setUserDepositCapUT is called
     * @param userDepositCapUT Cap in underlying token for user deposits in OptyFi's Vault contract
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogUserDepositCapUT(uint256 indexed userDepositCapUT, address indexed caller);

    /**
     * @notice Emitted when setMinimumDepositValueUT is called
     * @param minimumDepositValueUT Minimum deposit in OptyFi's Vault contract - only for deposits (without rebalance)
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogMinimumDepositValueUT(uint256 indexed minimumDepositValueUT, address indexed caller);

    /**
     * @notice Emitted when setTotalValueLockedLimitUT is called
     * @param totalValueLockedLimitUT Maximum limit for total value locked of OptyFi's Vault contract
     * @param caller Address of user who has called the respective function to trigger this event
     */
    event LogTotalValueLockedLimitUT(uint256 indexed totalValueLockedLimitUT, address indexed caller);

    /**
     * @notice Emitted when harvestAll or harvestSome are called
     * @param liquidityPool Liquidity pool's contract address from where to claim reward tokens
     * @param rewardTokenAmount Amount of reward token claimed
     * @param underlyingTokenAmount Amount of vault's underlying token harvested
     */
    event Harvested(address liquidityPool, uint256 rewardTokenAmount, uint256 underlyingTokenAmount);

    /**
     * @notice Emitted when claimRewardToken is called
     * @param liquidityPool Liquidity pool's contract address from where to claim reward tokens
     * @param rewardTokenAmount Amount of reward token claimed
     */
    event RewardTokenClaimed(address liquidityPool, uint256 rewardTokenAmount);
}
