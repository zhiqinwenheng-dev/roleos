import type { PlanRow } from "./store.js";

export interface RevenueComputationInput {
  plan: PlanRow;
  usageCostBeforeUsd: number;
  currentRunCostUsd: number;
}

export interface RevenueComputationResult {
  variableRevenueUsd: number;
  includedBudgetRemainingUsd: number;
}

function roundUsd(value: number): number {
  return Number(value.toFixed(6));
}

export function computeIncrementalVariableRevenue(
  input: RevenueComputationInput
): RevenueComputationResult {
  const included = input.plan.includedCostUsd;
  const before = Math.max(0, input.usageCostBeforeUsd - included);
  const after = Math.max(0, input.usageCostBeforeUsd + input.currentRunCostUsd - included);
  const incrementalOverage = Math.max(0, after - before);
  const variableRevenueUsd = roundUsd(incrementalOverage * input.plan.overageMultiplier);
  const includedBudgetRemainingUsd = roundUsd(
    Math.max(0, included - (input.usageCostBeforeUsd + input.currentRunCostUsd))
  );

  return {
    variableRevenueUsd,
    includedBudgetRemainingUsd
  };
}
