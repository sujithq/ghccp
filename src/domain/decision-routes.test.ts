import { describe, expect, it } from "vitest";
import { DECISION_FLOW } from "../content/decisionFlow";
import { clonePreset } from "./presets";
import type {
  IndividualPlan,
  ScenarioConfig,
  SimulationResult,
  SpendingBudget,
} from "./scenario";
import { simulateScenario } from "./simulator";

type ResultExpectation = Partial<Pick<
  SimulationResult,
  | "status"
  | "servedCredits"
  | "includedCredits"
  | "meteredCredits"
  | "blockedCredits"
  | "firstHardStop"
  | "uncappedMeteredExposure"
>>;

interface DecisionRouteCase {
  name: string;
  edges: string[];
  verify: () => void;
}

type MeteredScope = "cost-center" | "organization" | "enterprise";
type LimitOutcome = "exhausted" | "uncapped" | "headroom";

function edge(from: string, to: string, label?: string): string {
  return label ? `${from} -- "${label}" --> ${to}` : `${from} --> ${to}`;
}

function expectResult(config: ScenarioConfig, expected: ResultExpectation): SimulationResult {
  const result = simulateScenario(config);
  expect(result).toMatchObject(expected);
  return result;
}

function individualScenario(
  plan: IndividualPlan,
  includedCredits: number,
  targetCredits: number,
): ScenarioConfig {
  const config = clonePreset("individual-pro");
  config.feature = "chat";
  config.billingRoute = "individual";
  config.targetCredits = targetCredits;
  config.individual = {
    plan,
    includedCredits,
    additionalUsageBudgetUsd: null,
    additionalUsageSpentUsd: 0,
  };
  config.advisory.sessionLimitCredits = null;
  return config;
}

function managedScenario(targetCredits = 400): ScenarioConfig {
  const config = clonePreset("no-guardrails");
  config.feature = "chat";
  config.billingRoute = "managed";
  config.targetCredits = targetCredits;
  config.managed.businessSeats = 1;
  config.managed.enterpriseSeats = 0;
  config.managed.businessAllowance = 1_000;
  config.managed.enterpriseAllowance = 7_000;
  config.managed.sharedPoolConsumedByOthers = 0;
  config.managed.paidUsageEnabled = true;
  config.managed.universalUlbUsd = null;
  config.managed.individualUlbUsd = null;
  config.managed.costCenter = {
    membership: "none",
    businessSeats: 0,
    enterpriseSeats: 0,
    includedUsageControl: false,
    includedCreditsConsumedByOthers: 0,
    includedCapAction: "meter",
    ulbUsd: null,
    meteredBudget: { limitUsd: null, spentUsd: 0, stop: false },
    excludedFromEnterpriseBudget: false,
    multipleOrganizationLicenses: false,
  };
  config.managed.organizationBudgetApplies = false;
  config.managed.organizationBudget = { limitUsd: null, spentUsd: 0, stop: false };
  config.managed.enterpriseBudget = { limitUsd: null, spentUsd: 0, stop: false };
  config.advisory.modelPolicy = "auto";
  config.advisory.sessionLimitCredits = null;
  return config;
}

function enableCostCenterIncludedControl(
  config: ScenarioConfig,
  includedCreditsConsumedByOthers: number,
  action: "block" | "meter",
): void {
  config.managed.costCenter.membership = "direct";
  config.managed.costCenter.businessSeats = 1;
  config.managed.costCenter.includedUsageControl = true;
  config.managed.costCenter.includedCreditsConsumedByOthers = includedCreditsConsumedByOthers;
  config.managed.costCenter.includedCapAction = action;
}

