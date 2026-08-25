# GitHub Copilot AI credit decision flow

Research snapshot: 2026-08-25

```mermaid
flowchart TD
    START(["User wants to consume X AI credits"])
    FEATURE{"Does the feature consume AI credits?"}
    FREEFEATURE["No AI-credit charge<br/>Completions and next edit suggestions continue"]
    PLAN{"Billing family?"}

    START --> FEATURE
    FEATURE -- "No" --> FREEFEATURE
    FEATURE -- "Yes" --> PLAN

    PLAN -- "Annual Pro or Pro+ kept on legacy" --> LEGACY["Use premium requests and model multipliers<br/>AI-credit simulation is not applicable"]
    LEGACY --> LEGACYEND["At annual term end: automatic downgrade to Free<br/>unless changed to a monthly UBB plan beforehand"]

    PLAN -- "Individual UBB" --> INDPLAN{"Plan allowance"}
    INDPLAN -- "Free or Student" --> INDCUSTOM["Enter account allowance<br/>GitHub does not publish a numeric preset"]
    INDPLAN -- "Pro: 1,500" --> INCCHECK
    INDPLAN -- "Pro+: 7,000" --> INCCHECK
    INDPLAN -- "Max: 20,000" --> INCCHECK
    INDCUSTOM --> INCCHECK{"X within included allowance?"}
    INCCHECK -- "Yes" --> INDINCLUDED["Served from included credits"]
    INCCHECK -- "No" --> INDCHOICE{"Next action"}
    INDCHOICE -- "Upgrade" --> INDUPGRADE["Apply larger allowance immediately<br/>Charge only plan-price difference"]
    INDUPGRADE --> INCCHECK
    INDCHOICE -- "Additional-usage budget" --> INDELIGIBLE{"Eligible to purchase additional credits?<br/>No current or former GitHub Mobile subscription"}
    INDELIGIBLE -- "Yes" --> INDBUDGET{"Budget covers excess at $0.01/credit?"}
    INDELIGIBLE -- "No" --> BLOCKIND
    INDBUDGET -- "Yes" --> INDPAID["Usage continues as metered spend"]
    INDBUDGET -- "No or capped" --> BLOCKIND["AI-credit features block<br/>Raise/pay budget or wait for reset"]
    INDCHOICE -- "Wait" --> BLOCKIND

    PLAN -- "Business or Enterprise UBB" --> ULB{"Effective ULB exists?<br/>Individual > cost center > universal"}
    ULB -- "Yes, X exceeds it" --> BLOCKULB["Hard stop at ULB<br/>Pool and spending budgets cannot extend it"]
    ULB -- "No, or X is within it" --> CCPOOL{"Cost center included-usage control applies?"}

    CCPOOL -- "Yes" --> CCFIRST{"Cost-center cap reached before global pool?"}
    CCPOOL -- "No" --> POOLCHECK{"Shared pool covers remaining demand?"}
    CCFIRST -- "No" --> POOLCHECK
    CCFIRST -- "Yes + block" --> BLOCKCCPOOL["Block this cost center at its included cap"]
    CCFIRST -- "Yes + paid overage" --> PAIDPOLICY
    POOLCHECK -- "Enough for X" --> POOL["Consume included pool"]
    POOLCHECK -- "Empty or partial" --> POOLSHORT["Consume any remaining pool credits"]
    POOLSHORT --> PAIDPOLICY{"AI credit paid usage policy enabled?"}
    POOL --> SERVED["Request served with no additional charge"]

    PAIDPOLICY -- "No" --> BLOCKPOOL["Block until monthly reset<br/>or an admin enables paid usage"]
    PAIDPOLICY -- "Yes" --> SCOPE{"Applicable metered scope?"}
    SCOPE -- "Direct cost center" --> CCBUDGET["Apply cost center budget<br/>and enterprise budget unless excluded"]
    SCOPE -- "Billing organization" --> ORGBUDGET["Apply organization budget<br/>and higher enterprise restriction"]
    SCOPE -- "Neither" --> ENTBUDGET["Apply enterprise budget"]

    CCBUDGET --> LIMIT{"Any applicable hard limit exhausted?"}
    ORGBUDGET --> LIMIT
    ENTBUDGET --> LIMIT
    LIMIT -- "$0 budget or stop enabled + reached" --> BLOCKBUDGET["Block at lowest remaining headroom"]
    LIMIT -- "Budget absent or stop disabled" --> UNCAPPED["Usage continues<br/>Budget is alert-only and spend is uncapped"]
    LIMIT -- "Hard budget has room" --> METERED["Usage continues at $0.01 per AI credit"]

    BLOCKULB --> STILLWORKS["Completions and next edit suggestions still work"]
    BLOCKCCPOOL --> STILLWORKS
    BLOCKPOOL --> STILLWORKS
    BLOCKBUDGET --> STILLWORKS

    classDef decision fill:#fff7d6,stroke:#8a6d1d,color:#261f0a,stroke-width:2px;
    classDef success fill:#e7f7ed,stroke:#257942,color:#12351f,stroke-width:2px;
    classDef danger fill:#ffebe9,stroke:#cf222e,color:#4a1116,stroke-width:2px;
    classDef paid fill:#eaf2ff,stroke:#0969da,color:#0a3069,stroke-width:2px;
    class FEATURE,PLAN,INDPLAN,INCCHECK,INDCHOICE,INDELIGIBLE,INDBUDGET,ULB,CCPOOL,CCFIRST,POOLCHECK,PAIDPOLICY,SCOPE,LIMIT decision;
    class FREEFEATURE,INDINCLUDED,POOL,POOLSHORT,SERVED,STILLWORKS success;
    class BLOCKIND,BLOCKULB,BLOCKCCPOOL,BLOCKPOOL,BLOCKBUDGET danger;
    class INDPAID,CCBUDGET,ORGBUDGET,ENTBUDGET,UNCAPPED,METERED paid;
```

## Precedence summary

```text
AI-credit feature
  -> billing model
  -> effective ULB (individual > cost center > universal)
  -> earliest included limit (cost-center cap or shared pool)
  -> paid-usage policy
  -> scoped metered budget + enterprise restriction
  -> served, metered, or blocked
```

A cost center with enterprise-budget exclusion skips the enterprise restriction.
For all other overlapping hard limits, the lowest remaining headroom wins.
