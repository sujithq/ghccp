import type { ScenarioConfig } from "./scenario";

export interface ScenarioPreset {
  id: string;
  name: string;
  summary: string;
  config: ScenarioConfig;
}

const baseManaged: ScenarioConfig = {
  name: "Balanced enterprise",
  feature: "cloud-agent",
  billingRoute: "managed",
  targetCredits: 6_000,
  managed: {
    targetLicense: "business",
    allowanceSchedule: "promotion",
    businessSeats: 100,
    enterpriseSeats: 0,
    businessAllowance: 3_000,
    enterpriseAllowance: 7_000,
    sharedPoolConsumedByOthers: 250_000,
    paidUsageEnabled: true,
    universalUlbUsd: 60,
    individualUlbUsd: null,
    costCenter: {
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
    },
    organizationBudgetApplies: false,
    organizationBudget: { limitUsd: null, spentUsd: 0, stop: false },
    enterpriseBudget: { limitUsd: 2_500, spentUsd: 500, stop: true },
  },
  individual: {
    plan: "pro",
    includedCredits: 1_500,
    additionalUsageBudgetUsd: 25,
    additionalUsageSpentUsd: 0,
  },
  advisory: {
    modelPolicy: "auto",
    sessionLimitCredits: 50,
  },
};

function cloneBase(): ScenarioConfig {
  return structuredClone(baseManaged);
}

function createPreset(
  id: string,
  name: string,
  summary: string,
  update: (config: ScenarioConfig) => void,
): ScenarioPreset {
  const config = cloneBase();
  config.name = name;
  update(config);
  return { id, name, summary, config };
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  createPreset(
    "balanced",
    "Balanced enterprise",
    "Universal ULB plus a hard enterprise backstop.",
    () => undefined,
  ),
  createPreset(
    "no-guardrails",
    "No guardrails",
    "Paid overage is on, with no ULB or hard spending limit.",
    (config) => {
      config.targetCredits = 12_000;
      config.managed.businessSeats = 25;
      config.managed.sharedPoolConsumedByOthers = 74_000;
      config.managed.universalUlbUsd = null;
      config.managed.enterpriseBudget = { limitUsd: null, spentUsd: 0, stop: false };
      config.advisory.modelPolicy = "unrestricted";
      config.advisory.sessionLimitCredits = null;
    },
  ),
  createPreset(
    "included-only",
    "Included usage only",
    "No paid overage; AI-credit features stop when the pool runs out.",
    (config) => {
      config.targetCredits = 8_000;
      config.managed.businessSeats = 20;
      config.managed.sharedPoolConsumedByOthers = 59_000;
      config.managed.paidUsageEnabled = false;
      config.managed.universalUlbUsd = null;
      config.managed.enterpriseBudget = { limitUsd: null, spentUsd: 0, stop: false };
    },
  ),
  createPreset(
    "cost-center",
    "Cost center isolation",
    "Direct assignment, a seat-funded included cap, and hard metered budgets.",
    (config) => {
      config.targetCredits = 9_000;
      config.managed.businessSeats = 100;
      config.managed.enterpriseSeats = 20;
      config.managed.sharedPoolConsumedByOthers = 350_000;
      config.managed.universalUlbUsd = 80;
      config.managed.costCenter = {
        membership: "direct",
        businessSeats: 20,
        enterpriseSeats: 5,
        includedUsageControl: true,
        includedCreditsConsumedByOthers: 90_000,
        includedCapAction: "meter",
        ulbUsd: 100,
        meteredBudget: { limitUsd: 1_000, spentUsd: 300, stop: true },
        excludedFromEnterpriseBudget: false,
        multipleOrganizationLicenses: false,
      };
      config.managed.enterpriseBudget = { limitUsd: 5_000, spentUsd: 1_000, stop: true };
    },
  ),
  createPreset(
    "power-user",
    "Power user override",
    "An individual ULB overrides team and universal defaults.",
    (config) => {
      config.targetCredits = 14_000;
      config.managed.universalUlbUsd = 50;
      config.managed.individualUlbUsd = 150;
      config.managed.costCenter.membership = "direct";
      config.managed.costCenter.ulbUsd = 80;
      config.managed.costCenter.businessSeats = 25;
      config.managed.costCenter.meteredBudget = { limitUsd: 1_500, spentUsd: 250, stop: true };
    },
  ),
  createPreset(
    "individual-pro",
    "Individual Copilot Pro",
    "Included allowance followed by a personal additional-usage budget.",
    (config) => {
      config.billingRoute = "individual";
      config.feature = "chat";
      config.targetCredits = 2_500;
    },
  ),
  createPreset(
    "legacy-annual",
    "Legacy annual Pro+",
    "Premium requests and model multipliers remain controlling until term end.",
    (config) => {
      config.billingRoute = "legacy";
      config.feature = "chat";
      config.targetCredits = 7_000;
      config.individual.plan = "pro-plus";
    },
  ),
];

export function getPreset(id: string): ScenarioPreset {
  return SCENARIO_PRESETS.find((preset) => preset.id === id) ?? SCENARIO_PRESETS[0];
}

export function clonePreset(id: string): ScenarioConfig {
  return structuredClone(getPreset(id).config);
}
