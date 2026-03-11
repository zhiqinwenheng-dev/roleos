import type { LifecycleState } from "./types.js";

const lifecycleOrder: LifecycleState[] = ["draft", "validated", "active", "deprecated"];

export function canTransition(from: LifecycleState, to: LifecycleState): boolean {
  return lifecycleOrder.indexOf(to) >= lifecycleOrder.indexOf(from);
}

export function assertLifecycleTransition(from: LifecycleState, to: LifecycleState): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid lifecycle transition: ${from} -> ${to}`);
  }
}
