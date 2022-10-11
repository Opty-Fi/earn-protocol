// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { LimitOrderStorage } from "./LimitOrderStorage.sol";

import { LimitOrderActions } from "./LimitOrderActions.sol";

/**
 * @title LimitOrder contract suite
 * @author OptyFi
 */
contract LimitOrder is LimitOrderActions {
    /*solhint-disable  use-forbidden-name*/
    constructor(
        address _treasury,
        address _optyFiOracle,
        address payable _ops
    ) {
        LimitOrderStorage.Layout storage l = LimitOrderStorage.layout();
        l.treasury = _treasury;
        l.oracle = _optyFiOracle;
        l.ops = _ops;
    }
    /*solhint-enable  use-forbidden-name*/
}
