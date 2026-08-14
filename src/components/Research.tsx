import { CalendarClock, ExternalLink, Info, Scale } from "lucide-react";
import { SectionHeading } from "./Controls";

const sources = [
  ["Billing for organizations and enterprises", "https://docs.github.com/en/copilot/concepts/billing/usage-based-billing-for-organizations-and-enterprises"],
  ["Budgets for usage-based billing", "https://docs.github.com/en/copilot/concepts/billing/budgets-for-usage-based-billing"],
  ["Optimizing budget configuration", "https://docs.github.com/en/copilot/tutorials/budgets/optimizing-your-budget-configuration"],
  ["Billing for individuals", "https://docs.github.com/en/copilot/concepts/billing/usage-based-billing-for-individuals"],
  ["Models and pricing", "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing"],
  ["Legacy billing changes", "https://docs.github.com/en/copilot/reference/copilot-billing/request-based-billing-legacy/what-changed-with-billing"],
] as const;

export function Research() {
  return (
    <main className="content-page research-page">
      <SectionHeading
        eyebrow="Source notes"
        title="Rules behind the simulator"
        description="Verified against the current published GitHub Docs and the public github/docs source on August 14, 2026."
      />

      <section className="date-banner">
        <CalendarClock />
        <div>
          <strong>Current transition window</strong>
          <p>Existing Business and Enterprise customers retain promotional allowances through August 31, 2026. Standard allowances resume September 1.</p>
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
          <p>ULBs always stop usage. Cost-center, organization, and enterprise budgets only stop with the toggle enabled. There is no automatic cheaper-model fallback.</p>
        </article>
      </section>

      <section className="plan-table-section">
        <div className="subheading">
          <span className="eyebrow">Editable presets</span>
          <h2>Documented monthly allowances</h2>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>License</th><th>Price</th><th>Standard credits</th><th>August 2026</th></tr></thead>
            <tbody>
              <tr><td>Copilot Pro</td><td>$10</td><td>1,500</td><td>1,500</td></tr>
              <tr><td>Copilot Pro+</td><td>$39</td><td>7,000</td><td>7,000</td></tr>
              <tr><td>Copilot Max</td><td>$100</td><td>20,000</td><td>20,000</td></tr>
              <tr><td>Copilot Business</td><td>$19 / seat</td><td>1,900 / seat</td><td>3,000 / seat*</td></tr>
              <tr><td>Copilot Enterprise</td><td>$39 / seat</td><td>3,900 / seat</td><td>7,000 / seat*</td></tr>
              <tr><td>Free / Student</td><td>$0</td><td>Not published</td><td>Enter from account</td></tr>
            </tbody>
          </table>
        </div>
        <p className="table-note">* Promotional amount for customers already using Copilot before June 1, 2026.</p>
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
