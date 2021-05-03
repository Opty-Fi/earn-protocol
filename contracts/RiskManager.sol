// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { Registry } from "./controller/Registry.sol";
import { RegistryStorage } from "./controller/RegistryStorage.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { Modifiers } from "./controller/Modifiers.sol";
import { StrategyProvider } from "./controller/StrategyProvider.sol";
import { RiskManagerStorage } from "./RiskManagerStorage.sol";
import { RiskManagerProxy } from "./RiskManagerProxy.sol";
import { DataTypes } from "./libraries/types/DataTypes.sol";

/**
 * @dev An extra protection for the best strategy of the opty-fi vault's
 *      underlying token
 */

contract RiskManager is RiskManagerStorage, Modifiers {
    using Address for address;

    /* solhint-disable no-empty-blocks */
    constructor(address _registry) public Modifiers(_registry) {}

    /**
     * @dev initialize the strategyProvider
     */
    function initialize(StrategyProvider _strategyProvider) public onlyGovernance {
        setStrategyProvider(_strategyProvider);
    }

    /**
     * @dev Set RiskManagerProxy to act as RiskManager
     */
    function become(RiskManagerProxy _riskManagerProxy) public onlyGovernance {
        require(_riskManagerProxy.acceptImplementation() == 0, "!unauthorized");
    }

    /**
     * @dev Sets the strategyProvider
     */
    function setStrategyProvider(StrategyProvider _strategyProvider) public onlyOperator {
        strategyProvider = _strategyProvider;
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
    function getBestStrategy(string memory _profile, address[] memory _underlyingTokens) public view returns (bytes32) {
        require(bytes(_profile).length > 0, "RP_Empty!");

        for (uint8 i = 0; i < _underlyingTokens.length; i++) {
            require(_underlyingTokens[i] != address(0), "!_underlyingTokens");
            require(_underlyingTokens[i].isContract(), "!_underlyingTokens");
        }
        bytes32 tokensHash = keccak256(abi.encodePacked(_underlyingTokens));

        bytes32 _strategyHash = _getBestStrategy(_profile, tokensHash);
        return _strategyHash;
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
    function _getBestStrategy(string memory _riskProfile, bytes32 _tokensHash) internal view returns (bytes32) {
        (, uint8 _permittedSteps, bool _profileExists) = registryContract.riskProfiles(_riskProfile);
        require(_profileExists, "!Rp_Exists");

        // getbeststrategy from strategyProvider
        bytes32 _strategyHash = strategyProvider.rpToTokenToBestStrategy(_riskProfile, _tokensHash);

        // fallback to default strategy if best strategy is not available
        if (_strategyHash == ZERO_BYTES32) {
            _strategyHash = strategyProvider.rpToTokenToDefaultStrategy(_riskProfile, _tokensHash);
            if (_strategyHash == ZERO_BYTES32) {
                return ZERO_BYTES32;
            }
        }
        require(_strategyHash != ZERO_BYTES32, "!bestStrategyHash");

        (, , DataTypes.PoolRatingsRange memory _permittedPoolRatings, ) = registryContract.getRiskProfile(_riskProfile);
        (, DataTypes.StrategyStep[] memory _strategySteps) = registryContract.getStrategy(_strategyHash);

        // validate strategy profile
        if (
            _strategySteps.length != _permittedSteps ||
            !(registryContract.getLiquidityPool(_strategySteps[0].pool).rating >= _permittedPoolRatings.lowerLimit &&
                registryContract.getLiquidityPool(_strategySteps[0].pool).rating <= _permittedPoolRatings.upperLimit)
        ) {
            return strategyProvider.rpToTokenToDefaultStrategy(_riskProfile, _tokensHash);
        }

        return _strategyHash;
    }
}
