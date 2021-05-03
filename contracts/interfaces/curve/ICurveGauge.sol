// solhint-disable func-name-mixedcase
// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface ICurveGauge {
    function deposit(uint256 _value) external;

    function withdraw(uint256 _value) external;

    function minter() external view returns (address);

    function balanceOf(address _holder) external view returns (uint256);

    function claimable_tokens(address _holder) external view returns (uint256);
}
