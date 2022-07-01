// SPDX-License-Identifier: MIT

//SPDX-license-identifier: MIT
pragma solidity ^0.8.15;

import { SolidStateDiamond } from '@solidstate/contracts/proxy/diamond/SolidStateDiamond.sol';

import { SwapStorage } from './SwapStorage.sol';
import { TokenTransferProxy } from '../utils/TokenTransferProxy.sol';

/**
 * @title Diamond proxy for OptyFiSwapper
 * @author OptyFi
 */
contract OptyFiSwapper is SolidStateDiamond {
    constructor() {
        TokenTransferProxy tokenTransferProxy = new TokenTransferProxy();
        SwapStorage.layout().tokenTransferProxy = address(tokenTransferProxy);
    }
}
