// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { DataTypes } from "../../libraries/types/DataTypes.sol";

/**
 * @dev Interface of the opty.fi's protocol reegistry
 */
interface IRegistry {
    /**
     * @dev Set the treasury accounts along with  their fee shares corresponding to vault contract.
     *
     * @param _vault Vault contract address
     * @param _treasuryShares Array of treasuries and their fee shares
     *
     * @return Returns a boolean value indicating whether the operation succeeded
     *
     * Requirements:
     *  - `msg.sender` Can only be current governance.
     */
    function setTreasuryShares(address _vault, DataTypes.TreasuryShare[] memory _treasuryShares)
        external
        returns (bool);

    /**
     * @dev set the VaultStepInvestStrategyDefinitionRegistry contract address.
     * Can only be called by the current governance.
     */

    function setVaultStepInvestStrategyDefinitionRegistry(address _vaultStepInvestStrategyDefinitionRegistry)
        external
        returns (bool);

    /**
     * @dev set the APROracle contract address.
     * Can only be called by the current governance.
     */

    function setAPROracle(address _aprOracle) external returns (bool);

    /**
     * @dev set the StrategyProvider contract address.
     * Can only be called by the current governance.
     */

    function setStrategyProvider(address _strategyProvider) external returns (bool);

    /**
     * @dev set the RiskManager's contract address.
     * Can only be called by the current governance.
     */
    function setRiskManager(address _riskManager) external returns (bool);

    /**
     * @dev set the HarvestCodeProvider contract address.
     * Can only be called by the current governance.
     */
    function setHarvestCodeProvider(address _harvestCodeProvider) external returns (bool);

    /**
     * @dev set the StrategyManager contract address.
     * Can only be called by the current governance.
     */
    function setStrategyManager(address _strategyManager) external returns (bool);

    /**
     * @dev set the $OPTY token's contract address.
     * Can only be called by the current governance.
     */
    function setOPTY(address _opty) external returns (bool);

    /**
     * @dev set the PriceOracle contract address.
     * Can only be called by the current governance.
     */
    function setPriceOracle(address _priceOracle) external returns (bool);

    /**
     * @dev set the OPTYStakingRateBalancer contract address.
     * Can only be called by the current governance.
     */
    function setOPTYStakingRateBalancer(address _optyStakingRateBalancer) external returns (bool);

    /**
     * @dev Sets multiple `_token` from the {tokens} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     */

    function approveToken(address[] memory _tokens) external returns (bool);

    /**
     * @dev Sets `_token` from the {tokens} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {LogToken} event.
     *
     * Requirements:
     *
     * - `_token` cannot be the zero address or an EOA.
     * - msg.sender should be governance.
     * - `_token` should not be approved
     */
    function approveToken(address _token) external returns (bool);

    /**
     * @dev Revokes multiple `_token` from the {tokens} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     */
    function revokeToken(address[] memory _tokens) external returns (bool);

    /**
     * @dev Revokes `_token` from the {tokens} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {LogToken} event.
     *
     * Requirements:
     *
     * - `_token` cannot be the zero address or an EOA.
     * - msg.sender should be governance.
     * - `_token` should be approved
     */
    function revokeToken(address _token) external returns (bool);

    /**
     * @dev Sets multiple `_pool` from the {liquidityPools} mapping.
     *
     */
    function approveLiquidityPool(address[] memory _pools) external returns (bool);

    /**
     * @dev Sets `_pool` from the {liquidityPools} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {LogLiquidityPool} event.
     *
     * Requirements:
     *
     * - `_pool` cannot be the zero address or an EOA.
     * - msg.sender should be governance.
     * - `_pool` should not be approved
     */
    function approveLiquidityPool(address _pool) external returns (bool);

    /**
     * @dev Revokes multiple `_pool` from the {liquidityPools} mapping.
     *
     */
    function revokeLiquidityPool(address[] memory _pools) external returns (bool);

    /**
     * @dev Revokes `_pool` from the {liquidityPools} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {LogLiquidityPool} event.
     *
     * Requirements:
     *
     * - `_pool` cannot be the zero address or an EOA.
     * - msg.sender should be governance.
     * - `_pool` should not be approved
     */
    function revokeLiquidityPool(address _pool) external returns (bool);

    /**
     * @dev Provide [`_pool`,`_rate`] from the {liquidityPools} mapping.
     *
     */
    function rateLiquidityPool(DataTypes.PoolRate[] memory _poolRates) external returns (bool);

    /**
     * @dev Provide `_rate` to `_pool` from the {liquidityPools} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {LogRateLiquidityPool} event.
     *
     * Requirements:
     *
     * - `_pool` cannot be the zero address or an EOA.
     * - msg.sender should be operator.
     * - `_pool` should be approved
     */
    function rateLiquidityPool(address _pool, uint8 _rate) external returns (bool);

