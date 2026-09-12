# GitHub Copilot Credit Planner

An interactive wizard for projecting GitHub Copilot AI credit consumption across individual and managed licenses, shared pools, cost centers, ULBs, paid-usage policies, and scoped spending budgets.

## Run locally

```shell
npm install
npm run dev
```

Open `http://127.0.0.1:5173/` when Vite starts.

## Validate

```shell
npm run check
```

This runs the simulator tests, TypeScript production build, and Markdown linting. Billing rules were checked against GitHub Docs on September 12, 2026; [research notes](docs/research.md) distinguish documented rules from forecast assumptions. The app renders the Mermaid block from [the decision-flow document](docs/decision-flow.md) directly, and route tests cover every edge.

## Forecast contract

The planner projects partial monthly funding, not all-or-nothing request authorization. With 100 credits desired, 60 included, and paid usage disabled, it projects 60 funded and 40 blocked. Previews do not change balances or execute real work.

Personal additional usage requires an explicit account authorization input. An authorized account can have a hard-stop budget, an alert-only budget, or no configured budget cap; payment and service limits can still apply. Existing saved scenarios retain hard enforcement, and older scenarios with no personal budget require authorization to be reconfirmed. Subscription history is not used to infer authorization.

GitHub's documentation conflicts on USD 0 spending budgets. The planner conservatively treats zero as a hard stop even with Stop usage off, and displays a warning when this affects paid demand. Positive alert-only budgets add no cap; real notifications require opt-in. Use active ULB overrides and spend tracked since each budget's creation, excluding the demand being projected.

Access, model eligibility, runtime policy, GitHub Actions charges, special unlicensed code-review attribution, and subscription fees are outside this forecast. The preserved .NET Cost Compass analysis describes a separate product, not this TypeScript implementation.

## Deploy to GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` validates, builds, and deploys the application whenever `main` is pushed. It obtains the site's base path from GitHub Pages, so both repository sites and root or custom-domain sites resolve Vite assets correctly.

1. Push this project to a GitHub repository using `main` as the default branch.
2. Open **Settings**, then **Pages** in the GitHub repository.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push to `main`, or run **Deploy to GitHub Pages** manually from the **Actions** tab.

After deployment, the workflow summary links to the published site. To inspect the production build locally, run `npm run build` followed by `npm run preview`.

The simulator is a planning aid. Confirm production settings and current allowances in the relevant GitHub billing account before rollout.
