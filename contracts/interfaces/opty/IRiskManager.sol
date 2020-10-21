// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface IRiskManager {
    function getBestStrategy(string memory _profile, address _underlyingToken) external view returns (bytes32 hash);
}