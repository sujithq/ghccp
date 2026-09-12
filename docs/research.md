# GitHub Copilot usage-based billing research

Research snapshot: 2026-09-12

This brief records source-backed billing rules and explicit forecast assumptions
for the Credit Planner. Billing rules were rechecked against published GitHub
Docs on 2026-09-12. The shared [decision flow](decision-flow.md) is rendered by
the application and covered by executable route tests. Defaults remain editable
because allowances, flex allotments, and account settings can change.

This app projects partial monthly consumption, not transactional acceptance of
one incremental request. The separate .NET Cost Compass analysis is preserved
historical context, not the contract of this TypeScript planner.

## Terminology and effective date

- **UBB** means usage-based billing. GitHub says Copilot moved from premium
  request billing to UBB on **June 1, 2026**. The cost of an interaction now
  depends on the model and the number and type of tokens consumed.
- **AI credit** is the normalized billing unit. **1 AI credit = $0.01 USD**.
- **ULB** means user-level budget. A ULB caps one user's total AI credit usage
  across included pool usage and paid usage. Every ULB is a hard stop.
- Existing annual Copilot Pro and Pro+ subscriptions that remained on the
  legacy model continue to use premium request units and model multipliers
  until the annual term ends. The cohort-specific legacy billing page says
  those accounts automatically downgrade to Copilot Free at term end unless
  the subscriber changes plans first. AI-credit calculations do not apply to
  those legacy subscriptions.

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

Existing Business and Enterprise customers received promotional allowances from
June 1 through August 31, 2026: 3,000 credits per Business seat and 7,000 per
Enterprise seat. Eligibility was limited to customers already using Copilot
before June 1. Standard allowances resumed at 00:00:00 UTC on September 1,
2026. The wizard therefore uses the standard 1,900/3,900 schedule as its
conservative baseline and keeps the temporary promotion as an explicit
historical choice.

Paid individual plans split included usage into fixed base credits and a
variable flex allotment. Flex is consumed after base credits and can change as
GitHub's AI economics change. The displayed totals above were checked on
2026-09-12 and must remain dated. Included credits never roll over. Allowances
and managed pools reset at 00:00:00 UTC on the first day of each calendar month,
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
| Cost center budget | Metered only | Cost center | Positive budgets need Stop usage; $0 conservatively assumed hard |
| Organization budget | Metered only | Billing organization | Positive budgets need Stop usage; $0 conservatively assumed hard |
| Enterprise budget | Metered only | Enterprise | Positive budgets need Stop usage; $0 conservatively assumed hard |
| Cost center exclusion | Metered only | Cost center | Removes that cost center's spend from the enterprise cap |
| Model policy | Before model use | Organization or enterprise | Can remove expensive models, but is not a deterministic credit cap |
| CLI or SDK session limit | During a local response/session | User/session | Soft limit; a model response can cross the configured value |

Current official individual billing, plans, and plan-management pages checked on
2026-09-12 do not establish a current/former GitHub Mobile exclusion for
additional usage. The wizard must treat additional-usage authorization as an
account-provided state rather than a universal Mobile-history rule.

The **Stop usage when budget limit is reached** option is off by default for
cost center, organization, and enterprise budgets. For positive budgets,
without it, usage is not capped at the entered amount. ULBs always stop and do
not have this toggle. A missing or alert-only budget adds no cap of its own,
but does not override other applicable hard budgets or account, payment, and
service limits. Notifications require opting in to budget threshold alerts;
the planner does not send alerts or guarantee their delivery.

**Zero-budget uncertainty:** the Copilot budget reference says any USD 0 budget
stops usage, while its comparison table and setup guide describe stopping as
toggle-dependent. The planner conservatively treats USD 0 as a hard stop,
including with Stop usage off, and warns when this applies to paid demand. This
assumption is not a verified universal GitHub rule. Enterprise overlap similarly
follows the explicit higher-level restriction and cost-center exclusion rules,
not tutorial shorthand that describes the enterprise budget as a fallback only.

Personal accounts have an explicit additional-usage authorization input plus
hard-stop, alert-only, or no-budget behavior. A missing budget cannot establish
authorization. An authorized account with no budget has no configured budget
cap in this forecast, but real additional usage can still be capped by GitHub.
Older saved scenarios retain hard enforcement; old no-budget scenarios require
authorization to be reconfirmed before projecting additional usage.

Only active individual ULB overrides belong in a snapshot. When an override
expires, the cost-center ULB, universal ULB, or no ULB applies. Budget spend
inputs count usage tracked since that budget's creation in the current cycle,
excluding demand being projected. Earlier spend is not retroactively covered,
so a new budget cannot be treated as a cap on the entire month's invoice.

Content exclusion, firewall, indemnity, and feature availability policies are
important enterprise controls, but they do not change the billing evaluation
order. The wizard lists model restrictions as an advisory cost control and does
not treat non-billing policies as monetary caps.

## Projection order

For desired monthly AI-credit consumption on a Business or Enterprise license:

1. Supply the resolved billing identity and cost-center assignment. Documented
  precedence is direct user, then enterprise team, then licensing organization.
  Among multiple teams, the earliest-created team applies. The planner does not
  discover identities or simulate attribution changes within a month.
