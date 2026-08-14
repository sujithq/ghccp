import { useEffect, useState } from "react";
import { Download, ExternalLink, GitBranch, LoaderCircle } from "lucide-react";
import { DECISION_FLOW } from "../content/decisionFlow";
import { SectionHeading } from "./Controls";

export function DecisionFlow() {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        fontFamily: "IBM Plex Sans, sans-serif",
        flowchart: { curve: "basis", htmlLabels: true, nodeSpacing: 28, rankSpacing: 42 },
        themeVariables: {
          fontSize: "14px",
          lineColor: "#59636e",
          primaryColor: "#f6f8fa",
          primaryBorderColor: "#8c959f",
          primaryTextColor: "#1f2328",
        },
      });

      return mermaid.render(`credit-flow-${crypto.randomUUID()}`, DECISION_FLOW);
    }).then((rendered) => {
      if (!cancelled) setSvg(rendered.svg);
    }).catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to render diagram");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function downloadSvg() {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "copilot-ai-credit-decision-flow.svg";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="content-page flow-page">
      <SectionHeading
        eyebrow="Decision map"
        title="Every route from intent to outcome"
        description="The evaluated order is feature, billing family, per-user cap, included pool, paid policy, then scoped spending limits."
        aside={
          <button className="button secondary" onClick={downloadSvg} disabled={!svg}>
            <Download size={17} /> Download SVG
          </button>
        }
      />

      <div className="flow-legend" aria-label="Diagram legend">
        <span><i className="legend-dot decision" />Decision</span>
        <span><i className="legend-dot included" />Included</span>
        <span><i className="legend-dot paid" />Paid usage</span>
        <span><i className="legend-dot blocked" />Hard stop</span>
      </div>

      <section className="diagram-shell" aria-label="AI credit billing decision diagram">
        {!svg && !error && (
          <div className="diagram-loading"><LoaderCircle className="spin" /> Rendering decision map</div>
        )}
        {error && <div className="notice danger"><strong>Diagram error</strong><span>{error}</span></div>}
        {svg && <div className="mermaid-output" dangerouslySetInnerHTML={{ __html: svg }} />}
      </section>

      <div className="flow-footnotes">
        <section>
          <GitBranch size={19} />
          <div>
            <strong>Cost-center branch</strong>
            <p>Direct assignment is the predictable route. Included controls isolate the seat-funded pool; metered budgets govern overage.</p>
          </div>
        </section>
        <section>
          <ExternalLink size={19} />
          <div>
            <strong>Control interaction</strong>
            <p>ULBs always stop. Other budgets only stop when the toggle is enabled; cost-center exclusion bypasses the enterprise cap.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
