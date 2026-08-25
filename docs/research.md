# GitHub Copilot usage-based billing research

Research snapshot: 2026-08-25

This brief is the source of truth for the wizard. It is based on the current
published GitHub Docs pages and the matching files on the `main` branch of the
public `github/docs` repository. Product defaults in the app must remain
overridable because allowances, flex allotments, and model prices can change.

## Terminology and effective date

- **UBB** means usage-based billing. GitHub says Copilot moved from premium
  request billing to UBB on **June 1, 2026**. The cost of an interaction now
  depends on the model and the number and type of tokens consumed.
- **AI credit** is the normalized billing unit. **1 AI credit = $0.01 USD**.
- **ULB** means user-level budget. A ULB caps one user's total AI credit usage
  across included pool usage and paid usage. Every ULB is a hard stop.
- Existing annual Copilot Pro and Pro+ subscriptions that stayed on the legacy
  model continue to use premium request units and model multipliers until the
  annual term ends. AI credit calculations do not apply to those subscriptions.

## Plans and included allowances

| Plan | Monthly price | Included AI credits | Notes |
| --- | ---: | ---: | --- |
| Copilot Free | $0 | Not numerically published | Auto model selection only; 2,000 completions |
| Copilot Student | $0 | Not numerically published | Auto model selection only; unlimited completions |
| Copilot Pro | $10 | 1,500 | 1,000 base + 500 flex |
| Copilot Pro+ | $39 | 7,000 | 3,900 base + 3,100 flex |
| Copilot Max | $100 | 20,000 | 10,000 base + 10,000 flex |
| Copilot Business | $19 per seat | 1,900 per seat | Pooled at the billing entity |
| Copilot Enterprise | $39 per seat | 3,900 per seat | Pooled at the billing entity |

Existing Business and Enterprise customers receive promotional allowances from
June 1 through August 31, 2026: 3,000 credits per Business seat and 7,000 per
Enterprise seat. Eligibility is limited to customers already using Copilot
before June 1. Standard allowances resume at 00:00:00 UTC on September 1,
2026. The wizard therefore uses the standard 1,900/3,900 schedule as its
conservative baseline and keeps the temporary promotion as an explicit choice.

Paid individual plans split included usage into fixed base credits and a
variable flex allotment. Flex is consumed after base credits and can change as
GitHub's AI economics change. Included credits never roll over. Allowances and
managed pools reset at 00:00:00 UTC on the first day of each calendar month,
independently of the subscription invoice date.

For Business and Enterprise, adding seats raises the pool immediately. Removing
seats does not shrink the pool until the next billing cycle.

## What consumes AI credits

Copilot features that invoke AI models consume credits, including Chat, CLI,
cloud agent, Spaces, Spark, code review, and third-party coding agents. Token
price varies by model and input, cached input, cache-write, and output token
counts. A user-provided credit estimate is therefore more reliable for this
wizard than pretending a prompt has a fixed cost.

Code completions and next edit suggestions do not consume AI credits and remain
unlimited on paid plans. When an account budget blocks AI-credit features,
these features continue to work. Copilot Free still has its separate 2,000
completion limit.

## Guardrails

| Control | Phase | Scope | Hard stop behavior |
| --- | --- | --- | --- |
| Individual ULB | Included + metered | One user | Always; overrides all other ULBs |
| Cost center ULB | Included + metered | Each cost center member | Always; overrides universal ULB |
| Universal ULB | Included + metered | Every licensed enterprise user | Always |
| Cost center included usage control | Included pool | One cost center | Auto-sized from its seats; block or move the excess to paid usage |
| AI credit paid usage policy | Pool exhaustion / paid transition | Organization or enterprise | Disabled means block; enabled is the default for managed plans |
| Cost center budget | Metered only | Cost center | Hard only with stop enabled; $0 stops immediately |
| Organization budget | Metered only | Billing organization | Hard only with stop enabled; $0 stops immediately |
| Enterprise budget | Metered only | Enterprise | Hard only with stop enabled; $0 stops immediately |
| Cost center exclusion | Metered only | Cost center | Removes that cost center's spend from the enterprise cap |
| Model policy | Before model use | Organization or enterprise | Can remove expensive models, but is not a deterministic credit cap |
| CLI or SDK session limit | During a local response/session | User/session | Soft limit; a model response can cross the configured value |

For individual plans, additional AI credits cannot be purchased if the account
subscribes, or has subscribed, to a Copilot plan through GitHub Mobile on iOS
or Android. The wizard treats this as a separate eligibility check before a
personal additional-usage budget can fund overage.

The **Stop usage when budget limit is reached** option is off by default for
cost center, organization, and enterprise budgets. Without it, a budget is an
alert and charges continue beyond the entered amount. ULBs do not have this
toggle because they always stop usage.

Content exclusion, firewall, indemnity, and feature availability policies are
important enterprise controls, but they do not change the billing evaluation
order. The wizard lists model restrictions as an advisory cost control and does
not treat non-billing policies as monetary caps.

