import {
  CREDITS_PER_DOLLAR,
  CREDIT_PRICE_USD,
  type PathStep,
  type ScenarioConfig,
  type SimulationResult,
  type SpendingBudget,
} from "./scenario";

const CREDIT_FEATURES = new Set([
  "chat",
  "cli",
  "cloud-agent",
  "code-review",
  "other-ai",
]);

interface HardBudget {
  label: string;
  headroomUsd: number;
}

const NO_HARD_CAP_WARNING = "No configured hard spending cap applies. GitHub account, payment, and service limits can still restrict additional usage.";

function nonNegative(value: number): number {
  return Math.max(0, Number.isFinite(value) ? value : 0);
}

function nullableNonNegative(value: number | null): number | null {
  return value === null ? null : nonNegative(value);
}

function creditsFromUsd(value: number): number {
  return nonNegative(value) * CREDITS_PER_DOLLAR;
}

function hardBudget(label: string, budget: SpendingBudget): HardBudget | null {
  const limit = nullableNonNegative(budget.limitUsd);
  if (limit === null) return null;

  if (limit === 0 || budget.stop) {
    return {
      label,
      headroomUsd: Math.max(0, limit - nonNegative(budget.spentUsd)),
    };
  }

  return null;
}

function spendingBudgetWarnings(label: string, budget: SpendingBudget): string[] {
  if (budget.limitUsd === null) return [];
  if (nonNegative(budget.limitUsd) === 0 && !budget.stop) {
    return [`${label} is $0 with Stop usage off. The planner conservatively assumes a hard stop; GitHub documentation conflicts on this case.`];
  }
  return budget.stop ? [] : [`${label} is alert-only; it adds no spending cap. Budget notifications require opt-in.`];
}

function baseResult(
  status: SimulationResult["status"],
  headline: string,
  explanation: string,
  desiredCredits: number,
): SimulationResult {
  return {
    status,
    headline,
    explanation,
    desiredCredits,
    servedCredits: 0,
    includedCredits: 0,
    meteredCredits: 0,
    blockedCredits: 0,
    estimatedAdditionalCostUsd: 0,
    poolCredits: null,
    poolRemainingBeforeUser: null,
    effectiveUlbCredits: null,
    effectiveUlbSource: null,
    costCenterIncludedCapCredits: null,
    firstHardStop: null,
    uncappedMeteredExposure: false,
    warnings: [],
    path: [],
  };
}