    /**
     * @dev Sets multiple `_pool` from the {creditPools} mapping.
     *
     */
    function approveCreditPool(address[] memory _pools) external returns (bool);

    /**
     * @dev Sets `_pool` from the {creditPools} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {LogCreditPool} event.
     *
     * Requirements:
     *
     * - `_pool` cannot be the zero address or an EOA.
     * - msg.sender should be governance.
     * - `_pool` should not be approved
     */
    function approveCreditPool(address _pool) external returns (bool);

    /**
     * @dev Revokes multiple `_pool` from the {revokeCreditPools} mapping.
     *
     */
    function revokeCreditPool(address[] memory _pools) external returns (bool);

    /**
     * @dev Revokes `_pool` from the {creditPools} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {LogCreditPool} event.
     *
     * Requirements:
     *
     * - `_pool` cannot be the zero address or an EOA.
     * - msg.sender should be governance.
     * - `_pool` should not be approved
     */
    function revokeCreditPool(address _pool) external returns (bool);

    /**
     * @dev Provide [`_pool`,`_rate`] from the {creditPools} mapping.
     *
     */
    function rateCreditPool(DataTypes.PoolRate[] memory _poolRates) external returns (bool);

    /**
     * @dev Provide `_rate` to `_pool` from the {creditPools} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {LogRateCreditPool} event.
     *
     * Requirements:
     *
     * - `_pool` cannot be the zero address or an EOA.
     * - msg.sender should be operator.
     * - `_pool` should be approved
     */
    function rateCreditPool(address _pool, uint8 _rate) external returns (bool);

    /**
     * @dev Maps liquidity `_pool` to the protocol adapter `_adapter` using {liquidityPoolToAdapter}.
     *
     */
    function setLiquidityPoolToAdapter(DataTypes.PoolAdapter[] memory _poolAdapters) external returns (bool);

    /**
     * @dev Sets liquidity `_pool` to the protocol adapter `_adapter` from the {liquidityPoolToAdapter} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {LogLiquidityPoolToDepositToken} event.
     *
     * Requirements:
     *
     * - `_pool`should be approved.
     * - msg.sender should be governance.
     * - `_adapter` should be contract
     */
    function setLiquidityPoolToAdapter(address _pool, address _adapter) external returns (bool);

    /**
     * @dev Sets multiple `_tokens` to keccak256 hash the {tokensHashToTokens} mapping.
     *
     */
    function setTokensHashToTokens(address[][] memory _setOfTokens) external returns (bool);

    /**
     * @dev Sets `_tokens` to keccak256 hash the {tokensHashToTokens} mapping.
     *
     * Emits a {LogSetTokensHashToTokens} event.
     *
     * Requirements:
     *
     * - msg.sender should be operator.
     * - `_tokens` should be approved
     */
    function setTokensHashToTokens(address[] memory _tokens) external returns (bool);

    /**
     * @dev Sets `Vault`/`LM_vault` contract for the corresponding `_underlyingToken` and `_riskProfile`
     *
     * Returns a boolean value indicating whether the operation succeeded
     *
     * Emits a {LogUnderlyingAssetHashToRPToVaults} event
     *
     * Requirements:
     *
     * - `_underlyingTokens` cannot be empty
     * - `_vault` cannot be the zero address or EOA
     * - `msg.sender` (caller) should be operator
     *
     */
    function setUnderlyingAssetHashToRPToVaults(
        address[] memory _underlyingTokens,
        string memory _riskProfile,
        address _vault
    ) external returns (bool);

    /**
     * @dev Set the withdrawal fee for the vault contract.
     *
     * @param _vault Vault contract address
     * @param _withdrawalFee Withdrawal fee to be set for vault contract
     *
     * @return _success Returns a boolean value indicating whether the operation succeeded
     *
     * Requirements:
     *  - `msg.sender` Can only be current governance.
     */
    function setWithdrawalFee(address _vault, uint256 _withdrawalFee) external returns (bool _success);

    /**
     * @dev Sets bunch of `Vaults`/`LP_vaults` contract for the corresponding `_underlyingTokens`
     *      and `_riskProfiles`in one transaction
     *
     * Returns a boolean value indicating whether the operation succeeded
     *
     * Emits a {LogUnderlyingAssetHashToRPToVaults} event
     *
     * Requirements:
     *
     * - `_underlyingTokens` cannot be empty
     * - `_vault` cannot be the zero address or EOA
     * - `msg.sender` (caller) should be operator
     *
     */
    function setUnderlyingAssetHashToRPToVaults(
        address[][] memory _underlyingTokens,
        string[] memory _riskProfiles,
        address[][] memory _vaults
    ) external returns (bool);

