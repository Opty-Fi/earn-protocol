import { describeBehaviorOfLimitOrderActions } from "./LimitOrderActions.behavior";
import { describeBehaviorOfLimitOrderSettings } from "./LimitOrderSettings.behavior";
import { describeBehaviorOfLimitOrderView } from "./LimitOrderView.behavior";

export function describeBehaviorOfLimitOrder(skips?: string[]): void {
  describeBehaviorOfLimitOrderActions(skips), describeBehaviorOfLimitOrderSettings(skips);
  // ,
  // describeBehaviorOfLimitOrderView(skips);
}
