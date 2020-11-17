// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface IFulcrum {
    function mint(address receiver, uint depositAmount) external;
    function burn(address receiver, uint burnAmount) external;
}