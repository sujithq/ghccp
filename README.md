# Copilot Credit Planner

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

This runs the simulator tests, TypeScript production build, and Markdown linting. The billing research and decision-flow source are in `docs/` and were last verified against GitHub Docs on August 14, 2026.

The simulator is a planning aid. Confirm production settings and current allowances in the relevant GitHub billing account before rollout.
