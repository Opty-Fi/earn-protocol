// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

//  libraries
import { DataTypes } from "../../libraries/types/DataTypes.sol";

/**
 * @title Interface for Registry Contract
 * @author Opty.fi
 * @notice Interface of the opty.fi's protocol reegistry to store all the mappings, governance
 * operator, minter, strategist and all optyFi's protocol contract addresses
 */
interface IRegistry {
    /**
     * @notice Set the treasury's address for optyfi's earn protocol
     * @param _treasury Treasury's address
     */
    function setTreasury(address _treasury) external;

    /**
     * @notice Whitelist users that are allowed to deposit
     * @param _vault The vault in which the user is going to be whitelisted or not
     * @param _user The user to be whitelisted
     * @param _whitelist Allow user to deposit if true
     */
    function setWhitelistedUser(
        address _vault,
        address _user,
        bool _whitelist
    ) external;

    /**
     * @notice Whitelist users that are allowed to deposit
     * @param _vault The vault in which the user is going to be whitelisted or not
     * @param _users List of users to be whitelisted
     * @param _whitelist Allow user to deposit if true
     */
    function setWhitelistedUsers(
        address _vault,
        address[] memory _users,
        bool _whitelist
    ) external;

    /**
     * @notice Set the investStrategyRegistry contract address
     * @param _investStrategyRegistry InvestStrategyRegistry contract address
     */
    function setInvestStrategyRegistry(address _investStrategyRegistry) external;

    /**
     * @notice Set the APROracle contract address
     * @param _aprOracle Address of APR Pracle contract to be set
     */
    function setAPROracle(address _aprOracle) external;

    /**
     * @notice Set the StrategyProvider contract address
     * @param _strategyProvider Address of StrategyProvider Contract
     */
    function setStrategyProvider(address _strategyProvider) external;

    /**
     * @notice Set the RiskManager's contract address
     * @param _riskManager Address of RiskManager Contract
     */
    function setRiskManager(address _riskManager) external;

    /**
     * @notice Set the HarvestCodeProvider contract address
     * @param _harvestCodeProvider Address of HarvestCodeProvider Contract
     */
    function setHarvestCodeProvider(address _harvestCodeProvider) external;

    /**
     * @notice Set the StrategyManager contract address
     * @param _strategyManager Address of StrategyManager Contract
     */
    function setStrategyManager(address _strategyManager) external;

    /**
     * @notice Set the $OPTY token's contract address
     * @param _opty Address of Opty Contract
     */
    function setOPTY(address _opty) external;

    /**
     * @notice Set the OPTYStakingRateBalancer contract address
     * @param _optyStakingRateBalancer Address of OptyStakingRateBalancer Contract
     */
    function setOPTYStakingRateBalancer(address _optyStakingRateBalancer) external;

    /**
     * @notice Set the ODEFIVaultBooster contract address
     * @dev Can only be called by the current governance
     * @param _odefiVaultBooster address of the ODEFIVaultBooster Contract
     */
    function setODEFIVaultBooster(address _odefiVaultBooster) external;

    /**
     * @dev Sets multiple `_token` from the {tokens} mapping.
     * @notice Approves multiple tokens in one transaction
     * @param _tokens List of tokens to approve
     */
    function approveToken(address[] memory _tokens) external;

    /**
     * @notice Approves the token provided
     * @param _token token to approve
     */
    function approveToken(address _token) external;

    /**
     * @notice Disable multiple tokens in one transaction
     * @param _tokens List of tokens to revoke
     */
    function revokeToken(address[] memory _tokens) external;

    /**
     * @notice Disable the token
     * @param _token token to revoke
     */
    function revokeToken(address _token) external;

    /**
     * @notice Approves multiple liquidity pools in one transaction
     * @param _pools list of liquidity/credit pools to approve
     */
    function approveLiquidityPool(address[] memory _pools) external;

