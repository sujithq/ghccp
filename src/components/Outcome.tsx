import { AlertTriangle, Check, Copy, Download, Gauge, ShieldAlert, WalletCards } from "lucide-react";
import type { ScenarioConfig, SimulationResult } from "../domain/scenario";

interface OutcomeProps {
  config: ScenarioConfig;
  result: SimulationResult;
  compact?: boolean;
}

const statusLabels: Record<SimulationResult["status"], string> = {
  "not-billed": "Not AI-credit billed",
  legacy: "Legacy billing",
  included: "Included usage",
  metered: "Paid usage",
  partial: "Partially blocked",
  blocked: "Blocked",
};

function formatCredits(value: number): string {
  return Math.round(value).toLocaleString();
}

function downloadConfig(config: ScenarioConfig) {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${config.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "scenario"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function Outcome({ config, result, compact = false }: OutcomeProps) {
  const servedPercent = result.desiredCredits > 0
    ? Math.min(100, (result.servedCredits / result.desiredCredits) * 100)
    : 0;
  const includedPercent = result.desiredCredits > 0
    ? Math.min(100, (result.includedCredits / result.desiredCredits) * 100)
    : 0;
  const meteredPercent = result.desiredCredits > 0
    ? Math.min(100 - includedPercent, (result.meteredCredits / result.desiredCredits) * 100)
    : 0;

  if (compact) {
    return (
      <aside className={`live-result status-${result.status}`}>
        <span className="live-kicker">Live outcome</span>
        <strong>{statusLabels[result.status]}</strong>
        <p>{result.headline}</p>
        <div className="mini-bar" aria-label={`${Math.round(servedPercent)} percent served`}>
          <span className="included-bar" style={{ width: `${includedPercent}%` }} />
          <span className="metered-bar" style={{ width: `${meteredPercent}%` }} />
        </div>
        <dl>
          <div><dt>Served</dt><dd>{formatCredits(result.servedCredits)}</dd></div>
          <div><dt>Blocked</dt><dd>{formatCredits(result.blockedCredits)}</dd></div>
          <div><dt>Added cost</dt><dd>${result.estimatedAdditionalCostUsd.toFixed(2)}</dd></div>
        </dl>
      </aside>
    );
  }

  async function copySummary() {
    const lines = [
      config.name,
      `${statusLabels[result.status]}: ${result.headline}`,
      `Desired: ${formatCredits(result.desiredCredits)} credits`,
      `Included: ${formatCredits(result.includedCredits)} credits`,
      `Metered: ${formatCredits(result.meteredCredits)} credits ($${result.estimatedAdditionalCostUsd.toFixed(2)})`,
      `Blocked: ${formatCredits(result.blockedCredits)} credits`,
      result.firstHardStop ? `First hard stop: ${result.firstHardStop}` : "First hard stop: none",
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
  }

  return (
    <div className="outcome-full">
      <header className={`outcome-header status-${result.status}`}>
        <div className="status-icon">
          {result.blockedCredits > 0 ? <ShieldAlert /> : <Check />}
        </div>
        <div>
          <span>{statusLabels[result.status]}</span>
          <h2>{result.headline}</h2>
          <p>{result.explanation}</p>
        </div>
        <div className="outcome-actions">
          <button className="icon-button" onClick={() => void copySummary()} title="Copy outcome summary" aria-label="Copy outcome summary">
            <Copy size={18} />
          </button>
          <button className="icon-button" onClick={() => downloadConfig(config)} title="Download scenario JSON" aria-label="Download scenario JSON">
            <Download size={18} />
          </button>
        </div>
      </header>

      <section className="outcome-metrics" aria-label="Simulation totals">
        <div><Gauge /><span>Requested</span><strong>{formatCredits(result.desiredCredits)}</strong><small>AI credits</small></div>
        <div><Check /><span>Included</span><strong>{formatCredits(result.includedCredits)}</strong><small>AI credits</small></div>
        <div><WalletCards /><span>Metered</span><strong>{formatCredits(result.meteredCredits)}</strong><small>${result.estimatedAdditionalCostUsd.toFixed(2)}</small></div>
        <div><ShieldAlert /><span>Blocked</span><strong>{formatCredits(result.blockedCredits)}</strong><small>AI credits</small></div>
      </section>

      {result.desiredCredits > 0 && (
        <section className="allocation-section">
          <div className="allocation-labels">
            <strong>Projected allocation</strong>
            <span>{Math.round(servedPercent)}% served</span>
          </div>
          <div className="allocation-bar">
            <span className="included-bar" style={{ width: `${includedPercent}%` }} />
            <span className="metered-bar" style={{ width: `${meteredPercent}%` }} />
            <span className="blocked-bar" style={{ width: `${100 - includedPercent - meteredPercent}%` }} />
          </div>
          <div className="allocation-legend">
            <span><i className="legend-dot included" />Included</span>
            <span><i className="legend-dot paid" />Metered</span>
            <span><i className="legend-dot blocked" />Blocked</span>
          </div>
        </section>
      )}

      <div className="outcome-columns">
        <section className="path-section">
          <h3>Evaluated path</h3>
          <ol className="path-list">
            {result.path.map((step) => (
              <li key={step.id} className={`path-${step.tone}`}>
                <span className="path-marker" />
                <div><strong>{step.label}</strong><small>{step.detail}</small></div>
              </li>
            ))}
          </ol>
        </section>

        <section className="facts-section">
          <h3>Controlling values</h3>
          <dl className="fact-list">
            <div><dt>Effective ULB</dt><dd>{result.effectiveUlbCredits === null ? "None" : `${formatCredits(result.effectiveUlbCredits)} credits`}</dd></div>
            <div><dt>Shared pool</dt><dd>{result.poolCredits === null ? "Not applicable" : `${formatCredits(result.poolCredits)} credits`}</dd></div>
            <div><dt>Cost center cap</dt><dd>{result.costCenterIncludedCapCredits === null ? "Not applied" : `${formatCredits(result.costCenterIncludedCapCredits)} credits`}</dd></div>
            <div><dt>First hard stop</dt><dd>{result.firstHardStop ?? "None projected"}</dd></div>
          </dl>
        </section>
      </div>

      {result.warnings.length > 0 && (
        <section className="warnings-section">
          <h3><AlertTriangle size={18} /> Review before rollout</h3>
          <ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </section>
      )}
    </div>
  );
}
