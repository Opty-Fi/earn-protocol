// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

interface ICurveDAO {
    function mint (address liquidityPoolGauge) external; // Function to mint CRV tokens.
}
