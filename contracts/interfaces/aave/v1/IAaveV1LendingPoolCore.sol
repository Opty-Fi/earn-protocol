// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

interface IAaveV1LendingPoolCore {
    function getReserveCurrentLiquidityRate(address _reserve) external view returns (uint256 liquidityRate);

    function getReserveATokenAddress(address _reserve) external view returns (address);
}
