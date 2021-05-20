// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

interface IAPROracle {
    function getBestAPR(bytes32 tokensHash) external view returns (bytes32);

    function getBestAPRAdjusted(bytes32 tokensHash, uint256 _supply) external view returns (bytes32);
}
