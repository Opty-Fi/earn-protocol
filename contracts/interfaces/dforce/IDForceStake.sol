// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface IDForceStake {
    function stake (uint _value) external;
    function exit () external;
}