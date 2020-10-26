// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

interface IAave {

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
    
    function deposit(address _reserve, uint256 _amount, uint16 _referralCode) external;
    function setUserUseReserveAsCollateral(address _reserve, bool _useAsCollateral) external;
    function borrow(address _reserve, uint256 _amount, uint256 _interestRateMode, uint16 _referralCode) external;
    function repay( address _reserve, uint256 _amount, address payable _onBehalfOf) external;
    function getReserveConfigurationData(address _reserve) external view returns(uint256,uint256,uint256,address,bool,bool,bool,bool);
    function getReserveData(address _reserve) external view 
    returns(uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,address,uint40);
    function getUserAccountData(address _user) external view returns(UserAccountData memory);
    function getUserReserveData(address _reserve, address _user) external view
    returns(UserReserveData memory);
}