2. Limit eligible demand by the active effective ULB: individual, otherwise cost
  center, otherwise universal. No pool or spending budget can extend it. Keep
  the within-ULB portion eligible for further funding checks.
3. Compute included headroom as the lower remaining shared pool and applicable
  cost-center cap. If a blocking cost-center cap is reached before or alongside
  the global pool, mark its excess blocked. Otherwise project included funding
  and demand that could require paid usage.
4. At the paid transition, check the supplied AI-credit paid usage policy.
  Disabled means no metered funding, not cancellation of the included portion.
5. Route paid demand through the resolved cost center or billing organization,
  otherwise the enterprise budget. Enterprise restrictions also apply unless
  the cost center has explicit enterprise-budget exclusion.
6. Project paid funding only up to the lowest applicable hard-budget headroom.
  Positive alert-only and absent budgets add no cap. Apply the explicit USD 0
  assumption above, warning when relevant.
7. Report projected included, metered, and blocked portions. The first hard stop
  is the control limiting funded monthly consumption, not necessarily the first
  node visited. A tighter funding budget can stop usage before a larger ULB.
8. Leave all scenario values unchanged. Repeated previews are deterministic;
  these aggregates do not guarantee live per-response cutoffs or rollbacks.

There is no automatic fallback to a cheaper model after a budget is exhausted.
A blocked user stays blocked until the next calendar-month reset or an
administrator raises the relevant limit.

## Scenario outcomes

- **No ULB, pool available:** AI-credit funding is permitted from the shared
  pool. A heavy user can consume a disproportionate share.
- **No ULB, pool exhausted, paid usage disabled:** funding blocks at pool
  exhaustion. Any included portion remains in the monthly projection.
- **No ULB, paid usage enabled, no hard spending budget:** no configured budget
  cap applies; other account, payment, and service limits still apply.
- **No ULB, paid usage enabled, hard spending budget:** metered funding is
  projected up to the lowest applicable remaining hard-budget headroom.
- **ULB below desired usage:** that user blocks at the ULB even when the pool and
  spending budgets still have room; the within-ULB portion can still be funded.
- **ULB above desired usage, pool available:** funding is permitted from the
  pool.
- **ULB above desired usage, pool exhausted:** paid policy and scoped spending
  limits decide whether funding is permitted.
- **Cost center included cap with block:** that team's usage stops at its own
  seat-funded share before it can consume another team's pool allocation.
- **Cost center included cap with paid overage:** excess becomes projected
  metered usage, subject to paid policy, the cost center budget, and normally
  the enterprise budget.
- **Cost center cap has room but global pool is exhausted:** project any global
  pool remainder and metered excess, then apply paid policy and metered budgets.
  Cost-center cap headroom cannot create additional included credits.
- **Legacy annual Pro/Pro+:** this applies only to the existing annual cohort
  retained on request-based billing after June 1, 2026. AI-credit outcomes are
  not applicable; premium requests and model multipliers remain controlling
  until the term ends. The cohort-specific legacy page says the account
  automatically downgrades to Copilot Free unless the user changes plans first.
- **Individual UBB:** consume the dated included allowance first, then upgrade,
  request account-authorized additional usage, or wait for the 00:00:00 UTC
  first-of-month reset. An upgrade retains the same total monthly demand and
  does not reset earlier consumption. Account, payment, service, and budget
  enforcement can still limit additional usage.

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

For cost center included controls, the simulator separates demand for included
and metered funding. It limits the metered portion by applicable budget headroom
instead of rejecting the entire monthly demand. For example, 100 desired credits
with 60 included and paid usage off projects 60 funded and 40 blocked. A USD 0.20
hard budget with paid usage on allows 20 metered credits, leaving 20 blocked.

Pool consumption inputs exclude the target user's total monthly demand. Metered
spend inputs similarly exclude demand being projected to avoid double counting.
The planner does not schedule users, replay mid-cycle changes, or predict who
consumes the last shared credits. GitHub Actions charges, unlicensed or bot-paid
code-review attribution, live access checks, and subscription fees are outside
the calculation. Partial forecasts are not guarantees of live billing precision.

All numeric presets are editable. The simulator never invents a Free or Student
allowance; the user must enter the allowance shown in their account.

## Official sources

Checked 2026-09-12:

- [Usage-based billing for organizations and enterprises](https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing)
- [Budgets for organizations and enterprises](https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/budgets)
- [Setting up budgets](https://docs.github.com/en/billing/how-tos/set-up-budgets)
- [Budgets and alerts](https://docs.github.com/en/billing/concepts/budgets-and-alerts)
- [Cost-center allocation](https://docs.github.com/en/billing/reference/cost-center-allocation)
- [Code review](https://docs.github.com/en/copilot/concepts/agents/code-review)
- [Usage-based billing for individuals](https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing)
- [Plans for GitHub Copilot](https://docs.github.com/en/copilot/get-started/plans)
- [Viewing and changing your GitHub Copilot plan](https://docs.github.com/en/copilot/how-tos/manage-your-account/view-and-change-your-copilot-plan)
- [Models and pricing for GitHub Copilot](https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing)
- [What changed with Copilot billing (legacy)](https://docs.github.com/en/copilot/reference/copilot-billing/request-based-billing-legacy/what-changed-with-billing)
- [Copilot SDK session limits](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/session-limits)
