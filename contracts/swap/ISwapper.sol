// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { ISwap } from './ISwap.sol';
import { ISwapView } from './ISwapView.sol';

interface ISwapper is ISwap, ISwapView {}
