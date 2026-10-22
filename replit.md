# SaveWise

SaveWise helps people pause before buying, compare demo savings options, and record a buy, wait, or skip decision.

## Run & Operate

- `pnpm --filter @workspace/savewise run dev` — run the SaveWise web app
- `pnpm --filter @workspace/api-server run dev` — run the shared Express API
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate typed API clients from OpenAPI
- Required secret: `MONGODB_URI` — MongoDB Atlas connection string (server only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite
- API: shared Express 5 server
- SaveWise decision persistence: MongoDB Atlas + Mongoose
- API validation/client generation: OpenAPI, Orval, Zod, TanStack Query

The workspace includes a PostgreSQL/Drizzle package for other artifacts; SaveWise does not use it.

## Where things live

- `artifacts/savewise/` — SaveWise Phase 4 decision flow and Phase 5 Future Fund experience
- `artifacts/api-server/src/routes/savewise.ts` — catalog and decision endpoints
- `artifacts/api-server/src/routes/future-fund.ts` — virtual Future Fund summary and contribution approval
- `artifacts/api-server/src/models/decision.ts` — MongoDB decision model
- `artifacts/api-server/src/lib/demo-catalog.ts` — labeled sample catalog data
- `lib/api-spec/openapi.yaml` — API source of truth
- `lib/api-client-react/` and `lib/api-zod/` — generated API clients and validators
- `artifacts/savewise/reference/` — supplied Stitch reference material

## Architecture decisions

- The app is a new artifact; do not modify or reuse an earlier SaveWise project.
- Approved scope includes Phase 4, “Before I Click,” and Phase 5, “Skip It → Grow It.” Do not add Phase 6 or later features without approval.
- Product prices, alternatives, discounts, promo codes, and cashback are sample data, not live Kuwait offers.
- Decisions are associated with a random browser session ID until a later approved authentication phase.
- Skip decisions prepare 10% of the listed price. A separate explicit action can add that amount to the virtual Future Fund simulation.
- Future Fund projections use a fixed 5% annual compound-return assumption, are illustrative only, and never move or invest real money.

## Product

The Phase 4 experience supports demo item search, price/alternative comparison, offer details, cost per use, buy/wait/skip decisions, pending waits, and a decision log. Phase 5 adds an opt-in simulated contribution and 1-, 3-, 5-, and 10-year Future Fund projections.

## User preferences

- Follow the supplied Stitch decision screen and theme notes: warm cream, blue/navy, and gold.
- Keep phase scope exact; wait for approval before starting the next phase.

## Gotchas

- The MongoDB connection is opened lazily by API requests; the server needs `MONGODB_URI` at runtime.
- Waiting decisions become actionable when their stored deadline passes.

## Pointers

- See `.local/skills/pnpm-workspace/SKILL.md` for workspace and package conventions.
