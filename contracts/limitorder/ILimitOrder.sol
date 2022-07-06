// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { ILimitOrderSettings } from './ILimitOrderSettings.sol';
import { ILimitOrderActions } from './ILimitOrderActions.sol';
import { ILimitOrderView } from './ILimitOrderView.sol';

interface ILimitOrder is
    ILimitOrderActions,
    ILimitOrderSettings,
    ILimitOrderView
{}