function meteredScenario(
  scope: MeteredScope,
  outcome: LimitOutcome,
): { config: ScenarioConfig; hardStop: string; expected: ResultExpectation } {
  const config = managedScenario();
  let budget: SpendingBudget;

  if (outcome === "exhausted") {
    budget = scope === "cost-center"
      ? { limitUsd: 0, spentUsd: 0, stop: false }
      : scope === "organization"
        ? { limitUsd: 5, spentUsd: 5, stop: true }
        : { limitUsd: 2, spentUsd: 0, stop: true };
  } else if (outcome === "uncapped") {
    budget = { limitUsd: 10, spentUsd: 0, stop: false };
  } else {
    budget = { limitUsd: 10, spentUsd: 0, stop: true };
  }

  let hardStop: string;
  if (scope === "cost-center") {
    enableCostCenterIncludedControl(config, 1_000, "meter");
    config.managed.costCenter.meteredBudget = budget;
    hardStop = "Cost center budget";
  } else {
    config.managed.sharedPoolConsumedByOthers = 1_000;
    config.managed.organizationBudgetApplies = scope === "organization";
    if (scope === "organization") {
      config.managed.organizationBudget = budget;
      hardStop = "Organization budget";
    } else {
      config.managed.enterpriseBudget = budget;
      hardStop = "Enterprise budget";
    }
  }

  if (outcome === "exhausted") {
    const meteredCredits = scope === "enterprise" ? 200 : 0;
    return {
      config,
      hardStop,
      expected: {
        status: meteredCredits > 0 ? "partial" : "blocked",
        servedCredits: meteredCredits,
        includedCredits: 0,
        meteredCredits,
        blockedCredits: 400 - meteredCredits,
        firstHardStop: hardStop,
        uncappedMeteredExposure: false,
      },
    };
  }

  return {
    config,
    hardStop,
    expected: {
      status: "metered",
      servedCredits: 400,
      includedCredits: 0,
      meteredCredits: 400,
      blockedCredits: 0,
      firstHardStop: null,
      uncappedMeteredExposure: outcome === "uncapped",
    },
  };
}

const START = edge("START", "FEATURE");
const FEATURE_YES = edge("FEATURE", "PLAN", "Yes");
const INDIVIDUAL = edge("PLAN", "INDPLAN", "Individual UBB");
const MANAGED = edge("PLAN", "ULB", "Business / Enterprise");
const WITHIN_ULB = edge("ULB", "CCPOOL", "Within / none");

const individualPrefix = [START, FEATURE_YES, INDIVIDUAL];
const managedPrefix = [START, FEATURE_YES, MANAGED, WITHIN_ULB];

function includedPlanRoute(
  name: string,
  plan: IndividualPlan,
  allowance: number,
  target: number,
  planLabel: string,
  usesCustomAllowance = false,
): DecisionRouteCase {
  const planEdges = usesCustomAllowance
    ? [
        edge("INDPLAN", "INDCUSTOM", "Free / Student"),
        edge("INDCUSTOM", "INCCHECK"),
      ]
    : [edge("INDPLAN", "INCCHECK", planLabel)];

  return {
    name,
    edges: [
      ...individualPrefix,
      ...planEdges,
      edge("INCCHECK", "INDINCLUDED", "Yes"),
    ],
    verify: () => {
      const config = individualScenario(plan, allowance, target);
      expectResult(config, {
        status: "included",
        servedCredits: target,
        includedCredits: target,
        meteredCredits: 0,
        blockedCredits: 0,
      });
    },
  };
}

