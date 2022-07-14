import { ILimitOrder, ISwapper } from '../../typechain-types';
import { describeBehaviorOfLimitOrderActions } from './LimitOrderActions.behavior';
import { describeBehaviorOfLimitOrderSettings } from './LimitOrderSettings.behavior';
import { describeBehaviorOfLimitOrderView } from './LimitOrderView.behavior';

export interface LimitOrderBehaviorArgs {
  AaveVaultAddress: string;
}

export function describeBehaviorOfLimitOrder(
  deploy: () => Promise<ILimitOrder>,
  deploySwapper: () => Promise<ISwapper>,
  args: LimitOrderBehaviorArgs,
  skips?: string[],
) {
  describeBehaviorOfLimitOrderActions(deploy, deploySwapper, skips),
    describeBehaviorOfLimitOrderSettings(deploy, skips),
    describeBehaviorOfLimitOrderView(deploy, skips);
}