    /**
     * @dev Set Disconinue for the _vault contract
     *
     * Returns a boolean value indicating whether operation is succeeded
     *
     * Emits a {LogDiscontinueVault} event
     *
     * Requirements:
     *
     * - `_vault` cannot be a zero address
     * - `msg.sender` (caller) should be governance
     */
    function discontinue(address _vault) external returns (bool);

    /**
     * @dev Set Pause functionality for the _vault contract
     *
     * Returns a boolean value indicating whether pause is set to true or false
     *
     * Emits a {LogUnpauseVault} event
     *
     * Requirements:
     *
     * - `_vault` cannot be a zero address
     * - `msg.sender` (caller) should be governance
     */
    function unpauseVaultContract(address _vault, bool _paused) external returns (bool);

    /**
     * @dev Add the risk profile in Registry contract Storage
     *
     * Returns _riskProfile added
     *
     * Requirements:
     *
     * - `_riskProfile` can not be empty
     *          - should not already exists
     * - `msg.sender` can only be operator
     */
    function addRiskProfile(
        string memory _riskProfile,
        uint8 _noOfSteps,
        DataTypes.PoolRatingsRange memory _poolRatingRange
    ) external returns (bool);

    /**
     * @dev Add list of the risk profiles in Registry contract Storage in 1 txn.
     *
     * Returns bool value for multiple _riskProfiles added operation succeeded
     *
     * Requirements:
     *
     * - `_riskProfile` can not be empty array
     *          - should not already exists
     * - `msg.sender` can only be operator
     *
     */
    function addRiskProfile(
        string[] memory _riskProfiles,
        uint8[] memory _noOfSteps,
        DataTypes.PoolRatingsRange[] memory _poolRatingRanges
    ) external returns (bool);

    /**
     * @dev Update the no. of steps for existing risk profile
     *
     * Returns bool value for update _riskProfile operation succeeded
     *
     * Requirements:
     *
     * - `_riskProfile` should exists
     * - `msg.sender` can only be operator
     */
    function updateRiskProfileSteps(string memory _riskProfile, uint8 _noOfSteps) external returns (bool);

    /**
     * @dev Update the pool ratings for existing risk profile
     *
     * Returns bool value for update _riskProfile operation succeeded
     *
     * Requirements:
     *
     * - `_riskProfile` should exists
     * - `msg.sender` can only be operator
     */
    function updateRPPoolRatings(string memory _riskProfile, DataTypes.PoolRatingsRange memory _poolRatingRange)
        external
        returns (bool);

    /**
     * @dev Remove the existing risk profile in Registry contract Storage
     *
     * Returns _riskProfile added
     *
     * Requirements:
     *
     * - `_riskProfile` can not be empty
     *          - should not already exists
     * - `msg.sender` can only be operator
     */
    function removeRiskProfile(uint256 _index) external returns (bool);

    /**
     * @dev Returns the list of tokensHash
     */
    function getTokenHashes() external view returns (bytes32[] memory);

    /**
     * @dev Returns list of token given the `_tokensHash`.
     */
    function getTokensHashToTokenList(bytes32 _tokensHash) external view returns (address[] memory);

    /**
     * @dev Get the list of all the riskProfiles
     */
    function getRiskProfileList() external view returns (string[] memory);

    function getStrategyManager() external view returns (address);

    function getStrategyProvider() external view returns (address);

    function getVaultStepInvestStrategyDefinitionRegistry() external view returns (address);

    function getRiskManager() external view returns (address);

    function getOptyMinter() external view returns (address);

    function getGovernance() external view returns (address);

    function getOperator() external view returns (address);

    function getStrategist() external view returns (address);

    function getHarvestCodeProvider() external view returns (address);

    function getAprOracle() external view returns (address);

    function getOPTYStakingRateBalancer() external view returns (address);

    function getVaultConfiguration(address _vault)
        external
        view
        returns (DataTypes.VaultConfiguration memory _vaultConfiguration);

    function getRiskProfile(string memory) external view returns (DataTypes.RiskProfile memory);

    function getTokensHashIndexByHash(bytes32 _tokensHash) external view returns (uint256 _index);

    function getTokensHashByIndex(uint256) external view returns (bytes32);

    function getLiquidityPool(address) external view returns (DataTypes.LiquidityPool memory);

    function getStrategyConfiguration()
        external
        view
        returns (DataTypes.StrategyConfiguration memory _strategyConfiguration);

    function getVaultStrategyConfiguration()
        external
        view
        returns (DataTypes.VaultStrategyConfiguration memory _vaultStrategyConfiguration);

    function getLiquidityPoolToAdapter(address) external view returns (address);

    /**
     * @dev Set the treasury accounts along with  their fee shares corresponding to vault contract.
     *
     * @param _vault Vault contract address
     *
     * @return Returns Treasuries along with their fee shares
     */
    function getTreasuryShares(address _vault) external view returns (DataTypes.TreasuryShare[] memory);

    function isApprovedToken(address) external view returns (bool);
}