function simulateIndividual(config: ScenarioConfig): SimulationResult {
  const desired = nonNegative(config.targetCredits);
  const allowance = nonNegative(config.individual.includedCredits);
  const included = Math.min(desired, allowance);
  const needsMetered = Math.max(0, desired - included);
  const additionalUsageEligible = config.individual.additionalUsageEligible === true;
  const budget: SpendingBudget = {
    limitUsd: nullableNonNegative(config.individual.additionalUsageBudgetUsd),
    spentUsd: nonNegative(config.individual.additionalUsageSpentUsd),
    stop: config.individual.additionalUsageStop !== false,
  };
  const personalHardBudget = hardBudget("Personal additional-usage budget", budget);
  const meteredCapacity = !additionalUsageEligible
    ? 0
    : personalHardBudget
      ? creditsFromUsd(personalHardBudget.headroomUsd)
      : Number.POSITIVE_INFINITY;
  const metered = Math.min(needsMetered, meteredCapacity);
  const served = included + metered;
  const blocked = desired - served;
  const uncapped = additionalUsageEligible && needsMetered > 0 && personalHardBudget === null;
  const status = blocked > 0
    ? served > 0 ? "partial" : "blocked"
    : metered > 0 ? "metered" : "included";
  const planName = config.individual.plan === "pro-plus"
    ? "Copilot Pro+"
    : `Copilot ${config.individual.plan[0].toUpperCase()}${config.individual.plan.slice(1)}`;
  const warnings: string[] = [];

  if ((config.individual.plan === "free" || config.individual.plan === "student") && allowance === 0) {
    warnings.push("GitHub does not publish a numeric Free or Student allowance. Enter the allowance shown in the account.");
  }
  if (!additionalUsageEligible && needsMetered > 0) {
    warnings.push("Additional usage is not authorized for this account. Confirm eligibility, payment status, and account limits with GitHub.");
  }
  if (additionalUsageEligible && needsMetered > 0) {
    warnings.push(...spendingBudgetWarnings("Personal additional-usage budget", budget));
  }
  if (uncapped) warnings.push(NO_HARD_CAP_WARNING);
  if (config.advisory.sessionLimitCredits !== null) {
    warnings.push("A CLI or SDK session limit is soft and can be crossed by the final model response.");
  }

  const path: PathStep[] = [
    { id: "billing", label: planName, detail: "Usage-based individual billing", tone: "passed" },
    {
      id: "allowance",
      label: "Included allowance",
      detail: `${allowance.toLocaleString()} credits available`,
      tone: included >= desired ? "active" : "warning",
    },
    {
      id: "personal-budget",
      label: "Additional usage",
      detail: needsMetered === 0
        ? "Not needed"
        : !additionalUsageEligible
          ? "Not authorized for this account"
          : personalHardBudget
            ? `$${personalHardBudget.headroomUsd.toLocaleString()} hard-budget headroom`
            : budget.limitUsd === null
              ? "Authorized; no configured spending-budget cap"
              : `$${budget.limitUsd.toLocaleString()} alert-only budget`,
      tone: needsMetered === 0 ? "skipped" : blocked > 0 ? "blocked" : uncapped ? "warning" : "active",
    },
  ];

  return {
    ...baseResult(
      status,
      blocked > 0
        ? !additionalUsageEligible && needsMetered > 0
          ? "Additional usage is not authorized"
          : "Included allowance or personal budget runs out"
        : metered > 0
          ? "Projected usage includes paid credits"
          : "Usage stays within the plan allowance",
      blocked > 0
        ? !additionalUsageEligible && needsMetered > 0
          ? "After included credits, further usage requires account authorization, an eligible plan upgrade, or the next calendar-month reset."
          : "Upgrade, raise the additional-usage budget, or wait for the next calendar-month reset."
        : metered > 0
          ? "The included allowance is projected first, followed by authorized additional usage subject to the configured spending controls."
          : "No additional usage charge is projected.",
      desired,
    ),
    servedCredits: served,
    includedCredits: included,
    meteredCredits: metered,
    blockedCredits: blocked,
    estimatedAdditionalCostUsd: metered * CREDIT_PRICE_USD,
    uncappedMeteredExposure: uncapped,
    firstHardStop: blocked > 0
      ? !additionalUsageEligible && needsMetered > 0
        ? "Additional usage authorization"
        : "Personal additional-usage budget"
      : null,
    warnings,
    path,
  };
}

function effectiveUlb(config: ScenarioConfig): { credits: number; source: string } | null {
  const managed = config.managed;
  if (managed.individualUlbUsd !== null) {
    return { credits: creditsFromUsd(managed.individualUlbUsd), source: "Individual ULB" };
  }
  if (managed.costCenter.membership !== "none" && managed.costCenter.ulbUsd !== null) {
    return { credits: creditsFromUsd(managed.costCenter.ulbUsd), source: "Cost center ULB" };
  }
  if (managed.universalUlbUsd !== null) {
    return { credits: creditsFromUsd(managed.universalUlbUsd), source: "Universal ULB" };
  }
  return null;
}

function managedWarnings(config: ScenarioConfig, needsMetered: boolean, uncapped: boolean, budgets: [string, SpendingBudget][]): string[] {
  const managed = config.managed;
  const costCenter = managed.costCenter;
  const warnings: string[] = [];

  if (effectiveUlb(config) === null) {
    warnings.push("No ULB is configured, so one user can consume a disproportionate share of the pool.");
  }
  if (needsMetered && uncapped) {
    warnings.push(NO_HARD_CAP_WARNING);
  }
  if (needsMetered && managed.paidUsageEnabled) {
    for (const [label, budget] of budgets) {
      warnings.push(...spendingBudgetWarnings(label, budget));
    }
  }
  if (costCenter.membership === "organization" || costCenter.membership === "enterprise-team") {
    warnings.push("GitHub recommends direct user assignment for predictable cost-center allocation.");
  }
  if (costCenter.multipleOrganizationLicenses) {
    warnings.push("The billing organization can be selected at random each cycle for users licensed through multiple organizations.");
  }
  if (config.advisory.modelPolicy === "unrestricted") {
    warnings.push("No model restriction is selected; model and token choice can materially change credit consumption.");
  }
  if (config.advisory.sessionLimitCredits !== null) {
    warnings.push("The session limit is advisory and soft; an in-flight response can exceed it.");
  }
  return warnings;
}

