// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface ICurveGauge {
    function deposit (uint _value) external;
    function withdraw (uint _value) external;
}
