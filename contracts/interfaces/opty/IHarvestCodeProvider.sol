// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

/**
 * @dev Interface of the harvest code provider.
 */
interface IHarvestCodeProvider {
    function getHarvestCodes(
        address payable _optyPool,
        address _rewardToken,
        address _underlyingToken,
        uint256 _rewardTokenAmount
    ) external view returns (bytes[] memory _codes);

    function getOptimalTokenAmount(
        address _borrowToken,
        address _underlyingToken,
        uint256 _borrowTokenAmount
    ) external view returns (uint256);

    function rewardBalanceInUnderlyingTokens(
        address _rewardToken,
        address _underlyingToken,
        uint256 _amount
    ) external view returns (uint256);
}
