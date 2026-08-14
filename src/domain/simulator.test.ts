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

    expect(result.costCenterIncludedCapCredits).toBe(95_000);
    expect(result.includedCredits).toBe(5_000);
    expect(result.firstHardStop).toBe("Cost center included-usage cap");
  });

  it("uses the lower cost-center headroom before the enterprise limit", () => {
    const config = clonePreset("cost-center");
    config.managed.costCenter.includedCreditsConsumedByOthers = 95_000;
    config.managed.costCenter.meteredBudget = { limitUsd: 40, spentUsd: 10, stop: true };
    config.managed.enterpriseBudget = { limitUsd: 500, spentUsd: 0, stop: true };

    const result = simulateScenario(config);

    expect(result.meteredCredits).toBe(3_000);
    expect(result.firstHardStop).toBe("Cost center budget");
  });

  it("lets an excluded cost center ignore enterprise headroom", () => {
    const config = clonePreset("cost-center");
    config.targetCredits = 6_000;
    config.managed.costCenter.includedCreditsConsumedByOthers = 95_000;
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
});
