// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { ISwap } from './ISwap.sol';
import { ISwapView } from './ISwapView.sol';

/**
 * @title Core interface for OptyFiSwapper
 * @author OptyFi
 */
interface ISwapper is ISwap, ISwapView {

}
