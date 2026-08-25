export const CREDIT_PRICE_USD = 0.01;
export const CREDITS_PER_DOLLAR = 1 / CREDIT_PRICE_USD;

export type BillingRoute = "managed" | "individual" | "legacy";
export type FeatureKind =
  | "chat"
  | "cli"
  | "cloud-agent"
  | "code-review"
  | "completions"
  | "next-edits"
  | "other-ai";
export type IndividualPlan = "free" | "student" | "pro" | "pro-plus" | "max";
export type ManagedLicense = "business" | "enterprise";
export type AllowanceSchedule = "promotion" | "standard" | "custom";
export type CostCenterMembership = "none" | "direct" | "organization" | "enterprise-team";
export type IncludedCapAction = "block" | "meter";
export type ModelPolicy = "unrestricted" | "approved-only" | "auto";

export interface SpendingBudget {
  limitUsd: number | null;
  spentUsd: number;
  stop: boolean;
}

export interface CostCenterConfig {
  membership: CostCenterMembership;
  businessSeats: number;
  enterpriseSeats: number;
  includedUsageControl: boolean;
  includedCreditsConsumedByOthers: number;
  includedCapAction: IncludedCapAction;
  ulbUsd: number | null;
  meteredBudget: SpendingBudget;
  excludedFromEnterpriseBudget: boolean;
  multipleOrganizationLicenses: boolean;
}

export interface ManagedConfig {
  targetLicense: ManagedLicense;
  allowanceSchedule: AllowanceSchedule;
  businessSeats: number;
  enterpriseSeats: number;
  businessAllowance: number;
  enterpriseAllowance: number;
  sharedPoolConsumedByOthers: number;
  paidUsageEnabled: boolean;
  universalUlbUsd: number | null;
  individualUlbUsd: number | null;
  costCenter: CostCenterConfig;
  organizationBudgetApplies: boolean;
  organizationBudget: SpendingBudget;
  enterpriseBudget: SpendingBudget;
}

export interface IndividualConfig {
  plan: IndividualPlan;
  includedCredits: number;
  additionalUsageEligible: boolean;
  additionalUsageBudgetUsd: number | null;
  additionalUsageSpentUsd: number;
}

export interface AdvisoryControls {
  modelPolicy: ModelPolicy;
  sessionLimitCredits: number | null;
}

export interface ScenarioConfig {
  name: string;
  feature: FeatureKind;
  billingRoute: BillingRoute;
  targetCredits: number;
  managed: ManagedConfig;
  individual: IndividualConfig;
  advisory: AdvisoryControls;
}

export type OutcomeStatus =
  | "not-billed"
  | "legacy"
  | "included"
  | "metered"
  | "partial"
  | "blocked";

export type PathTone = "passed" | "active" | "warning" | "blocked" | "skipped";

export interface PathStep {
  id: string;
  label: string;
  detail: string;
  tone: PathTone;
}

export interface SimulationResult {
  status: OutcomeStatus;
  headline: string;
  explanation: string;
  desiredCredits: number;
  servedCredits: number;
  includedCredits: number;
  meteredCredits: number;
  blockedCredits: number;
  estimatedAdditionalCostUsd: number;
  poolCredits: number | null;
  poolRemainingBeforeUser: number | null;
  effectiveUlbCredits: number | null;
  effectiveUlbSource: string | null;
  costCenterIncludedCapCredits: number | null;
  firstHardStop: string | null;
  uncappedMeteredExposure: boolean;
  warnings: string[];
  path: PathStep[];
}

export function emptyBudget(): SpendingBudget {
  return { limitUsd: null, spentUsd: 0, stop: false };
}
