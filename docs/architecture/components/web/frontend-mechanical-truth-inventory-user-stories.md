---
title: Frontend Mechanical Truth Inventory User Stories
status: Active
owner: Web / Architecture
last_reviewed: 2026-06-02
---

# Frontend Mechanical Truth Inventory User Stories

## Stories

### AI preflight before creating frontend behavior

As an AI contributor, I need to query existing frontend surfaces before creating
new behavior so that I reuse the existing route, plugin, rail, or documented gap
instead of inventing a parallel surface.

Acceptance criteria:

- `pnpm planning:db:query frontend-surfaces --path /runs --limit 10` returns the
  `/runs` and `/runs/:runId` surfaces after governance import.
- Results expose screen state, consumed endpoints, stores, TanStack queries, and
  capability gaps.
- Preview and disabled surfaces cannot be confused with operational product
  surfaces in the query output.

### Reviewer capability-closure check

As a reviewer, I need to distinguish route existence from product closure so
that a PR cannot claim a capability is complete solely because a screen renders.

Acceptance criteria:

- `operational-product`, `preview`, `disabled-unsupported`, and `experimental`
  are explicit screen states.
- Operational product rows carry runnable evidence references.
- Capability gaps remain visible next to the screen that exposes the affordance.

### Planning DB governance import

As a planning DB operator, I need frontend surface truth imported from governed
docs so that agents and maintainers can inspect the state without reparsing web
source files in every task.

Acceptance criteria:

- Governance import persists frontend surface rows into the planning query
  store.
- Query filters support route kind, state, path, owner, and limit.
- The import uses the same stale-aware governance projection path as other
  governance read models.
