// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface IHarvestFarm {
    function stake (uint _value) external;
    function exit () external;
}