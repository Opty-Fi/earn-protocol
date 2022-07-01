// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

// interfaces
import { IAdapterFull } from "@optyfi/defi-legos/interfaces/defiAdapters/contracts/IAdapterFull.sol";
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
    ) public view returns (bytes[] memory _codes) {
        IAdapterFull _adapter = IAdapterFull(IRegistry(_registryContract).getLiquidityPoolToAdapter(_liquidityPool));
        _codes = _adapter.getHarvestSomeCodes(_vault, _underlyingToken, _liquidityPool, _rewardTokenAmount);
    }

    function getStrategyHarvestAllCodes(
        address _liquidityPool,
        address _registryContract,
        address payable _vault,
        address _underlyingToken
    ) public view returns (bytes[] memory _codes) {
        IAdapterFull _adapter = IAdapterFull(IRegistry(_registryContract).getLiquidityPoolToAdapter(_liquidityPool));
        _codes = _adapter.getHarvestAllCodes(_vault, _underlyingToken, _liquidityPool);
    }

    function getClaimRewardTokenCode(
        address _liquidityPool,
        address _registryContract,
        address payable _vault
    ) public view returns (bytes[] memory _codes) {
        IAdapterFull _adapter = IAdapterFull(IRegistry(_registryContract).getLiquidityPoolToAdapter(_liquidityPool));
        _codes = _adapter.getClaimRewardTokenCode(_vault, _liquidityPool);
    }

    function getUnclaimedRewardTokenAmount(
        address _liquidityPool,
        address _registryContract,
        address payable _vault,
        address _underlyingToken
    ) public view returns (uint256) {
        IAdapterFull _adapter = IAdapterFull(IRegistry(_registryContract).getLiquidityPoolToAdapter(_liquidityPool));
        return
            _adapter.getRewardToken(_liquidityPool) == address(0)
                ? uint256(0)
                : _adapter.getUnclaimedRewardTokenAmount(_vault, _liquidityPool, _underlyingToken);
    }
}
