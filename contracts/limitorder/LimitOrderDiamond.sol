// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { SolidStateDiamond } from '@solidstate/contracts/proxy/diamond/SolidStateDiamond.sol';

import { LimitOrderStorage } from './LimitOrderStorage.sol';

/**
 * @title Diamond proxy for LimitOrder contract suite
 * @author OptyFi
 */
contract LimitOrderDiamond is SolidStateDiamond {
    constructor(
        address _treasury,
        address _optyFiOracle,
        address _swapDiamond,
        address payable _ops,
        address _exchangeRouter
    ) {
        LimitOrderStorage.Layout storage l = LimitOrderStorage.layout();
        l.treasury = _treasury;
        l.oracle = _optyFiOracle;
        l.swapDiamond = _swapDiamond;
        l.ops = _ops;
        l.exchangeRouter = _exchangeRouter;
    }
}
