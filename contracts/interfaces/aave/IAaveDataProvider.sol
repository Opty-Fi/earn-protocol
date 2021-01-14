// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

interface IAaveDataProvider {
    function calculateUserGlobalData(address _user)
        external
        view
        returns (
            uint256 totalLiquidityBalanceETH,
            uint256 totalCollateralBalanceETH,
            uint256 totalBorrowBalanceETH,
            uint256 totalFeesETH,
            uint256 currentLtv,
            uint256 currentLiquidationThreshold,
            uint256 healthFactor,
            bool healthFactorBelowThreshold
        );
}
