---
title: Web Mechanical Truth Inventory Closeout
status: Accepted
owner: Web / Architecture
date: 2026-06-02
planning_type: closeout
---

# Web Mechanical Truth Inventory Closeout

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/components/web/frontend-command-query-rail-inventory.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/frontend-mechanical-truth-inventory-plan-20260602.md`

## Work Performed

- Added the `ListFrontendMechanicalTruthSurfaces` query rail for DB-first
  frontend route/capability inspection.
- Added `docs/architecture/components/web/frontend-mechanical-truth-inventory.md`
  as the governed inventory for routes, plugins, endpoints, Zustand stores,
  TanStack queries, visible no-backend affordances, capability gaps, and screen
  state.
- Added a planning DB migration, importer, focused parser component, CLI query,
  and tests for `pnpm planning:db:query frontend-surfaces`.
- Repaired the `/runs` native E2E smoke stubs so the route gets the same
  capabilities and workspace-context bootstrap data as the shell.

## Validation Evidence

| Command                                                                                                                                                                                                       | Result | Evidence                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| `pnpm --filter @dvt/web typecheck`                                                                                                                                                                            | passed | 21.71s                                                                      |
| `pnpm --filter @dvt/web lint`                                                                                                                                                                                 | passed | 67.15s                                                                      |
| `pnpm --filter @dvt/web test:ci`                                                                                                                                                                              | passed | 123.60s; warning noise remains in Recharts size and React `act(...)` output |
| `pnpm --filter @dvt/web build`                                                                                                                                                                                | passed | 8.77s; Monaco vendor remains the largest chunk                              |
| `pnpm --filter @dvt/web test:e2e:native -- --spec "cypress/e2e/shell/startup-route-readiness.cy.ts,cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts,cypress/e2e/runs/runs-runtime-contract.cy.ts"` | passed | 36.79s; 6/6 smoke specs passed                                              |
| `pnpm docs:feature-mechanization -- --feature FRONTEND-MECHANICAL-TRUTH-INVENTORY-20260602`                                                                                                                   | passed | feature manifest accepted                                                   |
| `node --test scripts/planning-db-frontend-mechanical-truth-inventory.test.cjs`                                                                                                                                | passed | 6/6                                                                         |
| `node --test scripts/planning-db-query.test.cjs scripts/planning-db-import.test.cjs scripts/planning-db-migrate.test.cjs`                                                                                     | passed | 189/189                                                                     |

## No-Debt And No-Stub Evidence

- No debt entry was added.
- No lint, type, test, governance, or hook rule was relaxed.
- No stub, placeholder, fake adapter, fake success path, or TODO/FIXME branch
  was introduced.
- The query-store projection is backed by governed documentation and imported
  into the planning DB; it is not a standalone ad-hoc local parser.
