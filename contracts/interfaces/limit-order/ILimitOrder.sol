// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { ILimitOrderSettings } from "./ILimitOrderSettings.sol";
import { ILimitOrderActions } from "./ILimitOrderActions.sol";
import { ILimitOrderView } from "./ILimitOrderView.sol";
import { ILimitOrderInternal } from "./ILimitOrderInternal.sol";

/**
 * @title Core interface for LimitOrder contract suite
 * @author OptyFi
 */
/* solhint-disable no-empty-blocks*/
interface ILimitOrder is ILimitOrderActions, ILimitOrderSettings, ILimitOrderView, ILimitOrderInternal {

}
/* solhint-enable no-empty-blocks*/
