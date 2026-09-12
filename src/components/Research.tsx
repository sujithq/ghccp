import { CalendarClock, ExternalLink, Info, Scale } from "lucide-react";
import { SectionHeading } from "./Controls";

const sources = [
  ["Billing for organizations and enterprises", "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing"],
  ["Budgets for usage-based billing", "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/budgets"],
  ["Setting up budgets", "https://docs.github.com/en/billing/how-tos/set-up-budgets"],
  ["Budget alerts and creation dates", "https://docs.github.com/en/billing/concepts/budgets-and-alerts"],
  ["Cost-center allocation", "https://docs.github.com/en/billing/reference/cost-center-allocation"],
  ["Optimizing budget configuration", "https://docs.github.com/en/copilot/tutorials/budgets/optimizing-your-budget-configuration"],
  ["Billing for individuals", "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"],
  ["Plans for GitHub Copilot", "https://docs.github.com/en/copilot/get-started/plans"],
  ["Models and pricing", "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing"],
  ["Legacy billing changes", "https://docs.github.com/en/copilot/reference/copilot-billing/request-based-billing-legacy/what-changed-with-billing"],
] as const;

export function Research() {
  return (
    <main className="content-page research-page">
      <SectionHeading
        eyebrow="Source notes"
        title="Rules behind the simulator"
        description="Billing rules checked against published GitHub Docs on September 12, 2026. Forecast assumptions are separate from live enforcement."
      />

      <section className="date-banner">
        <CalendarClock />
        <div>
          <strong>September uses standard managed allowances</strong>
          <p>Business includes 1,900 credits per seat and Enterprise 3,900. The 3,000 / 7,000 promotion ended August 31 for eligible pre-June customers.</p>
        </div>
      </section>

      <section className="research-grid">
        <article>
          <span className="research-icon"><Scale /></span>
          <h2>Core unit</h2>
          <strong className="large-fact">1 credit = $0.01</strong>
          <p>Interaction cost depends on model plus input, cached input, cache-write, and output tokens.</p>
        </article>
        <article>
          <span className="research-icon"><Info /></span>
          <h2>Evaluation order</h2>
          <ol>
            <li>Effective ULB</li>
            <li>Cost-center included control</li>
            <li>Shared pool</li>
            <li>Paid-usage policy</li>
            <li>Scoped and enterprise budgets</li>
          </ol>
        </article>
        <article>
          <span className="research-icon"><ExternalLink /></span>
          <h2>Blocking behavior</h2>
          <p>ULBs always stop. Positive spending budgets stop only with Stop usage on; alerts require opt-in. For $0 budgets, the planner conservatively assumes a stop even when the toggle is off because GitHub documentation conflicts. Additional usage requires account authorization.</p>
        </article>
      </section>

      <section className="plan-table-section">
        <div className="subheading">
          <span className="eyebrow">Editable presets</span>
          <h2>Documented monthly allowances</h2>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>License</th><th>Price</th><th>Standard credits</th><th>Eligible Aug 2026 promo</th></tr></thead>
            <tbody>
              <tr><td>Copilot Pro</td><td>$10</td><td>1,500</td><td>Not applicable</td></tr>
              <tr><td>Copilot Pro+</td><td>$39</td><td>7,000</td><td>Not applicable</td></tr>
              <tr><td>Copilot Max</td><td>$100</td><td>20,000</td><td>Not applicable</td></tr>
              <tr><td>Copilot Business</td><td>$19 / seat</td><td>1,900 / seat</td><td>3,000 / seat*</td></tr>
              <tr><td>Copilot Enterprise</td><td>$39 / seat</td><td>3,900 / seat</td><td>7,000 / seat*</td></tr>
              <tr><td>Free / Student</td><td>$0</td><td>Not published</td><td>Enter from account</td></tr>
            </tbody>
          </table>
        </div>
        <p className="table-note">Personal totals include variable flex credits, checked September 12, 2026. * Historical managed promotion only for customers already using Copilot before June 1, 2026; ended at the September 1 UTC reset.</p>
      </section>

      <section className="source-section">
        <div className="subheading">
          <span className="eyebrow">Official references</span>
          <h2>GitHub documentation</h2>
        </div>
        <div className="source-list">
          {sources.map(([label, url]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              <span>{label}</span><ExternalLink size={16} />
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