function meteredRoute(
  scope: MeteredScope,
  outcome: LimitOutcome,
): DecisionRouteCase {
  const scopeNode = scope === "cost-center"
    ? "CCBUDGET"
    : scope === "organization"
      ? "ORGBUDGET"
      : "ENTBUDGET";
  const scopeLabel = scope === "cost-center"
    ? "Cost center"
    : scope === "organization"
      ? "Billing organization"
      : "Neither";
  const entryEdges = scope === "cost-center"
    ? [edge("CCPOOL", "PAIDPOLICY", "Cap reached + paid overage")]
    : [
        edge("CCPOOL", "POOLCHECK", "None"),
        edge("POOLCHECK", "PAIDPOLICY", "No"),
      ];
  const limitLabel = outcome === "exhausted"
    ? "Stop on + reached / $0"
    : outcome === "uncapped"
      ? "Absent / stop off"
      : "Headroom remains";
  const terminalNode = outcome === "exhausted"
    ? "BLOCKBUDGET"
    : outcome === "uncapped"
      ? "UNCAPPED"
      : "METERED";

  return {
    name: `${scope} scope reaches the ${outcome} budget route`,
    edges: [
      ...managedPrefix,
      ...entryEdges,
      edge("PAIDPOLICY", "SCOPE", "Yes"),
      edge("SCOPE", scopeNode, scopeLabel),
      edge(scopeNode, "LIMIT"),
      edge("LIMIT", terminalNode, limitLabel),
      ...(outcome === "exhausted" ? [edge("BLOCKBUDGET", "STILLWORKS")] : []),
    ],
    verify: () => {
      const route = meteredScenario(scope, outcome);
      const result = expectResult(route.config, route.expected);
      if (outcome === "uncapped") {
        expect(result.warnings).toContain(`${route.hardStop.replace(" budget", "")} budget is alert-only because stop usage is off.`);
      }
    },
  };
}