## Evaluation order

For an AI-credit-consuming request on a Business or Enterprise license:

1. Resolve the effective ULB: individual, otherwise cost center, otherwise
   universal. If the user reaches it, block immediately. No pool or spending
   budget can extend a ULB.
2. If a cost center included usage control applies, compare its remaining
  auto-calculated seat-funded cap with the remaining global shared pool. The
  lower included headroom is reached first. If that is the cost-center cap,
  either block the cost center or route its excess into paid usage, according
  to its setting.
3. Consume the shared included pool while credits remain. A cost center whose
  own cap has room still enters the paid transition if the global pool is
  exhausted first.
4. At the paid transition, check the effective AI credit paid usage policy. If
   disabled, block until reset or an administrator changes the policy.
5. If paid usage is allowed, route metered spend through the applicable cost
   center or billing organization. Users outside those scopes use the
   enterprise budget.
6. Enterprise limits also constrain narrower scopes unless a cost center has
   enterprise-budget exclusion. Among applicable hard limits, the lowest
   remaining headroom blocks first.
7. A missing budget or a reached budget with stop disabled does not cap spend.
   Metered usage continues at $0.01 per credit.

There is no automatic fallback to a cheaper model after a budget is exhausted.
A blocked user stays blocked until the next calendar-month reset or an
administrator raises the relevant limit.

## Scenario outcomes

- **No ULB, pool available:** usage is served from the shared pool. A heavy user
  can consume a disproportionate share.
- **No ULB, pool exhausted, paid usage disabled:** usage blocks at pool
  exhaustion.
- **No ULB, paid usage enabled, no hard spending budget:** usage continues with
  uncapped metered charges.
- **No ULB, paid usage enabled, hard spending budget:** metered usage continues
  until the first applicable hard budget is exhausted.
- **ULB below desired usage:** that user blocks at the ULB even when the pool and
  spending budgets still have room.
- **ULB above desired usage, pool available:** usage is served from the pool.
- **ULB above desired usage, pool exhausted:** paid policy and scoped spending
  limits decide whether usage continues.
- **Cost center included cap with block:** that team's usage stops at its own
  seat-funded share before it can consume another team's pool allocation.
- **Cost center included cap with paid overage:** excess becomes metered usage,
  subject to paid policy, the cost center budget, and normally the enterprise
  budget.
- **Cost center cap has room but global pool is exhausted:** consume any global
  pool remainder, then apply paid policy and metered budgets. Cost-center cap
  headroom cannot create additional included credits.
- **Legacy annual Pro/Pro+:** AI credit outcomes are not applicable; premium
  requests and model multipliers remain controlling until the term ends. The
  account automatically downgrades to Copilot Free unless the user changes to
  a monthly paid plan beforehand.
- **Individual UBB:** consume included allowance first, then upgrade, configure
  an additional-usage budget, or wait for reset. An exhausted or capped
  additional-usage budget blocks further AI-credit usage. Accounts that have
  subscribed through GitHub Mobile cannot purchase additional credits.

## Calculation model used by the wizard

```text
pool credits = business seats * business allowance
             + enterprise seats * enterprise allowance

pool value USD = pool credits * 0.01

effective ULB = individual ULB
             ?? cost center ULB
             ?? universal ULB
             ?? no per-user cap

basic metered credits = max(0, projected entity credits - pool credits)

cost center included cap = cost center business seats * business allowance
                         + cost center enterprise seats * enterprise allowance
```

For cost center included controls, the simulator separates credits diverted to
paid overage from demand that still draws from the global pool. It compares the
resulting projected metered dollars with every applicable hard-stop budget. It
reports projection risk when ordering among users would determine who gets the
last remaining pooled credits.

All numeric presets are editable. The simulator never invents a Free or Student
allowance; the user must enter the allowance shown in their account.

## Official sources

- [Usage-based billing for organizations and enterprises](https://docs.github.com/en/copilot/concepts/billing/usage-based-billing-for-organizations-and-enterprises)
- [Budgets for usage-based billing](https://docs.github.com/en/copilot/concepts/billing/budgets-for-usage-based-billing)
- [Getting started with budget controls](https://docs.github.com/en/copilot/tutorials/budgets/getting-started-with-budget-controls)
- [Optimizing your budget configuration](https://docs.github.com/en/copilot/tutorials/budgets/optimizing-your-budget-configuration)
- [Usage-based billing for individuals](https://docs.github.com/en/copilot/concepts/billing/usage-based-billing-for-individuals)
- [Individual Copilot plans and benefits](https://docs.github.com/en/copilot/concepts/billing/individual-plans)
- [Models and pricing for GitHub Copilot](https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing)
- [What changed with Copilot billing (legacy)](https://docs.github.com/en/copilot/reference/copilot-billing/request-based-billing-legacy/what-changed-with-billing)
- [Copilot SDK session limits](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/session-limits)
