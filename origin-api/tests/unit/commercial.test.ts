import { describe, expect, it } from "vitest";
import { computeIncrementalVariableRevenue } from "../../src/cloud/commercial.js";

describe("commercial calculations", () => {
  it("computes overage variable revenue incrementally", () => {
    const result = computeIncrementalVariableRevenue({
      plan: {
        code: "starter",
        name: "Starter",
        monthlyPriceUsd: 29,
        monthlyRunLimit: 100,
        includedCostUsd: 1,
        overageMultiplier: 1.5,
        isActive: true
      },
      usageCostBeforeUsd: 1.2,
      currentRunCostUsd: 0.4
    });

    expect(result.variableRevenueUsd).toBeCloseTo(0.6, 6);
    expect(result.includedBudgetRemainingUsd).toBe(0);
  });
});
