// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

struct UserReserveData {
        uint currentATokenBalance;
        uint currentBorrowBalance;
        uint principalBorrowBalance;
        uint borrowRateMode;
        uint borrowRate;
        uint liquidityRate;
        uint originationFee;
        uint variableBorrowIndex;
        uint lastUpdateTimestamp;
        bool enabled;
}

struct UserAccountData {
    uint totalLiquidityETH;
    uint totalCollateralETH;
    uint totalBorrowsETH;
    uint totalFeesETH;
    uint availableBorrowsETH;
    uint currentLiquidationThreshold;
    uint ltv;
    uint healthFactor;
}

struct ReserveData {
    uint256 totalLiquidity;
    uint256 availableLiquidity;
    uint256 totalBorrowsStable;
    uint256 totalBorrowsVariable;
    uint256 liquidityRate;
    uint256 variableBorrowRate;
    uint256 stableBorrowRate;
    uint256 averageStableBorrowRate;
    uint256 utilizationRate;
    uint256 liquidityIndex;
    uint256 variableBorrowIndex;
    address aTokenAddress;
    uint40 lastUpdateTimestamp;
}

struct ReserveConfigurationData {
    uint256 ltv;
    uint256 liquidationThreshold;
    uint256 liquidationBonus;
    address rateStrategyAddress;
    bool usageAsCollateralEnabled;
    bool borrowingEnabled;
    bool stableBorrowRateEnabled;
    bool isActive;
}

interface IAave {
    function deposit(address _reserve, uint256 _amount, uint16 _referralCode) external;
    function setUserUseReserveAsCollateral(address _reserve, bool _useAsCollateral) external;
    function borrow(address _reserve, uint256 _amount, uint256 _interestRateMode, uint16 _referralCode) external;
    function repay( address _reserve, uint256 _amount, address payable _onBehalfOf) external;
    function getReserveConfigurationData(address _reserve) external view returns(ReserveConfigurationData memory);
    function getUserAccountData(address _user) external view returns(UserAccountData memory);
    function getUserReserveData(address _reserve, address _user) external view returns(UserReserveData memory);
    function getReserveData(address _reserve) external view returns(ReserveData memory);
}
