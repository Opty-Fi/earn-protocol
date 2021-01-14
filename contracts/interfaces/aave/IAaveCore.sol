// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

interface IAaveCore {
    function getReserves() external view returns (address[] memory);

    function getUserBasicReserveData(address _reserve, address _user)
        external
        view
        returns (
            uint256,
            uint256,
            uint256,
            bool
        );

    function getReserveConfiguration(address _reserve)
        external
        view
        returns (
            uint256,
            uint256,
            uint256,
            bool
        );

    function isUserUseReserveAsCollateralEnabled(address _reserve, address _user) external view returns (bool);
}
