// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface IAPROracle {
    function getCompoundAPR(address token) external view returns (uint256);

    function getAaveV1APR(address token) external view returns (address, uint256);

    function getAaveV2APR(address token) external view returns (address, uint256);

    function getBestAPR(bytes32 tokensHash) external view returns (bytes32);
}
