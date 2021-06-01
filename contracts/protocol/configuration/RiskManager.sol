// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { Modifiers } from "./Modifiers.sol";
import { RiskManagerStorage } from "./RiskManagerStorage.sol";
import { RiskManagerProxy } from "./RiskManagerProxy.sol";
import { DataTypes } from "../../libraries/types/DataTypes.sol";
import {
    IVaultStepInvestStrategyDefinitionRegistry
} from "../../interfaces/opty/IVaultStepInvestStrategyDefinitionRegistry.sol";
import { IStrategyProvider } from "../../interfaces/opty/IStrategyProvider.sol";
import { IAPROracle } from "../../interfaces/opty/IAPROracle.sol";
import { IRiskManager } from "../../interfaces/opty/IRiskManager.sol";

/**
 * @dev An extra protection for the best strategy of the opty-fi vault's
 *      underlying token
 */

contract RiskManager is IRiskManager, RiskManagerStorage, Modifiers {
    using Address for address;

    /* solhint-disable no-empty-blocks */
    constructor(address _registry) public Modifiers(_registry) {}

    /* solhint-disable no-empty-blocks */

    /**
     * @dev Set RiskManagerProxy to act as RiskManager
     */
    function become(RiskManagerProxy _riskManagerProxy) external onlyGovernance {
        require(_riskManagerProxy.acceptImplementation() == 0, "!unauthorized");
    }

    /**
     * @dev Get the best strategy for respective RiskProfiles
     *
     * Returns the hash of the best strategy corresponding to the riskProfile provided
     *
     * Requirements:
     *
     * - `_profile` can be among these values ["RP1"/"RP2"/"RP3"] or as decided by governance
     *      - Can not be empty
     * - `_underlyingTokens` is an array of underlying tokens like dai, usdc and so forth
     *      - Can not have length 0
     *
     */
    function getBestStrategy(string memory _profile, address[] memory _underlyingTokens)
        external
        view
        override
        returns (bytes32)
    {
        require(bytes(_profile).length > 0, "RP_Empty!");

        for (uint8 i = 0; i < _underlyingTokens.length; i++) {
            require(_underlyingTokens[i] != address(0), "!_underlyingTokens");
            require(_underlyingTokens[i].isContract(), "!_underlyingTokens");
        }
        bytes32 tokensHash = keccak256(abi.encodePacked(_underlyingTokens));
        DataTypes.StrategyConfiguration memory _strategyConfiguration = registryContract.getStrategyConfiguration();
        bytes32 _strategyHash = _getBestStrategy(_profile, tokensHash, _strategyConfiguration);
        return _strategyHash;
    }

    /**
     * @dev Get the VaultRewardToken strategy for respective VaultRewardToken hash
     *
     * Returns the hash of the VaultRewardToken strategy corresponding to the `_vaultRewardTokenHash` provided
     *
     * Requirements:
     *
     * - `_vaultRewardTokenHash` is the hash of Vault and RewardToken addresses
     *      - Can not be empty
     */
    function getVaultRewardTokenStrategy(bytes32 _vaultRewardTokenHash)
        external
        view
        override
        returns (DataTypes.VaultRewardStrategy memory _vaultRewardStrategy)
    {
        require(_vaultRewardTokenHash != ZERO_BYTES32, "vRtHash!=0x0");
        _vaultRewardStrategy = IStrategyProvider(registryContract.getStrategyProvider())
            .getVaultRewardTokenHashToVaultRewardTokenStrategy(_vaultRewardTokenHash);
    }

    /**
     * @dev Get the best strategy corresponding to _riskProfile and _tokenHash
     *
     * Returns the hash of the best strategy corresponding to _riskProfile provided
     *
     * Requirements:
     *
     * - `_profile` should exists in Registry contract
     *
     */
    function _getBestStrategy(
        string memory _riskProfile,
        bytes32 _tokensHash,
        DataTypes.StrategyConfiguration memory _strategyConfiguration
    ) internal view returns (bytes32) {
        DataTypes.RiskProfile memory _riskProfileStruct = registryContract.getRiskProfile(_riskProfile);
        require(_riskProfileStruct.exists, "!Rp_Exists");

        // getbeststrategy from strategyProvider
        bytes32 _strategyHash =
            IStrategyProvider(_strategyConfiguration.strategyProvider).rpToTokenToBestStrategy(
                _riskProfile,
                _tokensHash
            );

        // fallback to default strategy if best strategy is not available
        if (_strategyHash == ZERO_BYTES32) {
            _strategyHash = IStrategyProvider(_strategyConfiguration.strategyProvider).rpToTokenToDefaultStrategy(
                _riskProfile,
                _tokensHash
            );
            if (
                _strategyHash == ZERO_BYTES32 &&
                IStrategyProvider(_strategyConfiguration.strategyProvider).getDefaultStrategyState() ==
                DataTypes.DefaultStrategyState.Zero
            ) {
                return ZERO_BYTES32;
            } else if (
                _strategyHash == ZERO_BYTES32 &&
                IStrategyProvider(_strategyConfiguration.strategyProvider).getDefaultStrategyState() ==
                DataTypes.DefaultStrategyState.CompoundOrAave
            ) {
                _strategyHash = IAPROracle(_strategyConfiguration.aprOracle).getBestAPR(_tokensHash);
                (uint256 _strategyIndex, ) =
                    IVaultStepInvestStrategyDefinitionRegistry(
                        _strategyConfiguration
                            .vaultStepInvestStrategyDefinitionRegistry
                    )
                        .getStrategy(_strategyHash);
                if (_strategyIndex == uint256(0)) {
                    return ZERO_BYTES32;
                } else {
                    return _strategyHash;
                }
            }
        }
        require(_strategyHash != ZERO_BYTES32, "!bestStrategyHash");

        (, DataTypes.StrategyStep[] memory _strategySteps) =
            IVaultStepInvestStrategyDefinitionRegistry(_strategyConfiguration.vaultStepInvestStrategyDefinitionRegistry)
                .getStrategy(_strategyHash);

        DataTypes.LiquidityPool memory _liquidityPool = registryContract.getLiquidityPool(_strategySteps[0].pool);
        // validate strategy profile
        if (
            uint8(_strategySteps.length) > _riskProfileStruct.steps ||
            !_liquidityPool.isLiquidityPool ||
            !(_liquidityPool.rating >= _riskProfileStruct.lowerLimit &&
                _liquidityPool.rating <= _riskProfileStruct.upperLimit)
        ) {
            if (
                IStrategyProvider(_strategyConfiguration.strategyProvider).rpToTokenToDefaultStrategy(
                    _riskProfile,
                    _tokensHash
                ) != ZERO_BYTES32
            ) {
                return
                    IStrategyProvider(_strategyConfiguration.strategyProvider).rpToTokenToDefaultStrategy(
                        _riskProfile,
                        _tokensHash
                    );
            } else {
                if (
                    IStrategyProvider(_strategyConfiguration.strategyProvider).getDefaultStrategyState() ==
                    DataTypes.DefaultStrategyState.CompoundOrAave
                ) {
                    _strategyHash = IAPROracle(registryContract.getAprOracle()).getBestAPR(_tokensHash);
                    (uint256 _strategyIndex, ) =
                        IVaultStepInvestStrategyDefinitionRegistry(
                            _strategyConfiguration
                                .vaultStepInvestStrategyDefinitionRegistry
                        )
                            .getStrategy(_strategyHash);
                    if (_strategyIndex != uint256(0)) {
                        return _strategyHash;
                    } else {
                        return ZERO_BYTES32;
                    }
                } else {
                    return ZERO_BYTES32;
                }
            }
        }

        return _strategyHash;
    }
}
