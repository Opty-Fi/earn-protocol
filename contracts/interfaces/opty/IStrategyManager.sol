// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { DataTypes } from "../../libraries/types/DataTypes.sol";

/**
 * @dev Interface for StrategyManager -
 *      Central processing unit of the earn protocol
 */

interface IStrategyManager {
    function getWithdrawAllStepsCount(bytes32 _hash) external view returns (uint8);

    function getDepositAllStepCount(bytes32 _hash) external view returns (uint8);

    function getClaimRewardStepsCount(bytes32 _hash) external view returns (uint8);

    function getHarvestRewardStepsCount(bytes32 _hash) external view returns (uint8);

    function getBalanceInUnderlyingToken(
        address payable _optyVault,
        address _underlyingToken,
        bytes32 _hash
    ) external view returns (uint256 _balance);

    function getPoolDepositAllCodes(
        address payable _optyVault,
        address _underlyingToken,
        bytes32 _hash,
        uint8 _stepIndex,
        uint8 _stepCount
    ) external view returns (bytes[] memory _codes);

    function getPoolWithdrawAllCodes(
        address payable _optyVault,
        address _underlyingToken,
        bytes32 _hash,
        uint8 _stepIndex,
        uint8 _stepCount
    ) external view returns (bytes[] memory _codes);

    function getPoolClaimAllRewardCodes(
        address payable _optyVault,
        bytes32 _hash,
        uint8 _stepIndex,
        uint8 _stepCount
    ) external view returns (bytes[] memory _codes);

    function getPoolHarvestAllRewardCodes(
        address payable _optyVault,
        address _underlyingToken,
        bytes32 _investStrategyHash,
        uint8 _stepIndex,
        uint8 _stepCount
    ) external view returns (bytes[] memory _codes);

    function getPoolHarvestSomeRewardCodes(
        address payable _optyVault,
        address _underlyingToken,
        bytes32 _investStrategyHash,
        uint256 _convertRewardTokensPercent,
        uint8 _stepIndex,
        uint8 _stepCount
    ) external view returns (bytes[] memory _codes);

    function getFeeTransferAllCodes(
        DataTypes.TreasuryShare[] memory _treasuryShares,
        address _account,
        address _underlyingToken,
        uint256 _redeemAmountInToken,
        uint256 _withdrawalFee
    ) external pure returns (bytes[] memory _treasuryCodes, bytes memory _accountCode);

    function getLpAdapterRewardToken(bytes32 _investStrategyHash)
        external
        view
        returns (
            address _liquidityPool,
            address _optyAdapter,
            address _rewardToken
        );
}
