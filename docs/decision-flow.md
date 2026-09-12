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
    INDCHOICE -- "Additional usage" --> INDELIGIBLE{"Additional usage authorized for this account?"}
    INDELIGIBLE -- "No" --> BLOCKIND["AI-credit features block<br/>Authorize additional usage or wait for reset"]
    INDELIGIBLE -- "Yes" --> INDENFORCEMENT{"Applicable spending-budget enforcement?"}
    INDENFORCEMENT -- "Hard stop" --> INDBUDGET{"Complete proposed excess charge fits<br/>remaining hard-budget headroom?"}
    INDENFORCEMENT -- "Alert-only" --> INDALERT["Usage continues as metered spend<br/>Emit any crossed budget alerts"]
    INDENFORCEMENT -- "No configured budget" --> INDNOBUDGET["No cap from configured spending budgets<br/>Other account, payment, and service limits still apply"]
    INDBUDGET -- "Yes" --> INDPAID["Usage continues as metered spend"]
    INDBUDGET -- "No" --> BLOCKIND
    INDCHOICE -- "Wait" --> BLOCKIND

    PLAN -- "Business or Enterprise UBB" --> ATTRIBUTION["Resolve billed identity, licensing source, and cost center<br/>Direct user > enterprise team > licensing organization"]
    ATTRIBUTION --> ULB{"Effective ULB exists?<br/>Individual > cost center > universal"}
    ULB -- "Yes" --> ULBCHECK{"Does X exceed ULB headroom?<br/>Headroom = limit - consumed"}
    ULB -- "No" --> CCPOOL{"Cost center included-usage control applies?"}
    ULBCHECK -- "Yes" --> BLOCKULB["Hard stop at ULB<br/>Pool and spending budgets cannot extend it"]
    ULBCHECK -- "No" --> CCPOOL

    CCPOOL -- "Yes" --> CCHEADROOM["Included headroom = minimum of<br/>shared pool remaining and cost-center cap remaining"]
    CCPOOL -- "No" --> POOLHEADROOM["Included headroom = shared pool remaining"]
    CCHEADROOM --> CCCOVER{"Does included headroom cover X?"}
    POOLHEADROOM --> POOLCOVER{"Does pool headroom cover X?"}
    CCCOVER -- "Yes" --> POOL["Accept and consume X included credits"]
    CCCOVER -- "No + X exceeds cost-center headroom + control blocks" --> BLOCKCCPOOL["Block this cost center at its included cap"]
    CCCOVER -- "No + otherwise" --> POOLSHORT["Project included = minimum of X and included headroom<br/>Metered remainder = X - included"]
    POOLCOVER -- "Yes" --> POOL
    POOLCOVER -- "No" --> POOLSHORT
    POOLSHORT --> PAIDPOLICY{"AI credit paid usage policy enabled?"}
    POOL --> SERVED["Request served with no additional charge"]

    PAIDPOLICY -- "No" --> BLOCKPOOL["Reject projection; allocate 0 credits<br/>Balances remain unchanged"]
    PAIDPOLICY -- "Yes" --> SCOPE{"Applicable metered scope?"}
    SCOPE -- "Resolved cost center" --> CCBUDGET["Apply applicable cost-center budget<br/>and enterprise budget unless excluded"]
    SCOPE -- "Billing organization" --> ORGBUDGET["Apply organization budget<br/>and higher enterprise restriction"]
    SCOPE -- "Neither" --> ENTBUDGET["Apply enterprise budget"]

    CCBUDGET --> LIMIT{"Does any applicable hard budget lack headroom<br/>for the complete proposed metered charge?<br/>Headroom = limit - consumed"}
    ORGBUDGET --> LIMIT
    ENTBUDGET --> LIMIT
    LIMIT -- "Yes" --> BLOCKBUDGET["Reject projection; allocate 0 credits<br/>Balances remain unchanged"]
    LIMIT -- "No" --> ALERTCHECK{"Any applicable alert-only budget?"}
    ALERTCHECK -- "Yes" --> ALERTMETERED["Accept projected split and emit crossed alerts<br/>No cap from alert-only budgets<br/>Other account, payment, and service limits still apply"]
    ALERTCHECK -- "No" --> HARDCHECK{"Any applicable hard budget?"}
    HARDCHECK -- "Yes; all cover charge" --> METERED["Accept projected split<br/>Usage continues at $0.01 per AI credit"]
    HARDCHECK -- "No configured budget" --> NOBUDGET["Accept projected split<br/>No cap from configured spending budgets<br/>Other account, payment, and service limits still apply"]

    BLOCKULB --> STILLWORKS["Completions and next edit suggestions still work"]
    BLOCKCCPOOL --> STILLWORKS
    BLOCKPOOL --> STILLWORKS
    BLOCKBUDGET --> STILLWORKS

    classDef decision fill:#fff7d6,stroke:#8a6d1d,color:#261f0a,stroke-width:2px;
    classDef success fill:#e7f7ed,stroke:#257942,color:#12351f,stroke-width:2px;
    classDef danger fill:#ffebe9,stroke:#cf222e,color:#4a1116,stroke-width:2px;
    classDef paid fill:#eaf2ff,stroke:#0969da,color:#0a3069,stroke-width:2px;
    class FEATURE,PLAN,INDPLAN,INCCHECK,INDCHOICE,INDELIGIBLE,INDENFORCEMENT,INDBUDGET,ULB,ULBCHECK,CCPOOL,CCCOVER,POOLCOVER,PAIDPOLICY,SCOPE,LIMIT,ALERTCHECK,HARDCHECK decision;
    class FREEFEATURE,INDINCLUDED,POOL,SERVED,STILLWORKS success;
    class BLOCKIND,BLOCKULB,BLOCKCCPOOL,BLOCKPOOL,BLOCKBUDGET danger;
    class INDALERT,INDNOBUDGET,INDPAID,CCBUDGET,ORGBUDGET,ENTBUDGET,ALERTMETERED,METERED,NOBUDGET paid;
```

## Precedence summary

```text
AI-credit feature
  -> billing model and billed identity
  -> licensing source and resolved cost-center attribution
  -> effective ULB (individual > cost center > universal)
  -> remaining included headroom (minimum of shared pool and applicable cost-center cap)
  -> provisional included allocation + metered remainder
  -> paid-usage authorization
  -> every applicable hard spending limit
  -> alert-only or missing spending-budget result
  -> accept and allocate only after every applicable gate permits the request
  -> served, metered, or blocked
```

Resolve cost-center attribution once from the billed identity and licensing source: direct user assignment, then enterprise-team assignment, then the organization granting the license. Use that same resolved identity for ULB, included-control, spending-budget, and enterprise-exclusion applicability.

A cost center with enterprise-budget exclusion skips the enterprise restriction.
For all other overlapping hard limits, the complete proposed charge must fit every applicable remaining headroom; the lowest remaining headroom wins. A `$0` spending budget blocks only when configured as a hard stop. Alert-only and missing budgets add no cap of their own; they do not override other account, payment, service, or applicable hard-budget limits.

For the Business and Enterprise simulator path, the included/metered split is a projection until every modeled gate permits it. A paid-policy or spending-budget rejection accepts zero credits and leaves all balances unchanged. Live work already performed and billed is outside this transactional preview rule.
