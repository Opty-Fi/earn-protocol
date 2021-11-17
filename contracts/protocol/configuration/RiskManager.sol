// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

//  libraries
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { DataTypes } from "../../libraries/types/DataTypes.sol";

//  helper contracts
import { Modifiers } from "./Modifiers.sol";
import { RiskManagerStorage } from "./RiskManagerStorage.sol";
import { RiskManagerProxy } from "./RiskManagerProxy.sol";

//  interfaces
import { IInvestStrategyRegistry } from "../../interfaces/opty/IInvestStrategyRegistry.sol";
import { IStrategyProvider } from "../../interfaces/opty/IStrategyProvider.sol";
import { IAPROracle } from "../../interfaces/opty/IAPROracle.sol";
import { IRiskManager } from "../../interfaces/opty/IRiskManager.sol";
import { Constants } from "../../utils/Constants.sol";

/**
 * @title RiskManager Contract
 * @author Opty.fi
 * @dev Contract contains functionality for getting the best invest and vaultRewardToken strategy
 */
contract RiskManager is IRiskManager, RiskManagerStorage, Modifiers {
    using Address for address;

    /* solhint-disable no-empty-blocks */
    constructor(address _registry) public Modifiers(_registry) {}

    /**
     * @dev Set RiskManagerProxy to act as RiskManager
     * @param _riskManagerProxy RiskManagerProxy contract address to act as RiskManager
     */
    function become(RiskManagerProxy _riskManagerProxy) external onlyGovernance {
        require(_riskManagerProxy.acceptImplementation() == 0, "!unauthorized");
    }

    /**
     * @inheritdoc IRiskManager
     */
    function getBestStrategy(uint256 _riskProfileCode, address[] memory _underlyingTokens)
        public
        view
        override
        returns (bytes32)
    {
        for (uint256 i = 0; i < _underlyingTokens.length; i++) {
            require(_underlyingTokens[i] != address(0), "uT=address(0)");
            require(_underlyingTokens[i].isContract(), "uT!=isContract()");
        }
        bytes32 tokensHash = keccak256(abi.encodePacked(_underlyingTokens));
        DataTypes.StrategyConfiguration memory _strategyConfiguration = registryContract.getStrategyConfiguration();
        bytes32 _strategyHash = _getBestStrategy(_riskProfileCode, tokensHash, _strategyConfiguration);
        return _strategyHash;
    }

    /**
     * @inheritdoc IRiskManager
     */
    function getVaultRewardTokenStrategy(address[] memory _underlyingTokens)
        public
        view
        override
        returns (DataTypes.VaultRewardStrategy memory)
    {
        require(_underlyingTokens.length > 0, "Tokens_Empty!");

        for (uint256 i = 0; i < _underlyingTokens.length; i++) {
            require(_underlyingTokens[i] != address(0), "uT=address(0)");
            require(_underlyingTokens[i].isContract(), "uT!=isContract()");
        }
        bytes32 _vaultRewardTokenHash = keccak256(abi.encodePacked(_underlyingTokens));
        return
            IStrategyProvider(registryContract.getStrategyProvider()).getVaultRewardTokenHashToVaultRewardTokenStrategy(
                _vaultRewardTokenHash
            );
    }

    function _getBestStrategy(
        uint256 _riskProfileCode,
        bytes32 _tokensHash,
        DataTypes.StrategyConfiguration memory _strategyConfiguration
    ) internal view returns (bytes32) {
        DataTypes.RiskProfile memory _riskProfileStruct = registryContract.getRiskProfile(_riskProfileCode);
        require(_riskProfileStruct.exists, "!Rp_Exists");

        // getbeststrategy from strategyProvider
        bytes32 _strategyHash =
            IStrategyProvider(_strategyConfiguration.strategyProvider).rpToTokenToBestStrategy(
                _riskProfileCode,
                _tokensHash
            );

        if (
            _strategyHash == Constants.ZERO_BYTES32 ||
            _isInValidStrategy(_strategyHash, _strategyConfiguration.investStrategyRegistry, _riskProfileStruct)
        ) {
            _strategyHash = IStrategyProvider(_strategyConfiguration.strategyProvider).rpToTokenToDefaultStrategy(
                _riskProfileCode,
                _tokensHash
            );
        } else {
            return _strategyHash;
        }

        if (
            _strategyHash == Constants.ZERO_BYTES32 ||
            _isInValidStrategy(_strategyHash, _strategyConfiguration.investStrategyRegistry, _riskProfileStruct)
        ) {
            if (
                IStrategyProvider(_strategyConfiguration.strategyProvider).getDefaultStrategyState() ==
                DataTypes.DefaultStrategyState.CompoundOrAave
            ) {
                _strategyHash = IAPROracle(registryContract.getAprOracle()).getBestAPR(_tokensHash);
                (, DataTypes.StrategyStep[] memory _strategySteps_) =
                    IInvestStrategyRegistry(_strategyConfiguration.investStrategyRegistry).getStrategy(_strategyHash);
                return _strategySteps_.length > 0 ? _strategyHash : Constants.ZERO_BYTES32;
            } else {
                return Constants.ZERO_BYTES32;
            }
        }
        return _strategyHash;
    }

    function _isInValidStrategy(
        bytes32 _strategyHash,
        address _strategyRegistry,
        DataTypes.RiskProfile memory _riskProfileStruct
    ) internal view returns (bool) {
        (, DataTypes.StrategyStep[] memory _strategySteps) =
            IInvestStrategyRegistry(_strategyRegistry).getStrategy(_strategyHash);

        for (uint256 _i = 0; _i < _strategySteps.length; _i++) {
            DataTypes.LiquidityPool memory _liquidityPool = registryContract.getLiquidityPool(_strategySteps[_i].pool);
            bool _isStrategyInvalid =
                !_liquidityPool.isLiquidityPool ||
                    !(_liquidityPool.rating >= _riskProfileStruct.poolRatingsRange.lowerLimit &&
                        _liquidityPool.rating <= _riskProfileStruct.poolRatingsRange.upperLimit);

            _isStrategyInvalid = !_riskProfileStruct.canBorrow && !_isStrategyInvalid
                ? _strategySteps[_i].isBorrow
                : _isStrategyInvalid;

            if (_isStrategyInvalid) {
                return _isStrategyInvalid;
            }
        }

        return false;
    }
}