    /**
     * @notice For approving single liquidity pool
     * @param _pool liquidity/credit pool to approve
     */
    function approveLiquidityPool(address _pool) external;

    /**
     * @notice Revokes multiple liquidity pools in one transaction
     * @param _pools list of liquidity/credit pools to revoke
     */
    function revokeLiquidityPool(address[] memory _pools) external;

    /**
     * @notice Revokes the liquidity pool
     * @param _pool liquidity/credit pool to revoke
     */
    function revokeLiquidityPool(address _pool) external;

    /**
     * @notice Sets multiple pool rates and liquidity pools provided
     * @param _poolRates List of pool rates ([_pool, _rate]) to set
     */
    function rateLiquidityPool(DataTypes.PoolRate[] memory _poolRates) external;

    /**
     * @notice Sets the pool rate for the liquidity pool provided
     * @param _pool liquidityPool to map with its rating
     * @param _rate rate for the liquidityPool provided
     */
    function rateLiquidityPool(address _pool, uint8 _rate) external;

    /**
     * @notice Approves multiple credit pools in one transaction
     * @param _pools List of pools for approval to be considered as creditPool
     */
    function approveCreditPool(address[] memory _pools) external;

    /**
     * @notice Approves the credit pool
     * @param _pool credit pool address to be approved
     */
    function approveCreditPool(address _pool) external;

    /**
     * @notice Revokes multiple credit pools in one transaction
     * @param _pools List of pools for revoking from being used as creditPool
     */
    function revokeCreditPool(address[] memory _pools) external;

    /**
     * @notice Revokes the credit pool
     * @param _pool pool for revoking from being used as creditPool
     */
    function revokeCreditPool(address _pool) external;

    /**
     * @notice Sets the multiple pool rates and credit pools provided
     * @param _poolRates List of pool rates ([_pool, _rate]) to set for creditPool
     */
    function rateCreditPool(DataTypes.PoolRate[] memory _poolRates) external;

    /**
     * @notice Sets the pool rate for the credit pool provided
     * @param _pool creditPool to map with its rating
     * @param _rate rate for the creaditPool provided
     */
    function rateCreditPool(address _pool, uint8 _rate) external;

    /**
     * @notice Maps multiple liquidity pools to their protocol adapters
     * @param _poolAdapters List of [pool, adapter] pairs to set
     */
    function setLiquidityPoolToAdapter(DataTypes.PoolAdapter[] memory _poolAdapters) external;

    /**
     * @notice Maps liquidity pool to its protocol adapter
     * @param _pool liquidityPool to map with its adapter
     * @param _adapter adapter for the liquidityPool provided
     */
    function setLiquidityPoolToAdapter(address _pool, address _adapter) external;

    /**
     * @notice Maps multiple token pairs to their keccak256 hash
     * @param _setOfTokens List of mulitple token addresses to map with their (paired tokens) hashes
     */
    function setTokensHashToTokens(address[][] memory _setOfTokens) external;

    /**
     * @notice Sets token pair to its keccak256 hash
     * @param _tokens List of token addresses to map with their hashes
     */
    function setTokensHashToTokens(address[] memory _tokens) external;

    /**
     * @notice Set the withdrawal fee's range
     * @param _withdrawalFeeRange the withdrawal fee's range
     */
    function setWithdrawalFeeRange(DataTypes.WithdrawalFeeRange memory _withdrawalFeeRange) external;

    /**
     * @notice Set the complete vault configuration
     * @param _vault Vault address to be configured
     * @param _isLimitedState A boolean value that indicates whether the vault is in limited state (true) or not (false)
     * @param _allowWhitelistedState It indicates whether the vault only accepts whitelisted users (true) or not (false)
     * @param _treasuryShares Array of treasuries and their fee shares
     * @param _withdrawalFee Withdrawal fee to be set for vault contract
     * @param _userDepositCap Maximum deposit amount allowed for each user in the given vault
     * @param _minimumDepositAmount Minimum deposit amount allowed for each deposit without rebalance in the given vault
     * @param _totalValueLockedLimitInUnderlying Maximum TVL allowed for the vault
     */
    function setVaultConfiguration(
        address _vault,
        bool _isLimitedState,
        bool _allowWhitelistedState,
        DataTypes.TreasuryShare[] memory _treasuryShares,
        uint256 _withdrawalFee,
        uint256 _userDepositCap,
        uint256 _minimumDepositAmount,
        uint256 _totalValueLockedLimitInUnderlying
    ) external;

