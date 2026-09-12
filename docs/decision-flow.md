# GitHub Copilot AI credit decision flow

Research snapshot: 2026-08-25

```mermaid
flowchart TD
    START(["User wants to consume X incremental AI credits"])
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
    INDCUSTOM --> INCCHECK{"X within remaining included credits?<br/>Remaining = allowance - consumed"}
    INCCHECK -- "Yes" --> INDINCLUDED["Served from included credits"]
    INCCHECK -- "No" --> INDCHOICE{"Next action"}
    INDCHOICE -- "Upgrade" --> INDUPGRADE["Apply larger allowance immediately<br/>Charge only plan-price difference"]
    INDUPGRADE --> INCCHECK
    INDCHOICE -- "Additional-usage budget" --> INDELIGIBLE{"Eligible to purchase additional credits?<br/>No current or former GitHub Mobile subscription"}
    INDELIGIBLE -- "Yes" --> INDBUDGET{"Remaining hard-budget headroom covers<br/>the complete proposed excess charge?"}
    INDELIGIBLE -- "No" --> BLOCKIND
    INDBUDGET -- "Yes" --> INDPAID["Usage continues as metered spend"]
    INDBUDGET -- "No" --> BLOCKIND["AI-credit features block<br/>Raise/pay budget or wait for reset"]
    INDCHOICE -- "Wait" --> BLOCKIND

    PLAN -- "Business or Enterprise UBB" --> ULB{"Effective ULB exists?<br/>Individual > cost center > universal"}
    ULB -- "Yes" --> ULBCHECK{"Does X exceed ULB headroom?<br/>Headroom = limit - consumed"}
    ULB -- "No" --> CCPOOL{"Cost center included-usage control applies?"}
    ULBCHECK -- "Yes" --> BLOCKULB["Hard stop at ULB<br/>Pool and spending budgets cannot extend it"]
    ULBCHECK -- "No" --> CCPOOL

    CCPOOL -- "Yes" --> CCHEADROOM["Included headroom = minimum of<br/>shared pool remaining and cost-center cap remaining"]
    CCPOOL -- "No" --> POOLHEADROOM["Included headroom = shared pool remaining"]
    CCHEADROOM --> CCCOVER{"Does included headroom cover X?"}
    POOLHEADROOM --> POOLCOVER{"Does pool headroom cover X?"}
    CCCOVER -- "Yes" --> POOL["Consume X included credits"]
    CCCOVER -- "No + control blocks" --> BLOCKCCPOOL["Block this cost center at its included cap"]
    CCCOVER -- "No + overage allowed" --> POOLSHORT["Project included = minimum of X and included headroom<br/>Metered remainder = X - included"]
    POOLCOVER -- "Yes" --> POOL
    POOLCOVER -- "No" --> POOLSHORT
    POOLSHORT --> PAIDPOLICY{"AI credit paid usage policy enabled?"}
    POOL --> SERVED["Request served with no additional charge"]

    PAIDPOLICY -- "No" --> BLOCKPOOL["Block until monthly reset<br/>or an admin enables paid usage"]
    PAIDPOLICY -- "Yes" --> SCOPE{"Applicable metered scope?"}
    SCOPE -- "Direct cost center" --> CCBUDGET["Apply cost center budget<br/>and enterprise budget unless excluded"]
    SCOPE -- "Billing organization" --> ORGBUDGET["Apply organization budget<br/>and higher enterprise restriction"]
    SCOPE -- "Neither" --> ENTBUDGET["Apply enterprise budget"]

    CCBUDGET --> LIMIT{"Does any applicable hard budget lack headroom<br/>for the complete proposed metered charge?<br/>Headroom = limit - consumed"}
    ORGBUDGET --> LIMIT
    ENTBUDGET --> LIMIT
    LIMIT -- "Yes" --> BLOCKBUDGET["Block at lowest remaining headroom"]
    LIMIT -- "No; no hard budget applies" --> UNCAPPED["Usage continues<br/>Budget is alert-only and spend is uncapped"]
    LIMIT -- "No; hard budgets cover charge" --> METERED["Usage continues at $0.01 per AI credit"]

    BLOCKULB --> STILLWORKS["Completions and next edit suggestions still work"]
    BLOCKCCPOOL --> STILLWORKS
    BLOCKPOOL --> STILLWORKS
    BLOCKBUDGET --> STILLWORKS

    classDef decision fill:#fff7d6,stroke:#8a6d1d,color:#261f0a,stroke-width:2px;
    classDef success fill:#e7f7ed,stroke:#257942,color:#12351f,stroke-width:2px;
    classDef danger fill:#ffebe9,stroke:#cf222e,color:#4a1116,stroke-width:2px;
    classDef paid fill:#eaf2ff,stroke:#0969da,color:#0a3069,stroke-width:2px;
    class FEATURE,PLAN,INDPLAN,INCCHECK,INDCHOICE,INDELIGIBLE,INDBUDGET,ULB,ULBCHECK,CCPOOL,CCCOVER,POOLCOVER,PAIDPOLICY,SCOPE,LIMIT decision;
    class FREEFEATURE,INDINCLUDED,POOL,POOLSHORT,SERVED,STILLWORKS success;
    class BLOCKIND,BLOCKULB,BLOCKCCPOOL,BLOCKPOOL,BLOCKBUDGET danger;
    class INDPAID,CCBUDGET,ORGBUDGET,ENTBUDGET,UNCAPPED,METERED paid;
```

## Precedence summary

```text
AI-credit feature
  -> billing model
  -> effective ULB (individual > cost center > universal)
  -> remaining included headroom (minimum of shared pool and applicable cost-center cap)
  -> provisional included allocation + metered remainder
  -> paid-usage policy
  -> complete proposed metered charge against each applicable budget's remaining headroom
  -> served, metered, or blocked
```

A cost center with enterprise-budget exclusion skips the enterprise restriction.
For all other overlapping hard limits, the complete proposed charge must fit every applicable remaining headroom; the lowest remaining headroom wins.
