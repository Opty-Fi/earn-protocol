import { ILimitOrder } from '../../typechain-types';
import { describeBehaviorOfLimitOrderActions } from './LimitOrderActions.behavior';
import { describeBehaviorOfLimitOrderSettings } from './LimitOrderSettings.behavior';
import { describeBehaviorOfLimitOrderView } from './LimitOrderView.behavior';

export interface LimitOrderBehaviorArgs {
  AaveVaultAddress: string;
}

export function describeBehaviorOfLimitOrder(
  deploy: () => Promise<ILimitOrder>,
  args: LimitOrderBehaviorArgs,
  skips?: string[],
) {
  describeBehaviorOfLimitOrderActions(deploy, skips),
    describeBehaviorOfLimitOrderSettings(deploy, skips),
    describeBehaviorOfLimitOrderView(deploy, skips);
}