    /**
     * @notice Discontinue the Vault contract from use permanently
     * @dev Once Vault contract is disconitnued, then it CAN NOT be re-activated for usage
     * @param _vault Vault address to discontinue
     */
    function discontinue(address _vault) external;

    /**
     * @notice Pause/Unpause the Vault contract for use temporarily during any emergency
     * @param _vault Vault contract address to pause
     * @param _unpaused A boolean value true to unpause vault contract and false for pause vault contract
     */
    function unpauseVaultContract(address _vault, bool _unpaused) external;

    /**
     * @notice Enable or disable the limit on user deposits
     * @param _vault Vault contract address
     * @param _isLimitedState A boolean value true to limit user deposits and false to unlimit user deposits
     */
    function setIsLimitedState(address _vault, bool _isLimitedState) external;

    /**
     * @notice Enable or disable the limit on user deposits
     * @param _vault Vault contract address
     * @param _allowWhitelistedState A boolean value true to only allow whitelisted users' deposits
     */
    function setAllowWhitelistedState(address _vault, bool _allowWhitelistedState) external;

    /**
     * @notice Set the treasury accounts with their fee shares corresponding to vault contract
     * @param _vault Vault contract address
     * @param _treasuryShares Array of treasuries and their fee shares
     */
    function setTreasuryShares(address _vault, DataTypes.TreasuryShare[] memory _treasuryShares) external;

    /**
     * @notice Set the withdrawal fee for the vault contract
     * @param _vault Vault contract address
     * @param _withdrawalFee Withdrawal fee to be set for vault contract
     */
    function setWithdrawalFee(address _vault, uint256 _withdrawalFee) external;

    /**
     * @notice Set the maximum total deposits in a Vault for each user
     * @param _vault Vault contract address
     * @param _userDepositCap Maximum deposit amount allowed for each user
     */
    function setUserDepositCap(address _vault, uint256 _userDepositCap) external;

    /**
     * @notice Set the minimum deposit amount when the user is not rebalancing the Vault
     * @param _vault Vault contract address
     * @param _minimumDepositAmount Minimum deposit amount allowed for each deposit without rebalance
     */
    function setMinimumDepositAmount(address _vault, uint256 _minimumDepositAmount) external;

    /**
     * @notice Set the TVL limit for the vault
     * @param _vault Vault contract address
     * @param _totalValueLockedLimitInUnderlying maximum TVL allowed in underlying token of the vault
     */
    function setTotalValueLockedLimitInUnderlying(address _vault, uint256 _totalValueLockedLimitInUnderlying) external;

    /**
     * @notice Set the maximum length of the queue in a specific Vault
     * @param _vault Vault contract address
     * @param _queueCap Maximum queue length
     */
    function setQueueCap(address _vault, uint256 _queueCap) external;

    /**
     * @notice Adds the risk profile in Registry contract Storage
     * @param _riskProfileCode code of riskProfile
     * @param _name name of riskProfile
     * @param _symbol symbol of riskProfile
     * @param _canBorrow A boolean value indicating whether the riskProfile allows borrow step
     * @param _poolRatingRange pool rating range ([lowerLimit, upperLimit]) supported by given risk profile
     */
    function addRiskProfile(
        uint256 _riskProfileCode,
        string memory _name,
        string memory _symbol,
        bool _canBorrow,
        DataTypes.PoolRatingsRange memory _poolRatingRange
    ) external;

