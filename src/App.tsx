import { useState } from "react";
import { BookOpen, GitBranch, Github, PanelLeft, WandSparkles, X } from "lucide-react";
import { DecisionFlow } from "./components/DecisionFlow";
import { Research } from "./components/Research";
import { Wizard } from "./components/Wizard";

type View = "wizard" | "flow" | "research";

export default function App() {
  const [view, setView] = useState<View>("wizard");
  const [mobileNav, setMobileNav] = useState(false);

  function selectView(nextView: View) {
    setView(nextView);
    setMobileNav(false);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><Github size={22} /></span>
          <div><strong>Copilot Credit Planner</strong><small>UBB decision workspace</small></div>
        </div>
        <nav className={mobileNav ? "topnav open" : "topnav"} aria-label="Primary navigation">
          <button className={view === "wizard" ? "active" : ""} onClick={() => selectView("wizard")}><WandSparkles size={17} /> Wizard</button>
          <button className={view === "flow" ? "active" : ""} onClick={() => selectView("flow")}><GitBranch size={17} /> Decision flow</button>
          <button className={view === "research" ? "active" : ""} onClick={() => selectView("research")}><BookOpen size={17} /> Research</button>
        </nav>
        <div className="topbar-meta"><span className="freshness-dot" />Docs checked Aug 14, 2026</div>
        <button className="mobile-menu" onClick={() => setMobileNav((open) => !open)} aria-label={mobileNav ? "Close navigation" : "Open navigation"}>
          {mobileNav ? <X /> : <PanelLeft />}
        </button>
      </header>

      {view === "wizard" && <Wizard initialPresetId="balanced" />}
      {view === "flow" && <DecisionFlow />}
      {view === "research" && <Research />}
    </div>
  );
}
