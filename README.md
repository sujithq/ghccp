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

## Deploy to GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` validates, builds, and deploys the application whenever `main` is pushed. It obtains the site's base path from GitHub Pages, so both repository sites and root or custom-domain sites resolve Vite assets correctly.

1. Push this project to a GitHub repository using `main` as the default branch.
2. Open **Settings**, then **Pages** in the GitHub repository.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push to `main`, or run **Deploy to GitHub Pages** manually from the **Actions** tab.

After deployment, the workflow summary links to the published site. To inspect the production build locally, run `npm run build` followed by `npm run preview`.

The simulator is a planning aid. Confirm production settings and current allowances in the relevant GitHub billing account before rollout.
