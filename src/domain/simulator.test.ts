import { describe, expect, it } from "vitest";
import { clonePreset } from "./presets";
import { simulateScenario } from "./simulator";

describe("simulateScenario", () => {
  it("does not bill completions in AI credits", () => {
    const config = clonePreset("balanced");
    config.feature = "completions";

    const result = simulateScenario(config);

    expect(result.status).toBe("not-billed");
    expect(result.meteredCredits).toBe(0);
  });

  it("serves managed usage from the shared pool with no ULB", () => {
    const config = clonePreset("no-guardrails");
    config.targetCredits = 500;

    const result = simulateScenario(config);

    expect(result.status).toBe("included");
    expect(result.servedCredits).toBe(500);
    expect(result.effectiveUlbCredits).toBeNull();
  });

  it("always treats a ULB as a hard stop", () => {
    const config = clonePreset("balanced");
    config.targetCredits = 8_000;
    config.managed.sharedPoolConsumedByOthers = 0;
    config.managed.universalUlbUsd = 50;

    const result = simulateScenario(config);

    expect(result.servedCredits).toBe(5_000);
    expect(result.blockedCredits).toBe(3_000);
    expect(result.firstHardStop).toBe("Universal ULB");
  });

  it("uses the most specific ULB", () => {
    const config = clonePreset("power-user");
    config.managed.individualUlbUsd = 120;
    config.managed.costCenter.ulbUsd = 80;
    config.managed.universalUlbUsd = 50;

    const result = simulateScenario(config);

    expect(result.effectiveUlbCredits).toBe(12_000);
    expect(result.effectiveUlbSource).toBe("Individual ULB");
  });

  it("blocks at pool exhaustion when paid usage is disabled", () => {
    const config = clonePreset("included-only");

    const result = simulateScenario(config);

    expect(result.includedCredits).toBe(1_000);
    expect(result.meteredCredits).toBe(0);
    expect(result.firstHardStop).toBe("AI credit paid usage policy");
  });

  it("reports uncapped exposure without a ULB or hard budget", () => {
    const config = clonePreset("no-guardrails");

    const result = simulateScenario(config);

    expect(result.meteredCredits).toBe(11_000);
    expect(result.uncappedMeteredExposure).toBe(true);
    expect(result.estimatedAdditionalCostUsd).toBe(110);
  });

  it("stops at the enterprise budget's remaining headroom", () => {
    const config = clonePreset("no-guardrails");
    config.managed.enterpriseBudget = { limitUsd: 50, spentUsd: 20, stop: true };

    const result = simulateScenario(config);

    expect(result.meteredCredits).toBe(3_000);
    expect(result.firstHardStop).toBe("Enterprise budget");
  });

  it("blocks a cost center at its seat-funded included cap", () => {
    const config = clonePreset("cost-center");
    config.managed.individualUlbUsd = null;
    config.managed.costCenter.ulbUsd = null;
    config.managed.universalUlbUsd = null;
    config.managed.costCenter.includedCapAction = "block";
    config.managed.sharedPoolConsumedByOthers = 0;

    const result = simulateScenario(config);

    expect(result.costCenterIncludedCapCredits).toBe(57_500);
    expect(result.includedCredits).toBe(5_000);
    expect(result.firstHardStop).toBe("Cost center included-usage cap");
  });

  it("uses the lower cost-center headroom before the enterprise limit", () => {
    const config = clonePreset("cost-center");
    config.managed.costCenter.includedCreditsConsumedByOthers = 57_500;
    config.managed.costCenter.meteredBudget = { limitUsd: 40, spentUsd: 10, stop: true };
    config.managed.enterpriseBudget = { limitUsd: 500, spentUsd: 0, stop: true };

    const result = simulateScenario(config);

    expect(result.meteredCredits).toBe(3_000);
    expect(result.firstHardStop).toBe("Cost center budget");
  });

  it("lets an excluded cost center ignore enterprise headroom", () => {
    const config = clonePreset("cost-center");
    config.targetCredits = 6_000;
    config.managed.costCenter.includedCreditsConsumedByOthers = 57_500;
    config.managed.costCenter.excludedFromEnterpriseBudget = true;
    config.managed.costCenter.meteredBudget = { limitUsd: 100, spentUsd: 0, stop: true };
    config.managed.enterpriseBudget = { limitUsd: 0, spentUsd: 0, stop: true };

    const result = simulateScenario(config);

    expect(result.servedCredits).toBe(6_000);
    expect(result.firstHardStop).toBeNull();
  });

  it("uses included and personal budget credits for an individual plan", () => {
    const config = clonePreset("individual-pro");

    const result = simulateScenario(config);

    expect(result.includedCredits).toBe(1_500);
    expect(result.meteredCredits).toBe(1_000);
    expect(result.status).toBe("metered");
  });

  it("does not apply AI-credit simulation to a legacy annual plan", () => {
    const result = simulateScenario(clonePreset("legacy-annual"));

    expect(result.status).toBe("legacy");
    expect(result.servedCredits).toBe(0);
  });

  it("uses account authorization without inferring a Mobile subscription restriction", () => {
    const config = clonePreset("individual-pro");
    config.individual.additionalUsageEligible = false;

    const result = simulateScenario(config);

    expect(result.status).toBe("partial");
    expect(result.includedCredits).toBe(1_500);
    expect(result.meteredCredits).toBe(0);
    expect(result.firstHardStop).toBe("Additional usage authorization");
    expect(result.warnings).toContain("Additional usage is not authorized for this account. Confirm eligibility, payment status, and account limits with GitHub.");
    expect(JSON.stringify(result)).not.toMatch(/Mobile/i);
  });

  it.each([
    { name: "hard budget", limitUsd: 10, stop: true, metered: 500, blocked: 500, uncapped: false },
    { name: "alert-only budget", limitUsd: 10, stop: false, metered: 1_000, blocked: 0, uncapped: true },
    { name: "no budget", limitUsd: null, stop: true, metered: 1_000, blocked: 0, uncapped: true },
    { name: "legacy hard budget", limitUsd: 10, stop: undefined, metered: 500, blocked: 500, uncapped: false },
  ])("models authorized individual overage with $name", ({ limitUsd, stop, metered, blocked, uncapped }) => {
    const config = clonePreset("individual-pro");
    config.individual.additionalUsageBudgetUsd = limitUsd;
    config.individual.additionalUsageSpentUsd = 5;
    config.individual.additionalUsageStop = stop;

    const result = simulateScenario(config);

    expect(result.meteredCredits).toBe(metered);
    expect(result.blockedCredits).toBe(blocked);
    expect(result.estimatedAdditionalCostUsd).toBe(metered * 0.01);
    expect(result.uncappedMeteredExposure).toBe(uncapped);
    if (uncapped) expect(result.warnings.join(" ")).toContain("account, payment, and service limits");
    if (stop === false) expect(result.warnings.join(" ")).toContain("notifications require opt-in");
  });

  it("does not infer account authorization from a missing personal budget", () => {
    const config = clonePreset("individual-pro");
    config.individual.additionalUsageBudgetUsd = null;
    Reflect.deleteProperty(config.individual, "additionalUsageEligible");

    const result = simulateScenario(config);

    expect(result.meteredCredits).toBe(0);
    expect(result.uncappedMeteredExposure).toBe(false);
    expect(result.firstHardStop).toBe("Additional usage authorization");
  });

  it("qualifies the conservative zero-budget assumption for individual overage", () => {
    const config = clonePreset("individual-pro");
    config.individual.additionalUsageBudgetUsd = 0;
    config.individual.additionalUsageStop = false;

    const result = simulateScenario(config);

    expect(result.meteredCredits).toBe(0);
    expect(result.firstHardStop).toBe("Personal additional-usage budget");
    expect(result.warnings.join(" ")).toContain("conservatively assumes a hard stop");
    expect(result.warnings.join(" ")).toContain("GitHub documentation conflicts");
  });

  it("qualifies zero budgets only when they apply to projected paid usage", () => {
    const config = clonePreset("no-guardrails");
    config.managed.enterpriseBudget = { limitUsd: 0, spentUsd: 0, stop: false };

    const result = simulateScenario(config);

    expect(result.meteredCredits).toBe(0);
    expect(result.firstHardStop).toBe("Enterprise budget");
    expect(result.warnings.join(" ")).toContain("GitHub documentation conflicts");

    config.managed.costCenter.membership = "direct";
    config.managed.costCenter.excludedFromEnterpriseBudget = true;
    const excluded = simulateScenario(config);
    expect(excluded.meteredCredits).toBe(11_000);
    expect(excluded.warnings.join(" ")).not.toContain("GitHub documentation conflicts");
  });

  it("forecasts partial monthly consumption without mutating the scenario", () => {
    const config = clonePreset("no-guardrails");
    config.targetCredits = 100;
    config.managed.businessSeats = 1;
    config.managed.businessAllowance = 100;
    config.managed.sharedPoolConsumedByOthers = 40;
    config.managed.paidUsageEnabled = false;
    const baseline = structuredClone(config);

    const result = simulateScenario(config);

    expect(result).toMatchObject({ status: "partial", includedCredits: 60, servedCredits: 60, blockedCredits: 40, meteredCredits: 0 });
    expect(config).toEqual(baseline);
    expect(simulateScenario(config)).toEqual(result);
  });
});