const routeCases: DecisionRouteCase[] = [
  {
    name: "a non-credit feature bypasses billing",
    edges: [START, edge("FEATURE", "FREEFEATURE", "No")],
    verify: () => {
      for (const feature of ["completions", "next-edits"] as const) {
        const config = managedScenario();
        config.feature = feature;
        expectResult(config, {
          status: "not-billed",
          servedCredits: 0,
          meteredCredits: 0,
        });
      }
    },
  },
  {
    name: "a legacy annual plan stays on premium-request billing",
    edges: [
      START,
      FEATURE_YES,
      edge("PLAN", "LEGACY", "Legacy annual Pro / Pro+"),
      edge("LEGACY", "LEGACYEND"),
    ],
    verify: () => {
      expectResult(clonePreset("legacy-annual"), {
        status: "legacy",
        servedCredits: 0,
        meteredCredits: 0,
      });
    },
  },
  includedPlanRoute("a Free plan uses its entered account allowance", "free", 400, 300, "Free / Student", true),
  includedPlanRoute("a Student plan uses its entered account allowance", "student", 600, 500, "Free / Student", true),
  includedPlanRoute("a Pro plan stays within its 1,500-credit allowance", "pro", 1_500, 1_000, "Pro 1,500"),
  includedPlanRoute("a Pro+ plan stays within its 7,000-credit allowance", "pro-plus", 7_000, 6_000, "Pro+ 7,000"),
  includedPlanRoute("a Max plan stays within its 20,000-credit allowance", "max", 20_000, 19_000, "Max 20,000"),
  {
    name: "an individual upgrade loops back through the larger allowance",
    edges: [
      ...individualPrefix,
      edge("INDPLAN", "INCCHECK", "Pro 1,500"),
      edge("INCCHECK", "INDCHOICE", "No"),
      edge("INDCHOICE", "INDUPGRADE", "Upgrade"),
      edge("INDUPGRADE", "INCCHECK"),
      edge("INCCHECK", "INDINCLUDED", "Yes"),
    ],
    verify: () => {
      const beforeUpgrade = individualScenario("pro", 1_500, 2_500);
      expectResult(beforeUpgrade, {
        status: "partial",
        includedCredits: 1_500,
        blockedCredits: 1_000,
      });

      const afterUpgrade = individualScenario("pro-plus", 7_000, 2_500);
      expectResult(afterUpgrade, {
        status: "included",
        servedCredits: 2_500,
        blockedCredits: 0,
      });
    },
  },
  {
    name: "a personal budget covers all excess individual usage",
    edges: [
      ...individualPrefix,
      edge("INDPLAN", "INCCHECK", "Pro 1,500"),
      edge("INCCHECK", "INDCHOICE", "No"),
      edge("INDCHOICE", "INDBUDGET", "Pay"),
      edge("INDBUDGET", "INDPAID", "Yes"),
    ],
    verify: () => {
      const config = individualScenario("pro", 1_500, 2_500);
      config.individual.additionalUsageBudgetUsd = 10;
      expectResult(config, {
        status: "metered",
        servedCredits: 2_500,
        includedCredits: 1_500,
        meteredCredits: 1_000,
        blockedCredits: 0,
      });
    },
  },
  {
    name: "an insufficient personal budget blocks the uncovered excess",
    edges: [
      ...individualPrefix,
      edge("INDPLAN", "INCCHECK", "Pro 1,500"),
      edge("INCCHECK", "INDCHOICE", "No"),
      edge("INDCHOICE", "INDBUDGET", "Pay"),
      edge("INDBUDGET", "BLOCKIND", "No"),
    ],
    verify: () => {
      const config = individualScenario("pro", 1_500, 2_500);
      config.individual.additionalUsageBudgetUsd = 5;
      expectResult(config, {
        status: "partial",
        servedCredits: 2_000,
        includedCredits: 1_500,
        meteredCredits: 500,
        blockedCredits: 500,
        firstHardStop: "Personal additional-usage budget",
      });
    },
  },
  {
    name: "waiting leaves excess individual usage blocked",
    edges: [
      ...individualPrefix,
      edge("INDPLAN", "INCCHECK", "Pro 1,500"),
      edge("INCCHECK", "INDCHOICE", "No"),
      edge("INDCHOICE", "BLOCKIND", "Wait"),
    ],
    verify: () => {
      const config = individualScenario("pro", 1_500, 2_500);
      expectResult(config, {
        status: "partial",
        servedCredits: 1_500,
        includedCredits: 1_500,
        blockedCredits: 1_000,
        firstHardStop: "Personal additional-usage budget",
      });
    },
  },
  {
    name: "an exceeded effective ULB blocks before pool and spending controls",
    edges: [
      START,
      FEATURE_YES,
      MANAGED,
      edge("ULB", "BLOCKULB", "Exceeded"),
      edge("BLOCKULB", "STILLWORKS"),
    ],
    verify: () => {
      const config = managedScenario();
      config.managed.universalUlbUsd = 2;
      expectResult(config, {
        status: "partial",
        servedCredits: 200,
        includedCredits: 200,
        blockedCredits: 200,
        firstHardStop: "Universal ULB",
      });
    },
  },
  {
    name: "a cost-center included cap with room serves included credits",
    edges: [
      ...managedPrefix,
      edge("CCPOOL", "POOL", "Cap has room"),
      edge("POOL", "SERVED"),
    ],
    verify: () => {
      const config = managedScenario();
      config.managed.universalUlbUsd = 10;
      enableCostCenterIncludedControl(config, 500, "block");
      expectResult(config, {
        status: "included",
        servedCredits: 400,
        includedCredits: 400,
        blockedCredits: 0,
      });
    },
  },
  {
    name: "a reached cost-center included cap blocks when configured",
    edges: [
      ...managedPrefix,
      edge("CCPOOL", "BLOCKCCPOOL", "Cap reached + block"),
      edge("BLOCKCCPOOL", "STILLWORKS"),
    ],
    verify: () => {
      const config = managedScenario();
      enableCostCenterIncludedControl(config, 1_000, "block");
      expectResult(config, {
        status: "blocked",
        servedCredits: 0,
        blockedCredits: 400,
        firstHardStop: "Cost center included-usage cap",
      });
    },
  },
  {
    name: "paid usage disabled blocks cost-center overage",
    edges: [
      ...managedPrefix,
      edge("CCPOOL", "PAIDPOLICY", "Cap reached + paid overage"),
      edge("PAIDPOLICY", "BLOCKPOOL", "No"),
      edge("BLOCKPOOL", "STILLWORKS"),
    ],
    verify: () => {
      const config = managedScenario();
      enableCostCenterIncludedControl(config, 1_000, "meter");
      config.managed.paidUsageEnabled = false;
      expectResult(config, {
        status: "blocked",
        servedCredits: 0,
        blockedCredits: 400,
        firstHardStop: "AI credit paid usage policy",
      });
    },
  },
  {
    name: "a shared pool with room serves included credits",
    edges: [
      ...managedPrefix,
      edge("CCPOOL", "POOLCHECK", "None"),
      edge("POOLCHECK", "POOL", "Yes"),
      edge("POOL", "SERVED"),
    ],
    verify: () => {
      expectResult(managedScenario(), {
        status: "included",
        servedCredits: 400,
        includedCredits: 400,
        blockedCredits: 0,
      });
    },
  },
  {
    name: "paid usage disabled blocks after shared-pool exhaustion",
    edges: [
      ...managedPrefix,
      edge("CCPOOL", "POOLCHECK", "None"),
      edge("POOLCHECK", "PAIDPOLICY", "No"),
      edge("PAIDPOLICY", "BLOCKPOOL", "No"),
      edge("BLOCKPOOL", "STILLWORKS"),
    ],
    verify: () => {
      const config = managedScenario();
      config.managed.sharedPoolConsumedByOthers = 1_000;
      config.managed.paidUsageEnabled = false;
      expectResult(config, {
        status: "blocked",
        servedCredits: 0,
        blockedCredits: 400,
        firstHardStop: "AI credit paid usage policy",
      });
    },
  },
  ...(["cost-center", "organization", "enterprise"] as const).flatMap((scope) =>
    (["exhausted", "uncapped", "headroom"] as const).map((outcome) =>
      meteredRoute(scope, outcome),
    ),
  ),
];