function simulateManaged(config: ScenarioConfig): SimulationResult {
  const desired = nonNegative(config.targetCredits);
  const managed = config.managed;
  const costCenter = managed.costCenter;
  const hasCostCenter = costCenter.membership !== "none";
  const poolCredits = nonNegative(managed.businessSeats) * nonNegative(managed.businessAllowance)
    + nonNegative(managed.enterpriseSeats) * nonNegative(managed.enterpriseAllowance);
  const poolRemaining = Math.max(0, poolCredits - nonNegative(managed.sharedPoolConsumedByOthers));
  const ulb = effectiveUlb(config);
  const ulbEligible = Math.min(desired, ulb?.credits ?? Number.POSITIVE_INFINITY);
  const ulbBlocked = desired - ulbEligible;

  const costCenterCap = hasCostCenter && costCenter.includedUsageControl
    ? nonNegative(costCenter.businessSeats) * nonNegative(managed.businessAllowance)
      + nonNegative(costCenter.enterpriseSeats) * nonNegative(managed.enterpriseAllowance)
    : null;
  const costCenterRemaining = costCenterCap === null
    ? Number.POSITIVE_INFINITY
    : Math.max(0, costCenterCap - nonNegative(costCenter.includedCreditsConsumedByOthers));
  const includedCapBlocks = costCenterCap !== null
    && costCenter.includedCapAction === "block"
    && costCenterRemaining <= poolRemaining
    && ulbEligible > costCenterRemaining;
  const eligibleAfterIncludedCap = includedCapBlocks
    ? Math.min(ulbEligible, costCenterRemaining)
    : ulbEligible;
  const costCenterBlocked = ulbEligible - eligibleAfterIncludedCap;
  const includedAvailability = Math.min(poolRemaining, costCenterRemaining);
  const included = Math.min(eligibleAfterIncludedCap, includedAvailability);
  const needsMetered = Math.max(0, eligibleAfterIncludedCap - included);

  const budgets: [string, SpendingBudget][] = [];
  if (hasCostCenter) {
    budgets.push(["Cost center budget", costCenter.meteredBudget]);
  } else if (managed.organizationBudgetApplies) {
    budgets.push(["Organization budget", managed.organizationBudget]);
  }
  if (!(hasCostCenter && costCenter.excludedFromEnterpriseBudget)) {
    budgets.push(["Enterprise budget", managed.enterpriseBudget]);
  }
  const hardBudgets = budgets.flatMap(([label, budget]) => {
    const hard = hardBudget(label, budget);
    return hard ? [hard] : [];
  });
  hardBudgets.sort((left, right) => left.headroomUsd - right.headroomUsd);

  const meteredCapacity = !managed.paidUsageEnabled
    ? 0
    : hardBudgets.length > 0
      ? creditsFromUsd(hardBudgets[0].headroomUsd)
      : Number.POSITIVE_INFINITY;
  const metered = Math.min(needsMetered, meteredCapacity);
  const meteredBlocked = needsMetered - metered;
  const served = included + metered;
  const blocked = desired - served;
  const uncapped = managed.paidUsageEnabled && needsMetered > 0 && hardBudgets.length === 0;

  let firstHardStop: string | null = null;
  if (meteredBlocked > 0) {
    firstHardStop = managed.paidUsageEnabled ? hardBudgets[0]?.label ?? "Spending budget" : "AI credit paid usage policy";
  } else if (costCenterBlocked > 0) {
    firstHardStop = "Cost center included-usage cap";
  } else if (ulbBlocked > 0) {
    firstHardStop = ulb?.source ?? "User-level budget";
  }

  const status = blocked > 0
    ? served > 0 ? "partial" : "blocked"
    : metered > 0 ? "metered" : "included";
  const explanation = blocked > 0
    ? `${firstHardStop ?? "A hard guardrail"} is reached before the requested monthly consumption can be served.`
    : metered > 0
      ? uncapped
        ? "Projected paid usage has no configured hard spending cap. Account, payment, and service limits are outside this projection."
        : "The included pool is followed by metered usage within every applicable hard budget."
      : "The request is served from included credits without projected metered charges.";

  const path: PathStep[] = [
    { id: "billing", label: "Business / Enterprise UBB", detail: "AI-credit path selected", tone: "passed" },
    {
      id: "ulb",
      label: ulb?.source ?? "No ULB",
      detail: ulb ? `${ulb.credits.toLocaleString()} credit hard stop` : "No per-user hard stop",
      tone: ulbBlocked > 0 ? "blocked" : ulb ? "passed" : "warning",
    },
    {
      id: "cost-center-pool",
      label: costCenterCap === null ? "Shared pool" : "Cost center included cap",
      detail: costCenterCap === null
        ? `${poolRemaining.toLocaleString()} credits available before this user`
        : `${costCenterRemaining.toLocaleString()} of ${costCenterCap.toLocaleString()} credits remain for the cost center`,
      tone: costCenterBlocked > 0 ? "blocked" : included > 0 ? "active" : "warning",
    },
    {
      id: "paid-policy",
      label: "Paid usage policy",
      detail: managed.paidUsageEnabled ? "Enabled" : "Disabled",
      tone: needsMetered === 0 ? "skipped" : meteredBlocked > 0 && !managed.paidUsageEnabled ? "blocked" : "passed",
    },
    {
      id: "spending",
      label: hasCostCenter ? "Cost center + enterprise limits" : managed.organizationBudgetApplies ? "Organization + enterprise limits" : "Enterprise limit",
      detail: hardBudgets.length === 0
        ? "No applicable hard limit"
        : `${hardBudgets[0].label}: $${hardBudgets[0].headroomUsd.toLocaleString()} headroom`,
      tone: needsMetered === 0 ? "skipped" : meteredBlocked > 0 && managed.paidUsageEnabled ? "blocked" : uncapped ? "warning" : "active",
    },
  ];

  return {
    ...baseResult(
      status,
      blocked > 0 ? "A guardrail stops part of the requested usage" : metered > 0 ? "Usage reaches paid overage" : "Usage stays in included credits",
      explanation,
      desired,
    ),
    servedCredits: served,
    includedCredits: included,
    meteredCredits: metered,
    blockedCredits: blocked,
    estimatedAdditionalCostUsd: metered * CREDIT_PRICE_USD,
    poolCredits,
    poolRemainingBeforeUser: poolRemaining,
    effectiveUlbCredits: ulb?.credits ?? null,
    effectiveUlbSource: ulb?.source ?? null,
    costCenterIncludedCapCredits: costCenterCap,
    firstHardStop,
    uncappedMeteredExposure: uncapped,
    warnings: managedWarnings(config, needsMetered > 0, uncapped, budgets),
    path,
  };
}

export function featureConsumesCredits(config: ScenarioConfig): boolean {
  return CREDIT_FEATURES.has(config.feature);
}

export function simulateScenario(config: ScenarioConfig): SimulationResult {
  const desired = nonNegative(config.targetCredits);

  if (!featureConsumesCredits(config)) {
    const result = baseResult(
      "not-billed",
      "This feature does not consume AI credits",
      "Code completions and next edit suggestions remain available when AI-credit features are blocked.",
      desired,
    );
    result.path = [
      { id: "feature", label: "Feature check", detail: "No AI-credit charge", tone: "active" },
    ];
    return result;
  }

  if (config.billingRoute === "legacy") {
    const result = baseResult(
      "legacy",
      "Legacy premium-request billing applies",
      "Existing annual Copilot Pro and Pro+ plans that stayed on the legacy model use premium requests and model multipliers until the term ends.",
      desired,
    );
    result.warnings = ["AI credits cannot be used to predict this legacy annual-plan outcome."];
    result.path = [
      { id: "billing", label: "Legacy annual plan", detail: "Use premium requests and model multipliers", tone: "active" },
    ];
    return result;
  }

  return config.billingRoute === "individual"
    ? simulateIndividual(config)
    : simulateManaged(config);
}