    /**
     * @notice Adds list of the risk profiles in Registry contract Storage in one transaction
     * @dev All parameters must be in the same order.
     * @param _riskProfileCodes codes of riskProfiles
     * @param _names names of riskProfiles
     * @param _symbols symbols of riskProfiles
     * @param _canBorrow List of boolean values indicating whether the riskProfile allows borrow step
     * @param _poolRatingRanges List of pool rating range supported by given list of risk profiles
     */
    function addRiskProfile(
        uint256[] memory _riskProfileCodes,
        string[] memory _names,
        string[] memory _symbols,
        bool[] memory _canBorrow,
        DataTypes.PoolRatingsRange[] memory _poolRatingRanges
    ) external;

    /**
     * @notice Change the borrow permission for existing risk profile
     * @param _riskProfileCode Risk profile code (Eg: 1,2, and so on where 0 is reserved for 'no strategy')
     * to update with strategy steps
     * @param _canBorrow A boolean value indicating whether the riskProfile allows borrow step
     */
    function updateRiskProfileBorrow(uint256 _riskProfileCode, bool _canBorrow) external;

    /**
     * @notice Update the pool ratings for existing risk profile
     * @param _riskProfileCode Risk profile code (Eg: 1,2, and so on where 0 is reserved for 'no strategy')
     * to update with pool rating range
     * @param _poolRatingRange pool rating range ([lowerLimit, upperLimit]) to update for given risk profile
     */
    function updateRPPoolRatings(uint256 _riskProfileCode, DataTypes.PoolRatingsRange memory _poolRatingRange) external;

    /**
     * @notice Remove the existing risk profile in Registry contract Storage
     * @param _index Index of risk profile to be removed
     */
    function removeRiskProfile(uint256 _index) external;

    /**
     * @notice Get the list of tokensHash
     * @return Returns the list of tokensHash.
     */
    function getTokenHashes() external view returns (bytes32[] memory);

    /**
     * @notice Get list of token given the tokensHash
     * @return Returns the list of tokens corresponding to tokensHash
     */
    function getTokensHashToTokenList(bytes32 _tokensHash) external view returns (address[] memory);

    /**
     * @notice Get the list of all the riskProfiles
     * @return Returns the list of all riskProfiles stored in Registry Storage
     */
    function getRiskProfileList() external view returns (uint256[] memory);

    /**
     * @notice Retrieve the StrategyManager contract address
     * @return Returns the StrategyManager contract address
     */
    function getStrategyManager() external view returns (address);

    /**
     * @notice Retrieve the StrategyProvider contract address
     * @return Returns the StrategyProvider contract address
     */
    function getStrategyProvider() external view returns (address);

    /**
     * @notice Retrieve the InvestStrategyRegistry contract address
     * @return Returns the InvestStrategyRegistry contract address
     */
    function getInvestStrategyRegistry() external view returns (address);

    /**
     * @notice Retrieve the RiskManager contract address
     * @return Returns the RiskManager contract address
     */
    function getRiskManager() external view returns (address);

    /**
     * @notice Retrieve the OPTYDistributor contract address
     * @return Returns the OPTYDistributor contract address
     */
    function getOPTYDistributor() external view returns (address);

    /**
     * @notice Retrieve the ODEFIVaultBooster contract address
     * @return Returns the ODEFIVaultBooster contract address
     */
    function getODEFIVaultBooster() external view returns (address);

    /**
     * @notice Retrieve the Governance address
     * @return Returns the Governance address
     */
    function getGovernance() external view returns (address);

    /**
     * @notice Retrieve the FinanceOperator address
     * @return Returns the FinanceOperator address
     */
    function getFinanceOperator() external view returns (address);

    /**
     * @notice Retrieve the RiskOperator address
     * @return Returns the RiskOperator address
     */
    function getRiskOperator() external view returns (address);

    /**
     * @notice Retrieve the StrategyOperator address
     * @return Returns the StrategyOperator address
     */
    function getStrategyOperator() external view returns (address);