function decisionFlowEdges(): string[] {
  const pattern = /^\s*([A-Z][A-Z0-9]*)\s+(?:--\s*"([^"]+)"\s*-->|-->)\s+([A-Z][A-Z0-9]*)/gm;
  return [...DECISION_FLOW.matchAll(pattern)].map((match) => edge(match[1], match[3], match[2]));
}

describe("decision-flow routes", () => {
  it.each(routeCases)("$name", ({ verify }) => {
    verify();
  });

  it("uses only edges declared by the rendered decision tree", () => {
    const declared = new Set(decisionFlowEdges());
    const invalid = routeCases.flatMap((route) => route.edges).filter((routeEdge) => !declared.has(routeEdge));

    expect(invalid).toEqual([]);
  });

  it("has an executable route test for every decision-tree edge", () => {
    const covered = new Set(routeCases.flatMap((route) => route.edges));
    const uncovered = decisionFlowEdges().filter((routeEdge) => !covered.has(routeEdge));

    expect(uncovered).toEqual([]);
  });
});

describe("effective ULB precedence", () => {
  it.each([
    {
      name: "individual overrides cost center and universal",
      individual: 12,
      costCenter: 8,
      universal: 5,
      expectedSource: "Individual ULB",
      expectedCredits: 1_200,
    },
    {
      name: "cost center overrides universal",
      individual: null,
      costCenter: 8,
      universal: 5,
      expectedSource: "Cost center ULB",
      expectedCredits: 800,
    },
    {
      name: "universal is the fallback",
      individual: null,
      costCenter: null,
      universal: 5,
      expectedSource: "Universal ULB",
      expectedCredits: 500,
    },
    {
      name: "no configured ULB leaves the route uncapped per user",
      individual: null,
      costCenter: null,
      universal: null,
      expectedSource: null,
      expectedCredits: null,
    },
  ])("$name", ({ individual, costCenter, universal, expectedSource, expectedCredits }) => {
    const config = managedScenario();
    config.managed.costCenter.membership = "direct";
    config.managed.individualUlbUsd = individual;
    config.managed.costCenter.ulbUsd = costCenter;
    config.managed.universalUlbUsd = universal;

    const result = simulateScenario(config);

    expect(result.effectiveUlbSource).toBe(expectedSource);
    expect(result.effectiveUlbCredits).toBe(expectedCredits);
  });
});