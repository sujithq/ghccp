import { startTransition, useDeferredValue, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CircleDollarSign,
  GitFork,
  RefreshCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import { clonePreset, SCENARIO_PRESETS } from "../domain/presets";
import type {
  AllowanceSchedule,
  BillingRoute,
  CostCenterMembership,
  FeatureKind,
  IncludedCapAction,
  IndividualPlan,
  ModelPolicy,
  ScenarioConfig,
} from "../domain/scenario";
import { simulateScenario } from "../domain/simulator";
import { NumberField, SectionHeading, Segmented, SelectField, TextField, Toggle } from "./Controls";
import { Outcome } from "./Outcome";

const steps = [
  { label: "Scenario", icon: Sparkles },
  { label: "Allowance", icon: CircleDollarSign },
  { label: "Cost center", icon: Building2 },
  { label: "Guardrails", icon: ShieldCheck },
  { label: "Outcome", icon: GitFork },
];

const individualAllowances: Record<IndividualPlan, number> = {
  free: 0,
  student: 0,
  pro: 1_500,
  "pro-plus": 7_000,
  max: 20_000,
};

function updateManagedSchedule(config: ScenarioConfig, schedule: AllowanceSchedule) {
  config.managed.allowanceSchedule = schedule;
  if (schedule === "promotion") {
    config.managed.businessAllowance = 3_000;
    config.managed.enterpriseAllowance = 7_000;
  }
  if (schedule === "standard") {
    config.managed.businessAllowance = 1_900;
    config.managed.enterpriseAllowance = 3_900;
  }
}

interface WizardProps {
  initialPresetId: string;
}

export function Wizard({ initialPresetId }: WizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [presetId, setPresetId] = useState(initialPresetId);
  const [customized, setCustomized] = useState(false);
  const [config, setConfig] = useState<ScenarioConfig>(() => {
    const stored = localStorage.getItem("copilot-credit-planner-scenario");
    if (!stored) return clonePreset(initialPresetId);
    try {
      const restored = JSON.parse(stored) as ScenarioConfig;
      if (restored.individual.additionalUsageStop === undefined) {
        restored.individual.additionalUsageStop = true;
        if (restored.individual.additionalUsageBudgetUsd === null) {
          restored.individual.additionalUsageEligible = false;
        }
      }
      return restored;
    } catch {
      return clonePreset(initialPresetId);
    }
  });
  const deferredConfig = useDeferredValue(config);
  const result = simulateScenario(deferredConfig);

  useEffect(() => {
    localStorage.setItem("copilot-credit-planner-scenario", JSON.stringify(config));
  }, [config]);

  function edit(update: (draft: ScenarioConfig) => void) {
    setConfig((current) => {
      const next = structuredClone(current);
      update(next);
      return next;
    });
    setCustomized(true);
  }

  function applyPreset(id: string) {
    startTransition(() => {
      setPresetId(id);
      setConfig(clonePreset(id));
      setCustomized(false);
      setActiveStep(0);
    });
  }

  function renderScenarioStep() {
    return (
      <>
        <SectionHeading
          eyebrow="Step 1 of 5"
          title="Set the consumption scenario"
          description="Choose a starting pattern, then adjust every value to match the account and expected monthly demand."
          aside={<span className={customized ? "preset-state custom" : "preset-state"}>{customized ? "Customized" : "Preset values"}</span>}
        />

        <section className="preset-section">
          <div className="subheading"><h2>Starting patterns</h2><p>Applying a preset replaces the current scenario.</p></div>
          <div className="preset-grid">
            {SCENARIO_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className={presetId === preset.id && !customized ? "preset-card selected" : "preset-card"}
                onClick={() => applyPreset(preset.id)}
              >
                <span>{preset.name}</span>
                <small>{preset.summary}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="form-section">
          <div className="field-grid two">
            <TextField label="Scenario name" value={config.name} onChange={(value) => edit((draft) => { draft.name = value; })} />
            <NumberField
              label="Desired monthly consumption"
              value={config.targetCredits}
              suffix="credits"
              onChange={(value) => edit((draft) => { draft.targetCredits = value ?? 0; })}
              help={`Normalized value: $${(config.targetCredits * 0.01).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
          </div>

          <Segmented<BillingRoute>
            label="Billing family"
            value={config.billingRoute}
            onChange={(value) => edit((draft) => { draft.billingRoute = value; })}
            options={[
              { value: "managed", label: "Business / Enterprise", description: "Pooled credits" },
              { value: "individual", label: "Individual UBB", description: "Personal allowance" },
              { value: "legacy", label: "Legacy annual", description: "Premium requests" },
            ]}
          />

          <SelectField<FeatureKind>
            label="Copilot activity"
            value={config.feature}
            onChange={(value) => edit((draft) => { draft.feature = value; })}
            options={[
              { value: "chat", label: "Copilot Chat" },
              { value: "cli", label: "Copilot CLI" },
              { value: "cloud-agent", label: "Cloud agent / agent mode" },
              { value: "code-review", label: "Copilot code review" },
              { value: "other-ai", label: "Spaces, Spark, or third-party agent" },
              { value: "completions", label: "Code completions" },
              { value: "next-edits", label: "Next edit suggestions" },
            ]}
          />
        </section>
      </>
    );
  }

  function renderAllowanceStep() {
    if (config.billingRoute === "legacy") {
      return (
        <>
          <SectionHeading eyebrow="Step 2 of 5" title="Legacy annual billing" description="AI credits do not control this annual term." />
          <div className="notice warning"><strong>Premium-request path</strong><span>Use the plan's premium request allowance and model multipliers until the term ends. The account then downgrades to Free unless it moves to a monthly plan.</span></div>
        </>
      );
    }

    if (config.billingRoute === "individual") {
      return (
        <>
          <SectionHeading eyebrow="Step 2 of 5" title="Set the individual allowance" description="Paid-plan base and variable flex totals were checked September 12, 2026. Free and Student have account-specific allowances." />
          <section className="form-section">
            <Segmented<IndividualPlan>
              label="Individual plan"
              value={config.individual.plan}
              onChange={(value) => edit((draft) => {
                draft.individual.plan = value;
                draft.individual.includedCredits = individualAllowances[value];
              })}
              options={[
                { value: "free", label: "Free" },
                { value: "student", label: "Student" },
                { value: "pro", label: "Pro" },
                { value: "pro-plus", label: "Pro+" },
                { value: "max", label: "Max" },
              ]}
            />
            <NumberField
              label="Included monthly allowance"
              value={config.individual.includedCredits}
              suffix="credits"
              onChange={(value) => edit((draft) => { draft.individual.includedCredits = value ?? 0; })}
              help="Base and flex credits combined; editable for account-specific values."
            />
          </section>
        </>
      );
    }

    const pool = config.managed.businessSeats * config.managed.businessAllowance
      + config.managed.enterpriseSeats * config.managed.enterpriseAllowance;

    return (
      <>
        <SectionHeading
          eyebrow="Step 2 of 5"
          title="Build the shared allowance"
          description="Business and Enterprise seats can share one billing-entity pool. Seat additions apply immediately; removals apply next cycle."
        />
        <section className="form-section">
          <Segmented<AllowanceSchedule>
            label="Allowance schedule"
            value={config.managed.allowanceSchedule}
            onChange={(value) => edit((draft) => updateManagedSchedule(draft, value))}
            options={[
              { value: "promotion", label: "Eligible Aug promo", description: "Pre-Jun 1 customers" },
              { value: "standard", label: "Standard", description: "Default / Sep 1+" },
              { value: "custom", label: "Custom", description: "Account value" },
            ]}
          />

          {config.managed.allowanceSchedule === "promotion" && (
            <div className="notice warning"><strong>Temporary eligibility</strong><span>3,000 / 7,000 credits apply only to customers already using Copilot before June 1, 2026, through August 31. The September 1 UTC reset uses standard amounts.</span></div>
          )}

          <div className="field-grid four">
            <NumberField label="Business seats" value={config.managed.businessSeats} onChange={(value) => edit((draft) => { draft.managed.businessSeats = value ?? 0; })} />
            <NumberField label="Credits / Business seat" value={config.managed.businessAllowance} onChange={(value) => edit((draft) => { draft.managed.businessAllowance = value ?? 0; draft.managed.allowanceSchedule = "custom"; })} />
            <NumberField label="Enterprise seats" value={config.managed.enterpriseSeats} onChange={(value) => edit((draft) => { draft.managed.enterpriseSeats = value ?? 0; })} />
            <NumberField label="Credits / Enterprise seat" value={config.managed.enterpriseAllowance} onChange={(value) => edit((draft) => { draft.managed.enterpriseAllowance = value ?? 0; draft.managed.allowanceSchedule = "custom"; })} />
          </div>

          <div className="calculation-strip">
            <span>Calculated shared pool</span>
            <strong>{pool.toLocaleString()} credits</strong>
            <small>${(pool * 0.01).toLocaleString()} included value</small>
          </div>

          <div className="field-grid two">
            <NumberField
              label="Pool consumed by everyone else"
              value={config.managed.sharedPoolConsumedByOthers}
              suffix="credits"
              onChange={(value) => edit((draft) => { draft.managed.sharedPoolConsumedByOthers = value ?? 0; })}
              help="Exclude the target user's desired consumption."
            />
            <SelectField
              label="Target user's license"
              value={config.managed.targetLicense}
              onChange={(value) => edit((draft) => { draft.managed.targetLicense = value; })}
              options={[
                { value: "business", label: "Copilot Business" },
                { value: "enterprise", label: "Copilot Enterprise" },
              ]}
            />
          </div>
        </section>
      </>
    );
  }

  function renderCostCenterStep() {
    if (config.billingRoute !== "managed") {
      return (
        <>
          <SectionHeading eyebrow="Step 3 of 5" title="Cost centers do not apply" description="Cost-center pool isolation and metered allocation are available for managed Business and Enterprise billing." />
          <div className="empty-state"><Building2 /><strong>No managed billing entity</strong><span>Continue to account-level controls.</span></div>
        </>
      );
    }

    const costCenter = config.managed.costCenter;
    const cap = costCenter.businessSeats * config.managed.businessAllowance
      + costCenter.enterpriseSeats * config.managed.enterpriseAllowance;

    return (
      <>
        <SectionHeading
          eyebrow="Step 3 of 5"
          title="Route usage through a cost center"
          description="Direct assignments keep allocation predictable. Included controls and metered budgets govern different phases."
        />
        <section className="form-section">
          <Segmented<CostCenterMembership>
            label="Cost-center assignment"
            value={costCenter.membership}
            onChange={(value) => edit((draft) => { draft.managed.costCenter.membership = value; })}
            options={[
              { value: "none", label: "None" },
              { value: "direct", label: "Direct user", description: "Recommended" },
              { value: "organization", label: "Organization" },
              { value: "enterprise-team", label: "Enterprise team" },
            ]}
          />

          {costCenter.membership === "none" ? (
            <div className="notice neutral"><strong>Enterprise or organization route</strong><span>Without a cost center, metered usage follows a billing-organization budget when one applies, otherwise the enterprise limit.</span></div>
          ) : (
            <>
              <div className="field-grid two">
                <NumberField label="Business seats in cost center" value={costCenter.businessSeats} onChange={(value) => edit((draft) => { draft.managed.costCenter.businessSeats = value ?? 0; })} />
                <NumberField label="Enterprise seats in cost center" value={costCenter.enterpriseSeats} onChange={(value) => edit((draft) => { draft.managed.costCenter.enterpriseSeats = value ?? 0; })} />
              </div>

              <Toggle
                label="Included usage control"
                checked={costCenter.includedUsageControl}
                onChange={(checked) => edit((draft) => { draft.managed.costCenter.includedUsageControl = checked; })}
                description="Cap this team's pool draw at the credits funded by its own seats."
              />

              {costCenter.includedUsageControl && (
                <div className="indented-controls">
                  <div className="calculation-strip compact">
                    <span>Automatic included cap</span><strong>{cap.toLocaleString()} credits</strong><small>Mixed licenses included</small>
                  </div>
                  <div className="field-grid two">
                    <NumberField
                      label="Cap consumed by other members"
                      value={costCenter.includedCreditsConsumedByOthers}
                      suffix="credits"
                      onChange={(value) => edit((draft) => { draft.managed.costCenter.includedCreditsConsumedByOthers = value ?? 0; })}
                    />
                    <Segmented<IncludedCapAction>
                      label="At the included cap"
                      value={costCenter.includedCapAction}
                      onChange={(value) => edit((draft) => { draft.managed.costCenter.includedCapAction = value; })}
                      options={[
                        { value: "block", label: "Block team" },
                        { value: "meter", label: "Paid overage" },
                      ]}
                    />
                  </div>
                </div>
              )}

              <div className="subsection-divider"><span>Per-member and metered controls</span></div>
              <div className="field-grid three">
                <NumberField
                  label="Cost center ULB"
                  value={costCenter.ulbUsd}
                  suffix="USD / member"
                  optional
                  onChange={(value) => edit((draft) => { draft.managed.costCenter.ulbUsd = value; })}
                  help="Overrides the universal ULB."
                />
                <NumberField
                  label="Metered budget"
                  value={costCenter.meteredBudget.limitUsd}
                  suffix="USD"
                  optional
                  onChange={(value) => edit((draft) => { draft.managed.costCenter.meteredBudget.limitUsd = value; })}
                />
                <NumberField
                  label="Metered spend to date"
                  value={costCenter.meteredBudget.spentUsd}
                  suffix="USD"
                  onChange={(value) => edit((draft) => { draft.managed.costCenter.meteredBudget.spentUsd = value ?? 0; })}
                  help="Spend tracked by this budget since creation in the current cycle, excluding the demand being projected."
                />
              </div>
              <Toggle
                label="Stop usage at cost-center budget"
                checked={costCenter.meteredBudget.stop}
                onChange={(checked) => edit((draft) => { draft.managed.costCenter.meteredBudget.stop = checked; })}
                description="Off means alert-only for positive budgets. For $0, the planner assumes a hard stop; GitHub documentation conflicts."
              />
              <Toggle
                label="Exclude from enterprise budget"
                checked={costCenter.excludedFromEnterpriseBudget}
                onChange={(checked) => edit((draft) => { draft.managed.costCenter.excludedFromEnterpriseBudget = checked; })}
                description="Metered charges are constrained only by this cost center's budget."
              />
              <Toggle
                label="User has licenses through multiple organizations"
                checked={costCenter.multipleOrganizationLicenses}
                onChange={(checked) => edit((draft) => { draft.managed.costCenter.multipleOrganizationLicenses = checked; })}
                description="Flags potentially unpredictable billing-organization allocation."
              />
            </>
          )}
        </section>
      </>
    );
  }

  function renderGuardrailsStep() {
    if (config.billingRoute === "legacy") {
      return (
        <>
          <SectionHeading eyebrow="Step 4 of 5" title="UBB guardrails do not apply" description="Premium request allowances and model multipliers remain controlling for the legacy annual term." />
          <div className="empty-state"><Settings2 /><strong>No AI-credit budget path</strong><span>Review the legacy premium-request documentation for this subscription.</span></div>
        </>
      );
    }

    if (config.billingRoute === "individual") {
      const additionalUsageEligible = config.individual.additionalUsageEligible === true;
      return (
        <>
          <SectionHeading eyebrow="Step 4 of 5" title="Set personal overage controls" description="Included credits are used before the additional-usage budget." />
          <section className="form-section">
            <Toggle
              label="Additional usage authorized for this account"
              checked={additionalUsageEligible}
              onChange={(checked) => edit((draft) => { draft.individual.additionalUsageEligible = checked; })}
              description="Supplied account state, not inferred from a budget or subscription history. Payment and service limits still apply."
            />
            {additionalUsageEligible ? (
              <>
                <div className="field-grid two">
                  <NumberField label="Additional-usage budget" value={config.individual.additionalUsageBudgetUsd} suffix="USD" optional onChange={(value) => edit((draft) => { draft.individual.additionalUsageBudgetUsd = value; })} help="No configured budget adds no spending cap; it does not authorize additional usage." />
                  <NumberField label="Additional spend to date" value={config.individual.additionalUsageSpentUsd} suffix="USD" onChange={(value) => edit((draft) => { draft.individual.additionalUsageSpentUsd = value ?? 0; })} help="Spend tracked by this budget since creation in the current cycle, excluding the demand being projected." />
                </div>
                <Toggle
                  label="Stop usage at personal budget"
                  checked={config.individual.additionalUsageStop !== false}
                  disabled={config.individual.additionalUsageBudgetUsd === null}
                  onChange={(checked) => edit((draft) => { draft.individual.additionalUsageStop = checked; })}
                  description="Off means alert-only for positive budgets. For $0, the planner assumes a hard stop; GitHub documentation conflicts."
                />
              </>
            ) : (
              <div className="notice warning"><strong>Additional usage not authorized</strong><span>Only included credits are projected. Further usage requires account authorization, an eligible upgrade, or the next monthly reset.</span></div>
            )}
            <AdvisoryControls config={config} edit={edit} />
          </section>
        </>
      );
    }

    const hasCostCenter = config.managed.costCenter.membership !== "none";
    return (
      <>
        <SectionHeading
          eyebrow="Step 4 of 5"
          title="Set enterprise guardrails"
          description="Per-user budgets govern pool and paid phases. Scoped spending budgets govern paid usage only."
        />
        <section className="form-section">
          <Toggle
            label="AI credit paid usage"
            checked={config.managed.paidUsageEnabled}
            onChange={(checked) => edit((draft) => { draft.managed.paidUsageEnabled = checked; })}
            description="Enabled by default. Off blocks AI-credit usage after the included pool or cost-center allocation runs out."
          />

          <div className="subsection-divider"><span>User-level budgets</span></div>
          <div className="field-grid two">
            <NumberField
              label="Universal ULB"
              value={config.managed.universalUlbUsd}
              suffix="USD / user"
              optional
              onChange={(value) => edit((draft) => { draft.managed.universalUlbUsd = value; })}
              help="Applies to every licensed user unless overridden. Always a hard stop."
            />
            <NumberField
              label="Active individual ULB override"
              value={config.managed.individualUlbUsd}
              suffix="USD"
              optional
              onChange={(value) => edit((draft) => { draft.managed.individualUlbUsd = value; })}
              help="Only unexpired overrides apply. After expiry, the cost-center or universal ULB applies."
            />
          </div>

          <div className="subsection-divider"><span>Organization route</span></div>
          <Toggle
            label="Billing organization has a budget"
            checked={config.managed.organizationBudgetApplies}
            disabled={hasCostCenter}
            onChange={(checked) => edit((draft) => { draft.managed.organizationBudgetApplies = checked; })}
            description={hasCostCenter ? "The direct cost-center route takes precedence for this scenario." : "Applies when the user is outside a cost center."}
          />
          {config.managed.organizationBudgetApplies && !hasCostCenter && (
            <div className="indented-controls">
              <div className="field-grid two">
                <NumberField label="Organization budget" value={config.managed.organizationBudget.limitUsd} suffix="USD" optional onChange={(value) => edit((draft) => { draft.managed.organizationBudget.limitUsd = value; })} />
                <NumberField label="Organization spend to date" value={config.managed.organizationBudget.spentUsd} suffix="USD" onChange={(value) => edit((draft) => { draft.managed.organizationBudget.spentUsd = value ?? 0; })} help="Spend tracked since budget creation this cycle, excluding the demand being projected." />
              </div>
              <Toggle label="Stop usage at organization budget" checked={config.managed.organizationBudget.stop} onChange={(checked) => edit((draft) => { draft.managed.organizationBudget.stop = checked; })} description="Off means alert-only for positive budgets. For $0, the planner assumes a hard stop; GitHub documentation conflicts." />
            </div>
          )}

          <div className="subsection-divider"><span>Enterprise backstop</span></div>
          <div className="field-grid two">
            <NumberField label="Enterprise metered budget" value={config.managed.enterpriseBudget.limitUsd} suffix="USD" optional onChange={(value) => edit((draft) => { draft.managed.enterpriseBudget.limitUsd = value; })} />
            <NumberField label="Enterprise spend to date" value={config.managed.enterpriseBudget.spentUsd} suffix="USD" onChange={(value) => edit((draft) => { draft.managed.enterpriseBudget.spentUsd = value ?? 0; })} help="Spend tracked since budget creation this cycle, excluding the demand being projected." />
          </div>
          <Toggle
            label="Stop usage at enterprise budget"
            checked={config.managed.enterpriseBudget.stop}
            onChange={(checked) => edit((draft) => { draft.managed.enterpriseBudget.stop = checked; })}
            description="Off means alert-only for positive budgets. For $0, the planner assumes a hard stop; GitHub documentation conflicts. License fees are separate."
          />

          <AdvisoryControls config={config} edit={edit} />
        </section>
      </>
    );
  }

  function renderStep() {
    if (activeStep === 0) return renderScenarioStep();
    if (activeStep === 1) return renderAllowanceStep();
    if (activeStep === 2) return renderCostCenterStep();
    if (activeStep === 3) return renderGuardrailsStep();
    return (
      <>
        <SectionHeading eyebrow="Step 5 of 5" title={config.name || "Scenario outcome"} description="Projected from the current monthly demand, remaining allowance, and applicable hard-stop controls." />
        <Outcome config={config} result={result} />
      </>
    );
  }

  return (
    <div className="wizard-layout">
      <nav className="wizard-steps" aria-label="Wizard steps">
        <div className="step-heading"><span>Scenario builder</span><strong>{activeStep + 1} / {steps.length}</strong></div>
        <ol>
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.label}>
                <button className={index === activeStep ? "active" : index < activeStep ? "complete" : ""} onClick={() => setActiveStep(index)}>
                  <span className="step-number">{index < activeStep ? "✓" : index + 1}</span>
                  <Icon size={17} />
                  <span>{step.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <button className="reset-button" onClick={() => applyPreset(presetId)}><RefreshCcw size={15} /> Reset preset</button>
      </nav>

      <main className="wizard-main">
        <div className="wizard-content">{renderStep()}</div>
        <footer className="wizard-footer">
          <button className="button secondary" disabled={activeStep === 0} onClick={() => setActiveStep((step) => Math.max(0, step - 1))}><ArrowLeft size={17} /> Back</button>
          {activeStep < steps.length - 1 ? (
            <button className="button primary" onClick={() => setActiveStep((step) => Math.min(steps.length - 1, step + 1))}>Continue <ArrowRight size={17} /></button>
          ) : (
            <button className="button primary" onClick={() => setActiveStep(0)}>New pass <RefreshCcw size={17} /></button>
          )}
        </footer>
      </main>

      {activeStep < 4 && <Outcome config={config} result={result} compact />}
    </div>
  );
}

interface AdvisoryControlsProps {
  config: ScenarioConfig;
  edit: (update: (draft: ScenarioConfig) => void) => void;
}

function AdvisoryControls({ config, edit }: AdvisoryControlsProps) {
  return (
    <>
      <div className="subsection-divider"><span>Advisory controls</span></div>
      <div className="field-grid two">
        <SelectField<ModelPolicy>
          label="Model policy"
          value={config.advisory.modelPolicy}
          onChange={(value) => edit((draft) => { draft.advisory.modelPolicy = value; })}
          options={[
            { value: "unrestricted", label: "All available models" },
            { value: "approved-only", label: "Approved lower-cost set" },
            { value: "auto", label: "Auto model selection" },
          ]}
          help="A cost-control signal, not a deterministic credit cap."
        />
        <NumberField
          label="CLI / SDK session limit"
          value={config.advisory.sessionLimitCredits}
          suffix="credits"
          optional
          onChange={(value) => edit((draft) => { draft.advisory.sessionLimitCredits = value; })}
          help="Soft limit; an in-flight model response can exceed it."
        />
      </div>
    </>
  );
}