    /**
     * @notice Retrieve the Operator address
     * @return Returns the Operator address
     */
    function getOperator() external view returns (address);

    /**
     * @notice Retrieve the HarvestCodeProvider contract address
     * @return Returns the HarvestCodeProvider contract address
     */
    function getHarvestCodeProvider() external view returns (address);

    /**
     * @notice Retrieve the AprOracle contract address
     * @return Returns the AprOracle contract address
     */
    function getAprOracle() external view returns (address);

    /**
     * @notice Retrieve the OPTYStakingRateBalancer contract address
     * @return Returns the OPTYStakingRateBalancer contract address
     */
    function getOPTYStakingRateBalancer() external view returns (address);

    /**
     * @notice Get the configuration of vault contract
     * @return _vaultConfiguration Returns the configuration of vault contract
     */
    function getVaultConfiguration(address _vault)
        external
        view
        returns (DataTypes.VaultConfiguration memory _vaultConfiguration);

    /**
     * @notice Get the properties corresponding to riskProfile code provided
     * @return _riskProfile Returns the properties corresponding to riskProfile provided
     */
    function getRiskProfile(uint256) external view returns (DataTypes.RiskProfile memory _riskProfile);

    /**
     * @notice Get the index corresponding to tokensHash provided
     * @param _tokensHash Hash of token address/addresses
     * @return _index Returns the index corresponding to tokensHash provided
     */
    function getTokensHashIndexByHash(bytes32 _tokensHash) external view returns (uint256 _index);

    /**
     * @notice Get the tokensHash available at the index provided
     * @param _index Index at which you want to get the tokensHash
     * @return _tokensHash Returns the tokensHash available at the index provided
     */
    function getTokensHashByIndex(uint256 _index) external view returns (bytes32 _tokensHash);

    /**
     * @notice Get the rating and Is pool a liquidity pool for the _pool provided
     * @param _pool Liquidity Pool (like cDAI etc.) address
     * @return _liquidityPool Returns the rating and Is pool a liquidity pool for the _pool provided
     */
    function getLiquidityPool(address _pool) external view returns (DataTypes.LiquidityPool memory _liquidityPool);

    /**
     * @notice Get the configuration related to Strategy contracts
     * @return _strategyConfiguration Returns the configuration related to Strategy contracts
     */
    function getStrategyConfiguration()
        external
        view
        returns (DataTypes.StrategyConfiguration memory _strategyConfiguration);

    /**
     * @notice Get the contract address required as part of strategy by vault contract
     * @return _vaultStrategyConfiguration Returns the configuration related to Strategy for Vault contracts
     */
    function getVaultStrategyConfiguration()
        external
        view
        returns (DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration);

    /**
     * @notice Get the adapter address mapped to the _pool provided
     * @param _pool Liquidity Pool (like cDAI etc.) address
     * @return _adapter Returns the adapter address mapped to the _pool provided
     */
    function getLiquidityPoolToAdapter(address _pool) external view returns (address _adapter);

    /**
     * @notice Get the treasury accounts with their fee shares corresponding to vault contract
     * @param _vault Vault contract address
     * @return Returns Treasuries along with their fee shares
     */
    function getTreasuryShares(address _vault) external view returns (DataTypes.TreasuryShare[] memory);

    /**
     * @notice Check if the token is approved or not
     * @param _token Token address for which to check if it is approved or not
     * @return _isTokenApproved Returns a boolean for token approved or not
     */
    function isApprovedToken(address _token) external view returns (bool _isTokenApproved);

    /**
     * @notice Check if the user is whitelisted or not
     * @param _vault Vault contract address
     * @param _user User address for which to check if it is whitelisted or not
     * @return _isUserWhitelisted Returns a boolean for user whitelisted or not
     */
    function isUserWhitelisted(address _vault, address _user) external view returns (bool _isUserWhitelisted);
}
