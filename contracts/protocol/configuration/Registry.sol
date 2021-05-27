// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { Address, SafeMath } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { ModifiersController } from "./ModifiersController.sol";
import { RegistryProxy } from "./RegistryProxy.sol";
import { IVault } from "../../interfaces/opty/IVault.sol";
import { DataTypes } from "../../libraries/types/DataTypes.sol";

/**
 * @title Registry
 *
 * @author Opty.fi
 *
 * @dev Contract to persit status of tokens,lpTokens,lp/cp and Vaults
 */
contract Registry is ModifiersController {
    using Address for address;
    using SafeMath for uint256;

    /**
     * @dev Set RegistryProxy to act as Registry
     */
    function become(RegistryProxy _registryProxy) public {
        require(msg.sender == _registryProxy.governance(), "!governance");
        require(_registryProxy.acceptImplementation() == 0, "!unauthorized");
    }

    /**
     * @dev set the VaultStepInvestStrategyDefinitionRegistry contract address.
     * Can only be called by the current governance.
     */

    function setVaultStepInvestStrategyDefinitionRegistry(address _vaultStepInvestStrategyDefinitionRegistry)
        external
        onlyGovernance
        returns (bool)
    {
        require(_vaultStepInvestStrategyDefinitionRegistry != address(0), "!address(0)");
        vaultStepInvestStrategyDefinitionRegistry = _vaultStepInvestStrategyDefinitionRegistry;
        return true;
    }

    /**
     * @dev set the APROracle contract address.
     * Can only be called by the current governance.
     */

    function setAPROracle(address _aprOracle) external onlyGovernance returns (bool) {
        require(_aprOracle != address(0), "!address(0)");
        aprOracle = _aprOracle;
        return true;
    }

    /**
     * @dev set the StrategyProvider contract address.
     * Can only be called by the current governance.
     */

    function setStrategyProvider(address _strategyProvider) external onlyGovernance returns (bool) {
        require(_strategyProvider != address(0), "!address(0)");
        strategyProvider = _strategyProvider;
        return true;
    }

    /**
     * @dev Sets multiple `_token` from the {tokens} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     */

    function approveToken(address[] memory _tokens) external onlyGovernance returns (bool) {
        for (uint8 _i = 0; _i < uint8(_tokens.length); _i++) {
            _approveToken(_tokens[_i]);
        }
        return true;
    }

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
    function approveToken(address _token) external onlyGovernance returns (bool) {
        _approveToken(_token);
        return true;
    }

    /**
     * @dev Revokes multiple `_token` from the {tokens} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     */

    function revokeToken(address[] memory _tokens) external onlyGovernance returns (bool) {
        for (uint8 _i = 0; _i < uint8(_tokens.length); _i++) {
            _revokeToken(_tokens[_i]);
        }
        return true;
    }

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
    function revokeToken(address _token) external onlyGovernance returns (bool) {
        _revokeToken(_token);
    }

    /**
     * @dev Sets multiple `_pool` from the {liquidityPools} mapping.
     *
     */
    function approveLiquidityPool(address[] memory _pools) external onlyGovernance returns (bool) {
        for (uint8 _i = 0; _i < uint8(_pools.length); _i++) {
            _approveLiquidityPool(_pools[_i]);
        }
        return true;
    }

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
    function approveLiquidityPool(address _pool) external onlyGovernance returns (bool) {
        _approveLiquidityPool(_pool);
        return true;
    }

    /**
     * @dev Revokes multiple `_pool` from the {liquidityPools} mapping.
     *
     */
    function revokeLiquidityPool(address[] memory _pools) external onlyGovernance returns (bool) {
        for (uint8 _i = 0; _i < uint8(_pools.length); _i++) {
            _revokeLiquidityPool(_pools[_i]);
        }
        return true;
    }

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
    function revokeLiquidityPool(address _pool) external onlyGovernance returns (bool) {
        _revokeLiquidityPool(_pool);
        return true;
    }

    /**
     * @dev Provide [`_pool`,`_rate`] from the {liquidityPools} mapping.
     *
     */
    function rateLiquidityPool(DataTypes.PoolRate[] memory _poolRates) external onlyOperator returns (bool) {
        for (uint8 _i = 0; _i < _poolRates.length; _i++) {
            _rateLiquidityPool(_poolRates[_i].pool, _poolRates[_i].rate);
        }
        return true;
    }

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
    function rateLiquidityPool(address _pool, uint8 _rate) external onlyOperator returns (bool) {
        _rateLiquidityPool(_pool, _rate);
        return true;
    }

    /**
     * @dev Sets multiple `_pool` from the {creditPools} mapping.
     *
     */
    function approveCreditPool(address[] memory _pools) external onlyGovernance returns (bool) {
        for (uint8 _i = 0; _i < uint8(_pools.length); _i++) {
            _approveCreditPool(_pools[_i]);
        }
        return true;
    }

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
    function approveCreditPool(address _pool) external onlyGovernance returns (bool) {
        _approveCreditPool(_pool);
        return true;
    }

    /**
     * @dev Revokes multiple `_pool` from the {revokeCreditPools} mapping.
     *
     */
    function revokeCreditPool(address[] memory _pools) external onlyGovernance returns (bool) {
        for (uint8 _i = 0; _i < uint8(_pools.length); _i++) {
            _revokeCreditPool(_pools[_i]);
        }
        return true;
    }

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
    function revokeCreditPool(address _pool) external onlyGovernance returns (bool) {
        _revokeCreditPool(_pool);
        return true;
    }

    /**
     * @dev Provide [`_pool`,`_rate`] from the {creditPools} mapping.
     *
     */
    function rateCreditPool(DataTypes.PoolRate[] memory _poolRates) external onlyOperator returns (bool) {
        for (uint8 _i = 0; _i < _poolRates.length; _i++) {
            _rateCreditPool(_poolRates[_i].pool, _poolRates[_i].rate);
        }
        return true;
    }

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
    function rateCreditPool(address _pool, uint8 _rate) external onlyOperator returns (bool) {
        _rateCreditPool(_pool, _rate);
        return true;
    }

    /**
     * @dev Maps liquidity `_pool` to the protocol adapter `_adapter` using {liquidityPoolToAdapter}.
     *
     */
    function setLiquidityPoolToAdapter(DataTypes.PoolAdapter[] memory _poolAdapters)
        external
        onlyGovernance
        returns (bool)
    {
        for (uint8 _i = 0; _i < _poolAdapters.length; _i++) {
            _setLiquidityPoolToAdapter(_poolAdapters[_i].pool, _poolAdapters[_i].adapter);
        }
        return true;
    }

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
    function setLiquidityPoolToAdapter(address _pool, address _adapter) external onlyGovernance returns (bool) {
        _setLiquidityPoolToAdapter(_pool, _adapter);
        return true;
    }

    /**
     * @dev Sets multiple `_tokens` to keccak256 hash the {tokensHashToTokens} mapping.
     *
     */
    function setTokensHashToTokens(address[][] memory _setOfTokens) external onlyOperator returns (bool) {
        for (uint8 _i = 0; _i < uint8(_setOfTokens.length); _i++) {
            _setTokensHashToTokens(_setOfTokens[_i]);
        }
        return true;
    }

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
    function setTokensHashToTokens(address[] memory _tokens) external onlyOperator returns (bool) {
        _setTokensHashToTokens(_tokens);
        return true;
    }

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
    ) external onlyOperator returns (bool) {
        _setUnderlyingAssetHashToRPToVaults(keccak256(abi.encodePacked(_underlyingTokens)), _riskProfile, _vault);
        return true;
    }

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
    function setWithdrawalFee(address _vault, uint256 _withdrawalFee) public onlyGovernance returns (bool _success) {
        require(_vault != address(0), "!address(0)");
        require(_vault.isContract(), "!isContract");
        require(_withdrawalFee >= 0 && _withdrawalFee <= 10000, "!BasisRange");
        vaultToVaultConfiguration[_vault].withdrawlFee = _withdrawalFee;
        _success = true;
    }

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
        onlyGovernance
        returns (bool)
    {
        require(_vault != address(0), "!address(0)");
        require(_vault.isContract(), "!isContract");
        require(_treasuryShares.length > 0, "length!>0");
        uint256 _sharesSum = 0;
        for (uint8 _i = 0; _i < uint8(_treasuryShares.length); _i++) {
            require(_treasuryShares[_i].treasury != address(0), "!address(0)");
            _sharesSum = _sharesSum.add(_treasuryShares[_i].share);
        }
        require(_sharesSum == vaultToVaultConfiguration[_vault].withdrawlFee, "FeeShares!=WithdrawalFee");

        //  delete the existing the treasury accounts if any to reset them
        if (vaultToVaultConfiguration[_vault].treasuryShares.length > 0) {
            delete vaultToVaultConfiguration[_vault].treasuryShares;
        }
        for (uint8 _i = 0; _i < uint8(_treasuryShares.length); _i++) {
            vaultToVaultConfiguration[_vault].treasuryShares.push(_treasuryShares[_i]);
        }
        return true;
    }

    /**
     * @dev Set the treasury accounts along with  their fee shares corresponding to vault contract.
     *
     * @param _vault Vault contract address
     *
     * @return Returns Treasuries along with their fee shares
     */
    function getTreasuryShares(address _vault) external view returns (DataTypes.TreasuryShare[] memory) {
        return vaultToVaultConfiguration[_vault].treasuryShares;
    }

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
    ) public onlyOperator returns (bool) {
        require(uint8(_riskProfiles.length) == uint8(_vaults.length), "!Profileslength");
        for (uint8 _i = 0; _i < uint8(_vaults.length); _i++) {
            require(uint8(_vaults[_i].length) == uint8(_underlyingTokens.length), "!VaultsLength");
            for (uint8 _j = 0; _j < _vaults[_i].length; _j++) {
                _setUnderlyingAssetHashToRPToVaults(
                    keccak256(abi.encodePacked(_underlyingTokens[_j])),
                    _riskProfiles[_i],
                    _vaults[_i][_j]
                );
            }
        }
        return true;
    }

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
    function discontinue(address _vault) external onlyGovernance returns (bool) {
        require(_vault != address(0), "!address(0)");
        vaultToVaultConfiguration[_vault].discontinued = true;
        IVault(_vault).discontinue();
        emit LogDiscontinueVault(_vault, vaultToVaultConfiguration[_vault].discontinued, msg.sender);
        return true;
    }

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
    function unpauseVaultContract(address _vault, bool _unpaused) external onlyGovernance returns (bool) {
        require(_vault != address(0), "!address(0)");
        vaultToVaultConfiguration[_vault].unpaused = _unpaused;
        IVault(_vault).setUnpaused(vaultToVaultConfiguration[_vault].unpaused);
        emit LogUnpauseVault(_vault, vaultToVaultConfiguration[_vault].unpaused, msg.sender);
        return true;
    }

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
    ) external onlyOperator returns (bool) {
        _addRiskProfile(_riskProfile, _noOfSteps, _poolRatingRange);
        return true;
    }

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
    ) external onlyOperator returns (bool) {
        require(_riskProfiles.length > 0, "!length>0");
        require(_riskProfiles.length == _noOfSteps.length, "!Stepslength");
        require(_riskProfiles.length == _poolRatingRanges.length, "!PoolRatingsLength");

        for (uint8 _i = 0; _i < _riskProfiles.length; _i++) {
            _addRiskProfile(_riskProfiles[_i], _noOfSteps[_i], _poolRatingRanges[_i]);
        }
        return true;
    }

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
    function updateRiskProfileSteps(string memory _riskProfile, uint8 _noOfSteps) external onlyOperator returns (bool) {
        _updateRiskProfileSteps(_riskProfile, _noOfSteps);
        return true;
    }

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
        onlyOperator
        returns (bool)
    {
        _updateRPPoolRatings(_riskProfile, _poolRatingRange);
        return true;
    }

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
    function removeRiskProfile(uint256 _index) external onlyOperator returns (bool) {
        _removeRiskProfile(_index);
        return true;
    }

    /**
     * @dev Returns the list of tokensHash
     */
    function getTokenHashes() public view returns (bytes32[] memory) {
        return tokensHashIndexes;
    }

    /**
     * @dev Returns list of token given the `_tokensHash`.
     */
    function getTokensHashToTokens(bytes32 _tokensHash) public view returns (address[] memory) {
        return tokensHashToTokens[_tokensHash].tokens;
    }

    /**
     * @dev Get the list of all the riskProfiles
     */
    function getRiskProfiles() public view returns (string[] memory) {
        return riskProfilesArray;
    }

    function _approveToken(address _token) internal returns (bool) {
        require(_token != address(0), "!address(0)");
        require(address(_token).isContract(), "!isContract");
        require(!tokens[_token], "!tokens");
        tokens[_token] = true;
        emit LogToken(_token, tokens[_token], msg.sender);
        return true;
    }

    function _revokeToken(address _token) internal returns (bool) {
        require(tokens[_token], "!tokens");
        tokens[_token] = false;
        emit LogToken(_token, tokens[_token], msg.sender);
        return true;
    }

    function _approveLiquidityPool(address _pool) internal onlyGovernance returns (bool) {
        require(_pool != address(0), "!address(0)");
        require(address(_pool).isContract(), "!isContract");
        require(!liquidityPools[_pool].isLiquidityPool, "!liquidityPools");
        liquidityPools[_pool].isLiquidityPool = true;
        emit LogLiquidityPool(_pool, liquidityPools[_pool].isLiquidityPool, msg.sender);
        return true;
    }

    function _revokeLiquidityPool(address _pool) internal returns (bool) {
        require(liquidityPools[_pool].isLiquidityPool, "!liquidityPools");
        liquidityPools[_pool].isLiquidityPool = false;
        emit LogLiquidityPool(_pool, liquidityPools[_pool].isLiquidityPool, msg.sender);
        return true;
    }

    function _rateLiquidityPool(address _pool, uint8 _rate) internal returns (bool) {
        require(liquidityPools[_pool].isLiquidityPool, "!liquidityPools");
        liquidityPools[_pool].rating = _rate;
        emit LogRateLiquidityPool(_pool, liquidityPools[_pool].rating, msg.sender);
        return true;
    }

    function _approveCreditPool(address _pool) internal returns (bool) {
        require(_pool != address(0), "!address(0)");
        require(address(_pool).isContract(), "!isContract");
        require(!creditPools[_pool].isLiquidityPool, "!creditPools");
        creditPools[_pool].isLiquidityPool = true;
        emit LogCreditPool(_pool, creditPools[_pool].isLiquidityPool, msg.sender);
        return true;
    }

    function _revokeCreditPool(address _pool) internal returns (bool) {
        require(creditPools[_pool].isLiquidityPool, "!creditPools");
        creditPools[_pool].isLiquidityPool = false;
        emit LogCreditPool(_pool, creditPools[_pool].isLiquidityPool, msg.sender);
        return true;
    }

    function _rateCreditPool(address _pool, uint8 _rate) internal returns (bool) {
        require(creditPools[_pool].isLiquidityPool, "!liquidityPools");
        creditPools[_pool].rating = _rate;
        emit LogRateCreditPool(_pool, creditPools[_pool].rating, msg.sender);
        return true;
    }

    function _setLiquidityPoolToAdapter(address _pool, address _adapter) internal returns (bool) {
        require(_adapter.isContract(), "!_adapter.isContract()");
        require(liquidityPools[_pool].isLiquidityPool || creditPools[_pool].isLiquidityPool, "!liquidityPools");
        liquidityPoolToAdapter[_pool] = _adapter;
        emit LogLiquidityPoolToDepositToken(_pool, _adapter, msg.sender);
        return true;
    }

    function _setTokensHashToTokens(address[] memory _tokens) internal returns (bool) {
        for (uint8 _i = 0; _i < uint8(_tokens.length); _i++) {
            require(tokens[_tokens[_i]], "!tokens");
        }
        bytes32 _tokensHash = keccak256(abi.encodePacked(_tokens));
        require(_isNewTokensHash(_tokensHash), "!_isNewTokensHash");
        tokensHashIndexes.push(_tokensHash);
        tokensHashToTokens[_tokensHash].index = tokensHashIndexes.length - 1;
        for (uint8 _i = 0; _i < uint8(_tokens.length); _i++) {
            tokensHashToTokens[_tokensHash].tokens.push(_tokens[_i]);
        }
        emit LogTokensToTokensHash(_tokensHash, msg.sender);
        return true;
    }

    function _setUnderlyingAssetHashToRPToVaults(
        bytes32 _underlyingAssetHash,
        string memory _riskProfile,
        address _vault
    ) internal returns (bool) {
        require(
            _underlyingAssetHash != 0x0000000000000000000000000000000000000000000000000000000000000000,
            "!underlyingAssetHash"
        );
        require(bytes(_riskProfile).length > 0, "RP_empty.");
        require(_vault != address(0), "!address(0)");
        require(address(_vault).isContract(), "!isContract");
        require(riskProfiles[_riskProfile].exists, "!RP");
        underlyingAssetHashToRPToVaults[_underlyingAssetHash][_riskProfile] = _vault;
        emit LogUnderlyingAssetHashToRPToVaults(_underlyingAssetHash, _riskProfile, _vault, msg.sender);
        return true;
    }

    /**
     * @dev Add the risk profile in Registry contract Storage
     *
     * Returns _riskProfile added
     *
     * Requirements:
     *
     * - `_riskProfile` can not be empty
     *          - should not already exists
     *
     */
    function _addRiskProfile(
        string memory _riskProfile,
        uint8 _noOfSteps,
        DataTypes.PoolRatingsRange memory _poolRatingRange
    ) internal returns (bool) {
        require(bytes(_riskProfile).length > 0, "RP_Empty!");
        require(!riskProfiles[_riskProfile].exists, "RP_already_exists");

        riskProfilesArray.push(_riskProfile);
        riskProfiles[_riskProfile].steps = _noOfSteps;
        riskProfiles[_riskProfile].lowerLimit = _poolRatingRange.lowerLimit;
        riskProfiles[_riskProfile].upperLimit = _poolRatingRange.upperLimit;
        riskProfiles[_riskProfile].index = riskProfilesArray.length - 1;
        riskProfiles[_riskProfile].exists = true;

        emit LogRiskProfile(
            riskProfiles[_riskProfile].index,
            riskProfiles[_riskProfile].exists,
            riskProfiles[_riskProfile].steps,
            msg.sender
        );
        emit LogRPPoolRatings(
            riskProfiles[_riskProfile].index,
            riskProfiles[_riskProfile].lowerLimit,
            riskProfiles[_riskProfile].upperLimit,
            msg.sender
        );
        return true;
    }

    function _updateRiskProfileSteps(string memory _riskProfile, uint8 _noOfSteps) internal returns (bool) {
        require(riskProfiles[_riskProfile].exists, "!Rp_Exists");
        riskProfiles[_riskProfile].steps = _noOfSteps;
        emit LogRiskProfile(
            riskProfiles[_riskProfile].index,
            riskProfiles[_riskProfile].exists,
            riskProfiles[_riskProfile].steps,
            msg.sender
        );
        return true;
    }

    function _updateRPPoolRatings(string memory _riskProfile, DataTypes.PoolRatingsRange memory _poolRatingRange)
        internal
        returns (bool)
    {
        require(riskProfiles[_riskProfile].exists, "!Rp_Exists");
        riskProfiles[_riskProfile].lowerLimit = _poolRatingRange.lowerLimit;
        riskProfiles[_riskProfile].upperLimit = _poolRatingRange.upperLimit;
        emit LogRPPoolRatings(
            riskProfiles[_riskProfile].index,
            riskProfiles[_riskProfile].lowerLimit,
            riskProfiles[_riskProfile].upperLimit,
            msg.sender
        );
        return true;
    }

    function _removeRiskProfile(uint256 _index) internal returns (bool) {
        require(_index <= riskProfilesArray.length, "Invalid_Rp_index");
        string memory _riskProfile = riskProfilesArray[_index];
        require(riskProfiles[_riskProfile].exists, "!Rp_Exists");
        riskProfiles[_riskProfile].exists = false;
        emit LogRiskProfile(_index, riskProfiles[_riskProfile].exists, riskProfiles[_riskProfile].steps, msg.sender);
        return true;
    }

    /**
     * @dev Check duplicate `_hash` tokensHash from the {tokensHashIndexes} mapping.
     *
     * Returns a boolean value indicating whether duplicate `_hash` exists or not.
     *
     * Requirements:
     *
     * - {tokensHashIndexes} length should be more than zero.
     */
    function _isNewTokensHash(bytes32 _hash) internal view returns (bool) {
        if (tokensHashIndexes.length == 0) {
            return true;
        }
        return (tokensHashIndexes[tokensHashToTokens[_hash].index] != _hash);
    }
}
