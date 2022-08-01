// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { SolidStateDiamond } from '@solidstate/contracts/proxy/diamond/SolidStateDiamond.sol';

import { LimitOrderStorage } from './LimitOrderStorage.sol';
import { TokenTransferProxy } from '../utils/TokenTransferProxy.sol';

/**
 * @title Diamond proxy for LimitOrder contract suite
 * @author OptyFi
 */
contract LimitOrderDiamond is SolidStateDiamond {
    constructor(
        address _treasury,
        address _optyFiOracle,
        address _swapDiamond,
        uint256 _returnLimitBP
    ) {
        LimitOrderStorage.Layout storage l = LimitOrderStorage.layout();
        l.transferProxy = address(new TokenTransferProxy());
        l.treasury = _treasury;
        l.oracle = _optyFiOracle;
        l.swapDiamond = _swapDiamond;
        l.returnLimitBP = _returnLimitBP;
    }
}
