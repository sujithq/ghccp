import decisionFlowDocument from "../../docs/decision-flow.md?raw";

const diagram = /^```mermaid\r?\n([\s\S]*?)^```/m.exec(decisionFlowDocument);
if (!diagram) throw new Error("The decision-flow document must contain a Mermaid diagram.");

export const DECISION_FLOW = diagram[1].trim();
