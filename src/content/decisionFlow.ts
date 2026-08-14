export const DECISION_FLOW = `flowchart TD
    START(["Consume X AI credits"])
    FEATURE{"AI-credit feature?"}
    FREEFEATURE["No AI-credit charge<br/>Completions / next edits continue"]
    PLAN{"Billing family?"}

    START --> FEATURE
    FEATURE -- "No" --> FREEFEATURE
    FEATURE -- "Yes" --> PLAN

    PLAN -- "Legacy annual Pro / Pro+" --> LEGACY["Premium requests + multipliers"]
    LEGACY --> LEGACYEND["Term end: Free or monthly UBB"]

    PLAN -- "Individual UBB" --> INDPLAN{"Plan allowance"}
    INDPLAN -- "Free / Student" --> INDCUSTOM["Enter account allowance"]
    INDPLAN -- "Pro 1,500" --> INCCHECK
    INDPLAN -- "Pro+ 7,000" --> INCCHECK
    INDPLAN -- "Max 20,000" --> INCCHECK
    INDCUSTOM --> INCCHECK{"Within allowance?"}
    INCCHECK -- "Yes" --> INDINCLUDED["Included credits"]
    INCCHECK -- "No" --> INDCHOICE{"Upgrade, pay, or wait?"}
    INDCHOICE -- "Upgrade" --> INDUPGRADE["Larger allowance now"]
    INDUPGRADE --> INCCHECK
    INDCHOICE -- "Pay" --> INDBUDGET{"Personal budget covers excess?"}
    INDBUDGET -- "Yes" --> INDPAID["Metered usage"]
    INDBUDGET -- "No" --> BLOCKIND["Blocked until budget / reset"]
    INDCHOICE -- "Wait" --> BLOCKIND

    PLAN -- "Business / Enterprise" --> ULB{"Effective ULB?<br/>Individual > cost center > universal"}
    ULB -- "Exceeded" --> BLOCKULB["Hard stop at ULB"]
    ULB -- "Within / none" --> CCPOOL{"Cost center included control?"}

    CCPOOL -- "Cap has room" --> POOL["Consume included pool"]
    CCPOOL -- "Cap reached + block" --> BLOCKCCPOOL["Block cost center"]
    CCPOOL -- "Cap reached + paid overage" --> PAIDPOLICY
    CCPOOL -- "None" --> POOLCHECK{"Shared pool has credits?"}
    POOLCHECK -- "Yes" --> POOL
    POOLCHECK -- "No" --> PAIDPOLICY{"Paid usage enabled?"}
    POOL --> SERVED["Served, no extra charge"]

    PAIDPOLICY -- "No" --> BLOCKPOOL["Blocked until reset / policy change"]
    PAIDPOLICY -- "Yes" --> SCOPE{"Metered scope?"}
    SCOPE -- "Cost center" --> CCBUDGET["Cost center budget<br/>+ enterprise unless excluded"]
    SCOPE -- "Billing organization" --> ORGBUDGET["Organization + enterprise limits"]
    SCOPE -- "Neither" --> ENTBUDGET["Enterprise limit"]

    CCBUDGET --> LIMIT{"Any hard limit exhausted?"}
    ORGBUDGET --> LIMIT
    ENTBUDGET --> LIMIT
    LIMIT -- "Stop on + reached / $0" --> BLOCKBUDGET["Block at lowest headroom"]
    LIMIT -- "Absent / stop off" --> UNCAPPED["Metered, uncapped exposure"]
    LIMIT -- "Headroom remains" --> METERED["Metered at $0.01 / credit"]

    BLOCKULB --> STILLWORKS["Completions + next edits still work"]
    BLOCKCCPOOL --> STILLWORKS
    BLOCKPOOL --> STILLWORKS
    BLOCKBUDGET --> STILLWORKS

    classDef decision fill:#fff8c5,stroke:#9a6700,color:#24201a,stroke-width:2px;
    classDef success fill:#dafbe1,stroke:#1a7f37,color:#12351f,stroke-width:2px;
    classDef danger fill:#ffebe9,stroke:#cf222e,color:#4a1116,stroke-width:2px;
    classDef paid fill:#ddf4ff,stroke:#0969da,color:#0a3069,stroke-width:2px;
    class FEATURE,PLAN,INDPLAN,INCCHECK,INDCHOICE,INDBUDGET,ULB,CCPOOL,POOLCHECK,PAIDPOLICY,SCOPE,LIMIT decision;
    class FREEFEATURE,INDINCLUDED,POOL,SERVED,STILLWORKS success;
    class BLOCKIND,BLOCKULB,BLOCKCCPOOL,BLOCKPOOL,BLOCKBUDGET danger;
    class INDPAID,CCBUDGET,ORGBUDGET,ENTBUDGET,UNCAPPED,METERED paid;`;
