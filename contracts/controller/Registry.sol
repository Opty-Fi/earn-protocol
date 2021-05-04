// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { ModifiersController } from "./ModifiersController.sol";
import { RegistryProxy } from "./RegistryProxy.sol";
import { IVault } from "../interfaces/opty/IVault.sol";
import { DataTypes } from "../libraries/types/DataTypes.sol";

/**
 * @title Registry
 *
 * @author Opty.fi
 *
 * @dev Contract to persit status of tokens,lpTokens,lp/cp and Vaults
 */
contract Registry is ModifiersController {
    using Address for address;

    /**
     * @dev Sets multiple `_token` from the {tokens} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     */

    function approveTokens(address[] memory _tokens) external onlyGovernance returns (bool) {
        for (uint8 _i = 0; _i < uint8(_tokens.length); _i++) {
            address _token = _tokens[_i];
            approveToken(_token);
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
    function approveToken(address _token) public onlyGovernance returns (bool) {
        require(_token != address(0), "!address(0)");
        require(address(_token).isContract(), "!isContract");
        require(!tokens[_token], "!tokens");
        tokens[_token] = true;
        emit LogToken(msg.sender, _token, tokens[_token]);
        return true;
    }

    /**
     * @dev Revokes multiple `_token` from the {tokens} mapping.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     */

    function revokeTokens(address[] memory _tokens) external onlyGovernance returns (bool) {
        for (uint8 _i = 0; _i < uint8(_tokens.length); _i++) {
            address _token = _tokens[_i];
            revokeToken(_token);
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
    function revokeToken(address _token) public onlyGovernance returns (bool) {
        require(tokens[_token], "!tokens");
        tokens[_token] = false;
        emit LogToken(msg.sender, _token, tokens[_token]);
        return true;
    }

    /**
     * @dev Sets multiple `_pool` from the {liquidityPools} mapping.
     *
     */
    function approveLiquidityPools(address[] memory _pools) external onlyGovernance returns (bool) {
        for (uint8 _i = 0; _i < uint8(_pools.length); _i++) {
            address _pool = _pools[_i];
            approveLiquidityPool(_pool);
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
    function approveLiquidityPool(address _pool) public onlyGovernance returns (bool) {
        require(_pool != address(0), "!address(0)");
        require(address(_pool).isContract(), "!isContract");
        require(!liquidityPools[_pool].isLiquidityPool, "!liquidityPools");
        liquidityPools[_pool].isLiquidityPool = true;
        emit LogLiquidityPool(msg.sender, _pool, liquidityPools[_pool].isLiquidityPool);
        return true;
    }

    /**
     * @dev Revokes multiple `_pool` from the {liquidityPools} mapping.
     *
     */
    function revokeLiquidityPools(address[] memory _pools) external onlyGovernance returns (bool) {
        for (uint8 _i = 0; _i < uint8(_pools.length); _i++) {
            address _pool = _pools[_i];
            revokeLiquidityPool(_pool);
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
    function revokeLiquidityPool(address _pool) public onlyGovernance {
        require(liquidityPools[_pool].isLiquidityPool, "!liquidityPools");
        emit LogLiquidityPool(msg.sender, _pool, liquidityPools[_pool].isLiquidityPool);
        liquidityPools[_pool].isLiquidityPool = false;
    }

    /**
     * @dev Returns the liquidity pool by `_pool`.
     */
    function getLiquidityPool(address _pool) public view returns (DataTypes.LiquidityPool memory _liquidityPool) {
        _liquidityPool = liquidityPools[_pool];
    }

    /**
     * @dev Provide [`_pool`,`_rate`] from the {liquidityPools} mapping.
     *
     */
    function rateLiquidityPools(DataTypes.PoolRate[] memory _poolRates) external onlyOperator returns (bool) {
        for (uint8 _i = 0; _i < _poolRates.length; _i++) {
            DataTypes.PoolRate memory poolRate = _poolRates[_i];
            rateLiquidityPool(poolRate.pool, poolRate.rate);
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
    function rateLiquidityPool(address _pool, uint8 _rate) public onlyOperator returns (bool) {
        require(liquidityPools[_pool].isLiquidityPool, "!liquidityPools");
        liquidityPools[_pool].rating = _rate;
        emit LogRateLiquidityPool(msg.sender, _pool, liquidityPools[_pool].rating);
        return true;
    }

    /**
     * @dev Sets multiple `_pool` from the {creditPools} mapping.
     *
     */
    function approveCreditPools(address[] memory _pools) external onlyGovernance returns (bool) {
        for (uint8 _i = 0; _i < uint8(_pools.length); _i++) {
            address _pool = _pools[_i];
            approveCreditPool(_pool);
        }
        return true;
    }

    /**
     * @dev Sets `_pool` from the {creditPools} mapping.
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
    function approveCreditPool(address _pool) public onlyGovernance returns (bool) {
        require(_pool != address(0), "!address(0)");
        require(address(_pool).isContract(), "!isContract");
        require(!creditPools[_pool].isLiquidityPool, "!creditPools");
        creditPools[_pool].isLiquidityPool = true;
        emit LogLiquidityPool(msg.sender, _pool, creditPools[_pool].isLiquidityPool);
        return true;
    }

    /**
     * @dev Revokes multiple `_pool` from the {revokeCreditPools} mapping.
     *
     */
    function revokeCreditPools(address[] memory _pools) external onlyGovernance returns (bool) {
        for (uint8 _i = 0; _i < uint8(_pools.length); _i++) {
            address _pool = _pools[_i];
            revokeCreditPool(_pool);
        }
        return true;
    }

    /**
     * @dev Revokes `_pool` from the {creditPools} mapping.
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
    function revokeCreditPool(address _pool) public onlyGovernance {
        require(creditPools[_pool].isLiquidityPool, "!creditPools");
        emit LogLiquidityPool(msg.sender, _pool, creditPools[_pool].isLiquidityPool);
        creditPools[_pool].isLiquidityPool = false;
    }

    /**
     * @dev Returns the credit pool by `_pool`.
     */
    function getCreditPool(address _pool) public view returns (DataTypes.LiquidityPool memory _creditPool) {
        _creditPool = creditPools[_pool];
    }

    /**
     * @dev Provide [`_pool`,`_rate`] from the {creditPools} mapping.
     *
     */
    function rateCreditPools(DataTypes.PoolRate[] memory _poolRates) external onlyOperator returns (bool) {
        for (uint8 _i = 0; _i < _poolRates.length; _i++) {
            DataTypes.PoolRate memory poolRate = _poolRates[_i];
            rateCreditPool(poolRate.pool, poolRate.rate);
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
    function rateCreditPool(address _pool, uint8 _rate) public onlyOperator returns (bool) {
        require(creditPools[_pool].isLiquidityPool, "!liquidityPools");
        creditPools[_pool].rating = _rate;
        emit LogRateCreditPool(msg.sender, _pool, creditPools[_pool].rating);
        return true;
    }

    /**
     * @dev Maps liquidity `_pool` to the protocol adapter `_adapter` using {liquidityPoolToAdapter}.
     *
     */
    function setLiquidityPoolsToAdapters(DataTypes.PoolAdapter[] memory _poolAdapters)
        external
        onlyOperator
        returns (bool)
    {
        for (uint8 _i = 0; _i < _poolAdapters.length; _i++) {
            DataTypes.PoolAdapter memory _poolAdapter = _poolAdapters[_i];
            setLiquidityPoolToAdapter(_poolAdapter.pool, _poolAdapter.adapter);
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
    function setLiquidityPoolToAdapter(address _pool, address _adapter) public onlyOperator returns (bool) {
        require(_adapter.isContract(), "!_adapter.isContract()");
        require(liquidityPools[_pool].isLiquidityPool || creditPools[_pool].isLiquidityPool, "!liquidityPools");
        liquidityPoolToAdapter[_pool] = _adapter;
        emit LogLiquidityPoolToDepositToken(msg.sender, _pool, _adapter);
        return true;
    }

    /**
     * @dev assign strategy in form of `_strategySteps` to the `_tokensHash`.
     *
     * Returns a hash value of strategy indicating successful operation.
     *
     * Emits a {LogSetStrategy} event.
     *
     * Requirements:
     *
     * - `_tokensHash` should be approved.
     * - msg.sender should be operator.
     * - `creditPool` in {_strategySteps} should be approved.
     * - `liquidityPool` in {_strategySteps} should be approved
     * - `creditPool` and `borrowToken` in {_strategySteps}can be zero address simultaneously only
     * - `token`, `liquidityPool` and `strategyContract` cannot be zero address or EOA.
     */
    function setStrategy(bytes32 _tokensHash, DataTypes.StrategyStep[] memory _strategySteps)
        public
        onlyOperator
        returns (bytes32)
    {
        require(!_isNewTokensHash(_tokensHash), "_isNewTokensHash");
        return _setStrategy(_tokensHash, _strategySteps);
    }

    /**
     * @dev assign multiple strategies in form of `_strategySteps` to the `_tokensHash`.
     *
     * Emits a {LogSetStrategy} event per successful assignment of the strategy.
     *
     * Requirements:
     *
     * - `_tokensHash` should be approved.
     * - msg.sender should be operator.
     * - `creditPool` in {_strategySteps} should be approved.
     * - `liquidityPool` in {_strategySteps} should be approved
     * - `creditPool` and `borrowToken` in {_strategySteps}can be zero address simultaneously only
     * - `token`, `liquidityPool` and `strategyContract` cannot be zero address or EOA.
     */
    function setStrategy(bytes32 _tokensHash, DataTypes.StrategyStep[][] memory _strategySteps) public onlyOperator {
        require(!_isNewTokensHash(_tokensHash), "_isNewTokensHash");
        uint8 _len = uint8(_strategySteps.length);
        for (uint8 _i = 0; _i < _len; _i++) {
            _setStrategy(_tokensHash, _strategySteps[_i]);
        }
    }

    /**
     * @dev assign multiple strategies in form of `_strategySteps` to multiple tokens in form of `_tokensHash`.
     *
     * Emits a {LogSetStrategy} event per successful assignment of the strategy.
     *
     * Requirements:
     *
     * - `_tokensHash` should be approved.
     * - msg.sender should be operator.
     * - `creditPool` in {_strategySteps} shoould be approved.
     * - `liquidityPool` in {_strategySteps} should be approved
     * - `creditPool` and `borrowToken` in {_strategySteps}can be zero address simultaneously only
     * - `token`, `liquidityPool` and `strategyContract` cannot be zero address or EOA.
     */
    function setStrategy(bytes32[] memory _tokensHash, DataTypes.StrategyStep[][] memory _strategySteps)
        public
        onlyOperator
        returns (bytes32)
    {
        require(_tokensHash.length == _strategySteps.length, "!index mismatch");
        uint8 _len = uint8(_strategySteps.length);
        for (uint8 _i = 0; _i < _len; _i++) {
            setStrategy(_tokensHash[_i], _strategySteps[_i]);
        }
    }

    /**
     * @dev Returns the Strategy by `_hash`.
     */
    function getStrategy(bytes32 _hash)
        public
        view
        returns (uint256 _index, DataTypes.StrategyStep[] memory _strategySteps)
    {
        _index = strategies[_hash].index;
        _strategySteps = strategies[_hash].strategySteps;
    }

    /**
     * @dev Returns the list of strategy hashes by `_token`.
     */
    function getTokenToStrategies(bytes32 _tokensHash) public view returns (bytes32[] memory) {
        return tokenToStrategies[_tokensHash];
    }

    /**
     * @dev Returns the list of tokensHash
     */
    function getTokenHashes() public view returns (bytes32[] memory) {
        return tokensHashIndexes;
    }

    /**
     * @dev Sets multiple `_tokens` to keccak256 hash the {tokensHashToTokens} mapping.
     *
     */
    function setMultipleTokensHashToTokens(address[][] memory _setOfTokens) external onlyOperator {
        for (uint8 _i = 0; _i < uint8(_setOfTokens.length); _i++) {
            setTokensHashToTokens(_setOfTokens[_i]);
        }
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
    function setTokensHashToTokens(address[] memory _tokens) public onlyOperator {
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
        emit LogTokensToTokensHash(msg.sender, _tokensHash);
    }

    /**
     * @dev Returns list of token given the `_tokensHash`.
     */
    function getTokensHashToTokens(bytes32 _tokensHash) public view returns (address[] memory) {
        return tokensHashToTokens[_tokensHash].tokens;
    }

    /**
     * @dev Set RegistryProxy to act as Registry
     */
    function become(RegistryProxy _registryProxy) public {
        require(msg.sender == _registryProxy.governance(), "!governance");
        require(_registryProxy.acceptImplementation() == 0, "!unauthorized");
    }

    /**
     * @dev Check duplicate `_hash` Startegy from the {strategyHashIndexes} mapping.
     *
     * Returns a boolean value indicating whether duplicate `_hash` exists or not.
     *
     * Requirements:
     *
     * - {strategyHashIndexes} length should be more than zero.
     */
    function _isNewStrategy(bytes32 _hash) private view returns (bool) {
        if (strategyHashIndexes.length == 0) {
            return true;
        }
        return (strategyHashIndexes[strategies[_hash].index] != _hash);
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
    function _isNewTokensHash(bytes32 _hash) private view returns (bool) {
        if (tokensHashIndexes.length == 0) {
            return true;
        }
        return (tokensHashIndexes[tokensHashToTokens[_hash].index] != _hash);
    }

    /**
     * @dev assign strategy in form of `_strategySteps` to the `_tokensHash`.
     *
     * Returns a hash value of strategy indicating successful operation.
     *
     * Emits a {LogSetStrategy} event.
     *
     * Requirements:
     *
     * - `_tokensHash` should be approved.
     * - msg.sender can be governance or strategist.
     * - `creditPool` in {_strategySteps} shoould be approved.
     * - `liquidityPool` in {_strategySteps} should be approved
     * - `creditPool` and `borrowToken` in {_strategySteps}can be zero address simultaneously only
     * - `token`, `liquidityPool` and `strategyContract` cannot be zero address or EOA.
     */
    function _setStrategy(bytes32 _tokensHash, DataTypes.StrategyStep[] memory _strategySteps)
        private
        returns (bytes32)
    {
        for (uint8 _i = 0; _i < uint8(_strategySteps.length); _i++) {
            require(liquidityPoolToAdapter[_strategySteps[_i].pool] != address(0), "!adapter.");
        }
        bytes32[] memory hashes = new bytes32[](_strategySteps.length);
        for (uint8 _i = 0; _i < uint8(_strategySteps.length); _i++) {
            hashes[_i] = keccak256(
                abi.encodePacked(_strategySteps[_i].pool, _strategySteps[_i].outputToken, _strategySteps[_i].isBorrow)
            );
        }
        bytes32 hash = keccak256(abi.encodePacked(_tokensHash, hashes));
        require(_isNewStrategy(hash), "isNewStrategy");
        for (uint8 _i = 0; _i < uint8(_strategySteps.length); _i++) {
            if (_strategySteps[_i].isBorrow) {
                require(creditPools[_strategySteps[_i].pool].isLiquidityPool, "!isLiquidityPool");
                require(tokens[_strategySteps[_i].outputToken], "!borrowToken");
            } else {
                require(liquidityPools[_strategySteps[_i].pool].isLiquidityPool, "!isLiquidityPool");
            }
            strategies[hash].strategySteps.push(
                DataTypes.StrategyStep(
                    _strategySteps[_i].pool,
                    _strategySteps[_i].outputToken,
                    _strategySteps[_i].isBorrow
                )
            );
        }
        strategyHashIndexes.push(hash);
        strategies[hash].index = strategyHashIndexes.length - 1;
        tokenToStrategies[_tokensHash].push(hash);
        emit LogSetStrategy(msg.sender, _tokensHash, hash);
        return hash;
    }

    /**
     * @dev Sets `Vault`/`LM_vault` contract for the corresponding `_underlyingToken` and `_riskProfile`
     *
     * Returns a boolean value indicating whether the operation succeeded
     *
     * Emits a {LogUnderlyingTokenRPVault} event
     *
     * Requirements:
     *
     * - `_underlyingToken` cannot be the zero address or EOA
     * - `_vault` cannot be the zero address or EOA
     * - `msg.sender` (caller) should be operator
     *
     */
    function setUnderlyingTokenToRPToVaults(
        address _underlyingToken,
        string memory _riskProfile,
        address _vault
    ) public onlyOperator returns (bool) {
        return _setUnderlyingTokenToRPToVaults(_underlyingToken, _riskProfile, _vault);
    }

    /**
     * @dev Sets bunch of `Vaults`/`LM_vaults` contract for the corresponding `_underlyingTokens`
     *      and `_riskProfiles`in one transaction
     *
     * Returns a boolean value indicating whether the operation succeeded
     *
     * Emits a {LogUnderlyingTokenRPVault} event
     *
     * Requirements:
     *
     * - `_underlyingToken` cannot be the zero address or EOA
     * - `_vault` cannot be the zero address or EOA
     * - `msg.sender` (caller) should be operator
     *
     */
    function setUnderlyingTokenToRPToVaults(
        address[] memory _underlyingTokens,
        string[] memory _riskProfiles,
        address[][] memory _vaults
    ) public onlyOperator returns (bool) {
        require(uint8(_riskProfiles.length) == uint8(_vaults.length), "!Profileslength");
        for (uint8 _i = 0; _i < uint8(_vaults.length); _i++) {
            require(uint8(_vaults[_i].length) == uint8(_underlyingTokens.length), "!VaultsLength");
            for (uint8 _j = 0; _j < _vaults[_i].length; _j++) {
                _setUnderlyingTokenToRPToVaults(_underlyingTokens[_j], _riskProfiles[_i], _vaults[_i][_j]);
            }
        }
        return true;
    }

    function _setUnderlyingTokenToRPToVaults(
        address _underlyingToken,
        string memory _riskProfile,
        address _vault
    ) internal returns (bool) {
        require(_underlyingToken != address(0), "!address(0)");
        require(address(_underlyingToken).isContract(), "!isContract");
        require(bytes(_riskProfile).length > 0, "RP_empty.");
        require(_vault != address(0), "!address(0)");
        require(address(_vault).isContract(), "!isContract");
        underlyingTokenToRPToVaults[_underlyingToken][_riskProfile] = _vault;
        emit LogUnderlyingTokenRPVault(_underlyingToken, _riskProfile, _vault);
        return true;
    }

    /**
     * @dev Set Disconinue for the _vault contract
     *
     * Returns a boolean value indicating whether operation is succeeded
     *
     * Emits a {LogDiscontinuedPaused} event
     *
     * Requirements:
     *
     * - `_vault` cannot be a zero address
     * - `msg.sender` (caller) should be governance
     */
    function discontinue(address _vault) public onlyGovernance returns (bool) {
        require(_vault != address(0), "!address(0)");
        vaultToDiscontinued[_vault] = true;
        IVault(_vault).discontinue();
        emit LogDiscontinuedPaused(msg.sender, "Discontinue", vaultToDiscontinued[_vault]);
        return true;
    }

    /**
     * @dev Set Pause functionality for the _vault contract
     *
     * Returns a boolean value indicating whether pause is set to true or false
     *
     * Emits a {LogDiscontinuedPaused} event
     *
     * Requirements:
     *
     * - `_vault` cannot be a zero address
     * - `msg.sender` (caller) should be governance
     */
    function setPause(address _vault, bool _paused) public onlyGovernance returns (bool) {
        require(_vault != address(0), "!address(0)");
        vaultToPaused[_vault] = _paused;
        IVault(_vault).setPaused(vaultToPaused[_vault]);
        emit LogDiscontinuedPaused(_vault, "Pause", vaultToPaused[_vault]);
        return _paused;
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
    ) public onlyOperator returns (string memory) {
        return _addRiskProfile(_riskProfile, _noOfSteps, _poolRatingRange);
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
    function addRiskProfiles(
        string[] memory _riskProfiles,
        uint8[] memory _noOfSteps,
        DataTypes.PoolRatingsRange[] memory _poolRatingRanges
    ) public onlyOperator returns (bool) {
        require(_riskProfiles.length > 0, "!length>0");
        require(_riskProfiles.length == _noOfSteps.length, "!Stepslength");
        require(_riskProfiles.length == _poolRatingRanges.length, "!PoolRatingsLength");

        for (uint8 _i = 0; _i < _riskProfiles.length; _i++) {
            _addRiskProfile(_riskProfiles[_i], _noOfSteps[_i], _poolRatingRanges[_i]);
        }
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
    ) internal returns (string memory) {
        require(bytes(_riskProfile).length > 0, "RP_Empty!");
        require(!riskProfiles[_riskProfile].exists, "RP_already_exists");

        riskProfilesArray.push(_riskProfile);
        riskProfiles[_riskProfile].steps = _noOfSteps;
        riskProfiles[_riskProfile].poolRatingsRange.push(
            DataTypes.PoolRatingsRange({
                lowerLimit: _poolRatingRange.lowerLimit,
                upperLimit: _poolRatingRange.upperLimit
            })
        );
        riskProfiles[_riskProfile].index = riskProfilesArray.length - 1;
        riskProfiles[_riskProfile].exists = true;

        emit RiskProfileAdded(
            riskProfiles[_riskProfile].index,
            keccak256(abi.encodePacked(_riskProfile)),
            riskProfiles[_riskProfile].exists
        );
        return _riskProfile;
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
    function updateRiskProfileSteps(string memory _riskProfile, uint8 _noOfSteps) public onlyOperator returns (bool) {
        require(riskProfiles[_riskProfile].exists, "!Rp_Exists");
        riskProfiles[_riskProfile].steps = _noOfSteps;
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
        public
        onlyOperator
        returns (bool)
    {
        require(riskProfiles[_riskProfile].exists, "!Rp_Exists");
        riskProfiles[_riskProfile].poolRatingsRange[0] = _poolRatingRange;
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
    function removeRiskProfile(uint256 _index) public onlyOperator returns (bool) {
        require(_index <= riskProfilesArray.length, "Invalid_Rp_index");
        string memory _riskProfile = riskProfilesArray[_index];
        require(riskProfiles[_riskProfile].exists, "!Rp_Exists");
        riskProfiles[_riskProfile].exists = false;
        delete riskProfilesArray[_index];
        return true;
    }

    /**
     * @dev Get the risk profile details
     *
     */
    function getRiskProfile(string memory _riskProfile)
        public
        view
        returns (
            uint256 _index,
            uint8 _noOfSteps,
            DataTypes.PoolRatingsRange memory _poolRatingsRange,
            bool _exists
        )
    {
        _index = riskProfiles[_riskProfile].index;
        _noOfSteps = riskProfiles[_riskProfile].steps;
        _poolRatingsRange = riskProfiles[_riskProfile].poolRatingsRange[0];
        _exists = riskProfiles[_riskProfile].exists;
    }

    /**
     * @dev Get the list of all the riskProfiles
     */
    function getRiskProfiles() public view returns (string[] memory) {
        return riskProfilesArray;
    }

    /**
     * @dev Transfers treasury to a new account (`_strategist`).
     * Can only be called by the current operator.
     */

    function setTreasury(address _treasury) public onlyOperator {
        require(_treasury != address(0), "!address(0)");
        treasury = _treasury;
    }

    /**
     * @dev Emitted when `token` is approved or revoked.
     *
     * Note that `token` cannot be zero address or EOA.
     */
    event LogToken(address indexed caller, address indexed token, bool indexed enabled);

    /**
     * @dev Emitted when `pool` is approved or revoked.
     *
     * Note that `pool` cannot be zero address or EOA.
     */
    event LogLiquidityPool(address indexed caller, address indexed pool, bool indexed enabled);

    /**
     * @dev Emitted when `pool` is rated.
     *
     * Note that `pool` cannot be zero address or EOA.
     */
    event LogRateLiquidityPool(address indexed caller, address indexed pool, uint8 indexed rate);

    /**
     * @dev Emitted when `pool` is rated.
     *
     * Note that `pool` cannot be zero address or EOA.
     */
    event LogRateCreditPool(address indexed caller, address indexed pool, uint8 indexed rate);

    /**
     * @dev Emitted when `hash` strategy is set.
     *
     * Note that `token` cannot be zero address or EOA.
     */
    event LogSetStrategy(address indexed caller, bytes32 indexed tokensHash, bytes32 indexed hash);

    /**
     * @dev Emitted when `hash` strategy is approved or revoked.
     *
     * Note that `hash` startegy should exist in {strategyHashIndexes}.
     */
    event LogStrategy(address indexed caller, bytes32 indexed hash, bool indexed enabled);

    /**
     * @dev Emitted when `hash` strategy is scored.
     *
     * Note that `hash` startegy should exist in {strategyHashIndexes}.
     */
    event LogScoreStrategy(address indexed caller, bytes32 indexed hash, uint8 indexed score);

    /**
     * @dev Emitted when liquidity pool `pool` is assigned to `adapter`.
     *
     * Note that `pool` should be approved in {liquidityPools}.
     */
    event LogLiquidityPoolToDepositToken(address indexed caller, address indexed pool, address indexed adapter);

    /**
     * @dev Emitted when tokens are assigned to `_tokensHash`.
     *
     * Note that tokens should be approved
     */
    event LogTokensToTokensHash(address indexed caller, bytes32 indexed _tokensHash);

    /**
     * @dev Emiited when `Discontinue` or `setPause` functions are called
     *
     * Note that `vault` can not be a zero address
     */
    event LogDiscontinuedPaused(address indexed vault, bytes32 indexed action, bool indexed actionStatus);

    /**
     * @dev Emitted when `setUnderlyingTokenToRPToVaults` function is called.
     *
     * Note that `underlyingToken` cannot be zero address or EOA.
     */
    event LogUnderlyingTokenRPVault(address indexed underlyingToken, string indexed riskProfile, address indexed vault);

    /**
     * @dev Emitted when RiskProfile is added
     *
     * Note that `riskProfile` can not be empty
     */
    event RiskProfileAdded(uint256 indexed index, bytes32 indexed riskProfile, bool indexed exists);
}
