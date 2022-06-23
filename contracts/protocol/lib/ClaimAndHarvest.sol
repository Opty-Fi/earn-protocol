// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

//  libraries
import { DataTypes } from "../earn-protocol-configuration/contracts/libraries/types/DataTypes.sol";

// interfaces
import { IAdapterHarvestReward } from "@optyfi/defi-legos/interfaces/defiAdapters/contracts/IAdapterHarvestReward.sol";
import { IRegistry } from "../earn-protocol-configuration/contracts/interfaces/opty/IRegistry.sol";

/**
 * @title ClaimAndHarvest Library
 * @author Opty.fi
 * @notice Claim and Harvest functionalities of earn protocol
 * @dev Contains the functionality for getting the codes to claim/harvest reward tokens,
 * from the adapters and pass it onto vault contract
 */
library ClaimAndHarvest {
    function getStrategyHarvestSomeCodes(
        address _liquidityPool,
        address _registryContract,
        address payable _vault,
        address _underlyingToken,
        uint256 _rewardTokenAmount
    ) internal view returns (bytes[] memory _codes) {
        IAdapterHarvestReward _adapter =
            IAdapterHarvestReward(IRegistry(_registryContract).getLiquidityPoolToAdapter(_liquidityPool));
        _codes = _adapter.getHarvestSomeCodes(_vault, _underlyingToken, _liquidityPool, _rewardTokenAmount);
    }

    function getStrategyHarvestAllCodes(
        address _liquidityPool,
        address _registryContract,
        address payable _vault,
        address _underlyingToken
    ) internal view returns (bytes[] memory _codes) {
        IAdapterHarvestReward _adapter =
            IAdapterHarvestReward(IRegistry(_registryContract).getLiquidityPoolToAdapter(_liquidityPool));
        _codes = _adapter.getHarvestAllCodes(_vault, _underlyingToken, _liquidityPool);
    }

    function getClaimRewardTokenCode(
        address _liquidityPool,
        address _registryContract,
        address payable _vault
    ) internal view returns (bytes[] memory _codes) {
        IAdapterHarvestReward _adapter =
            IAdapterHarvestReward(IRegistry(_registryContract).getLiquidityPoolToAdapter(_liquidityPool));
        _codes = _adapter.getClaimRewardTokenCode(_vault, _liquidityPool);
    }
}
