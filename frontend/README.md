# Traveloop frontend

React interface for trips, itinerary stops, budgets and account settings.

## Run locally

Use Node 22.19+ or Node 24. Start the FastAPI backend as described in the
[project README](../README.md), then run from this directory:

```sh
npm ci
```

Copy `.env.example` to `.env`, adjust `VITE_API_BASE_URL` if needed, and run
`npm run dev`. The default backend address is http://127.0.0.1:8000.

## Checks

```sh
npm run lint
npm test
npm run build
```

For browser checks, install Chromium with `npx playwright install chromium`
and run `npm run test:e2e`. Playwright reports and test results are local output;
CI uploads them as artifacts rather than storing them in Git.
