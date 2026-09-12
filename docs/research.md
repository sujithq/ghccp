# GitHub Copilot usage-based billing research

Research snapshot: 2026-09-12

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
| Cost center budget | Metered only | Cost center | Hard only with stop enabled; $0 blocks only when stop is enabled |
| Organization budget | Metered only | Billing organization | Hard only with stop enabled; $0 blocks only when stop is enabled |
| Enterprise budget | Metered only | Enterprise | Hard only with stop enabled; $0 blocks only when stop is enabled |
| Cost center exclusion | Metered only | Cost center | Removes that cost center's spend from the enterprise cap |
| Model policy | Before model use | Organization or enterprise | Can remove expensive models, but is not a deterministic credit cap |
| CLI or SDK session limit | During a local response/session | User/session | Soft limit; a model response can cross the configured value |

Current official individual billing, plans, and plan-management pages checked on
2026-09-12 do not establish a current/former GitHub Mobile exclusion for
additional usage. The wizard must treat additional-usage authorization as an
account-provided state rather than a universal Mobile-history rule.

The **Stop usage when budget limit is reached** option is off by default for
cost center, organization, and enterprise budgets. Without it, a budget is an
alert and charges continue beyond the entered amount. ULBs do not have this
toggle because they always stop usage. A missing or alert-only budget imposes
no cap of its own, but does not override other applicable hard budgets or
account, payment, and service limits.

Content exclusion, firewall, indemnity, and feature availability policies are
important enterprise controls, but they do not change the billing evaluation
order. The wizard lists model restrictions as an advisory cost control and does
not treat non-billing policies as monetary caps.

## Evaluation order

For an AI-credit-consuming request on a Business or Enterprise license:

1. Resolve the billed identity, licensing organization, and cost-center
   attribution. Use that same identity for every downstream applicability and
   entitlement decision.
2. Resolve the effective ULB: individual, otherwise cost center, otherwise
   universal. Compare the incremental request with `limit - consumed`. If the
   request exceeds that headroom, block immediately. No pool or spending budget
   can extend a ULB.
3. If a cost center included usage control applies, compare its remaining
   auto-calculated seat-funded cap with the remaining global shared pool. The
   lower value is the usable included headroom. Project the included allocation
   and metered remainder; do not consume either before all gates permit it.
4. At the paid transition, check the effective AI-credit paid usage policy. If
   disabled, reject the projection and preserve balances.
5. If paid usage is allowed, route metered spend through the resolved cost
   center or billing organization. Users outside those scopes use the
   enterprise budget.
6. Enterprise limits also constrain narrower scopes unless a cost center has
   enterprise-budget exclusion. Every applicable hard limit must cover the
   complete proposed charge; the lowest remaining headroom blocks first.
7. After hard checks pass, emit applicable alert-only thresholds. A missing or
   alert-only budget adds no cap of its own, while other account, payment,
   service, and applicable hard-budget limits continue to apply.
8. Accept and allocate the projected included and metered amounts only after
   every modeled gate permits the request.

There is no automatic fallback to a cheaper model after a budget is exhausted.
A blocked user stays blocked until the next calendar-month reset or an
administrator raises the relevant limit.

## Scenario outcomes

- **No ULB, pool available:** AI-credit funding is permitted from the shared
  pool. A heavy user can consume a disproportionate share.
- **No ULB, pool exhausted, paid usage disabled:** funding blocks at pool
  exhaustion and projected balances remain unchanged.
- **No ULB, paid usage enabled, no hard spending budget:** no configured budget
  cap applies; other account, payment, and service limits still apply.
- **No ULB, paid usage enabled, hard spending budget:** metered funding is
  permitted only while every applicable hard budget covers the proposed charge.
- **ULB below desired usage:** that user blocks at the ULB even when the pool and
  spending budgets still have room.
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
  first-of-month reset. Account, payment, service, and budget enforcement can
  still limit additional usage.

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

For cost center included controls, the simulator separates credits projected for
paid overage from demand that would draw from the global pool. It compares the
resulting projected metered dollars with every applicable hard-stop budget. It
reports projection risk when ordering among users would determine who gets the
last remaining pooled credits.

All numeric presets are editable. The simulator never invents a Free or Student
allowance; the user must enter the allowance shown in their account.

## Official sources

Checked 2026-09-12:

- [Usage-based billing for organizations and enterprises](https://docs.github.com/en/copilot/concepts/billing/organizations-and-enterprises/usage-based-billing)
- [Budgets for organizations and enterprises](https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/budgets)
- [Setting up budgets](https://docs.github.com/en/billing/how-tos/set-up-budgets)
- [Usage-based billing for individuals](https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing)
- [Plans for GitHub Copilot](https://docs.github.com/en/copilot/get-started/plans)
- [Viewing and changing your GitHub Copilot plan](https://docs.github.com/en/copilot/how-tos/manage-your-account/view-and-change-your-copilot-plan)
- [Models and pricing for GitHub Copilot](https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing)
- [What changed with Copilot billing (legacy)](https://docs.github.com/en/copilot/reference/copilot-billing/request-based-billing-legacy/what-changed-with-billing)
- [Copilot SDK session limits](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/session-limits)
