// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface IPriceOracle {
    function getAssetPrice(address _asset) external view returns(uint256);
}
