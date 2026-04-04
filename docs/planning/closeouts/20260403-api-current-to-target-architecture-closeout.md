---
slice: api-current-to-target-architecture
date: 2026-04-03
author: AI (GPT-5)
last_reviewed: 2026-04-03
status: Accepted
---

# Closeout: API Current To Target Architecture

## Think-First Analysis

- Problem summary:
  The repository already documents the API surface in fragments, but it does
  not yet provide one current, code-grounded architecture page that explains
  the present `apps/api` system, the target API shape, and the governed task
  route between both states in one place.
- Root cause:
  The active API truth is split across status docs, a backend contractual
  inventory, planning reviews, and component pages. Older component drafts in
  `docs/architecture/components/api/` are no longer reliable enough to serve
  as the main walkthrough.
- Constraints and invariants:
  `AGENTS.md`; `docs/planning/status/governance-document-rule-inventory.md`;
  `docs/guides/ai-work-protocol.md`;
  `docs/architecture/reference-architecture.md`;
  `docs/architecture/system-delivery-status.md`;
  `docs/guides/dvt-code-style-solid-hexagonal-cqrs.md`;
  `docs/planning/status/canonical-doc-code-matrix.md`;
  `docs/planning/state/planning-control-tower.md`;
  `docs/planning/state/agent-lane-a.yaml`;
  `docs/planning/state/agent-lane-c.yaml`.
- Options considered:
  1. Edit only `docs/architecture/components/api/index.md`.
  2. Create a new planning proposal for the target API roadmap.
  3. Add one component-architecture page under `docs/architecture/components/api/`
     and route it through existing planning tasks.
- Selected option and rationale:
  Option 3. It gives the user one discoverable architecture document without
  creating a duplicate roadmap. The transition plan can reuse already governed
  lane tasks instead of inventing a second backlog.
- Rejected alternatives:
  Option 1 was too small for the requested depth and would overload the index
  page. Option 2 would create a parallel planning artifact when the lane/task
  registry already exists.

## Pre-Implementation Brief

- Mode:
  Full
- Scope:
  Create one API architecture page, link it from active architecture entry
  points, and record the work in closeout/planning traceability surfaces.
- Touched files or paths:
  `docs/architecture/components/api/`,
  `docs/architecture/domain-api.md`,
  `docs/planning/closeouts/`,
  `docs/planning/state/agent-lane-a.yaml`.
- Expected outcome:
  Readers can understand the current API architecture, the target API
  architecture, and the governed migration tasks from one canonical component
  page.
- Risks and mitigations:
  Risk: duplicating or contradicting existing roadmap tasks.
  Mitigation: route all transition work through existing Lane A/C/D/E task IDs.
- Out-of-scope items:
  Runtime behavior changes, contract changes, new endpoints, or new planning
  tasks.
- Validation plan:
  `pnpm docs:sync`, `pnpm docs:workboard:generate`, `pnpm docs:pr:fast`,
  `pnpm verify:prepush`.
- Test coverage plan:
  Documentation-only slice. Validation focuses on docs generation, docs quality,
  planning artifact generation, and pre-push gates.
- Libraries evaluated:
  None evaluated - documentation-only slice.

## Implementation

- added `docs/architecture/components/api/api-current-to-target-architecture.md`
  as the canonical API walkthrough for:
  - current system
  - target system
  - governed transition tasks
- updated `docs/architecture/components/api/index.md` to route readers to the
  new walkthrough and align the short component summary with the real cancel
  route
- updated `docs/architecture/domain-api.md` to link the new API walkthrough
  from the active domain surface
- updated `docs/planning/state/agent-lane-a.yaml` under `DOC-ARCH-01` so the
  architecture-reconciliation tracker records this new component artifact

## Validation Evidence

- `pnpm docs:sync`
  - Passed.
- `pnpm docs:workboard:generate`
  - Passed.
- `pnpm docs:pr:fast`
  - Passed.
  - This run completed the fast docs preflight and executed the repo
    pre-push/doc drift gates inside the wrapper.
- `pnpm verify:prepush`
  - Passed.

## No-Debt / No-Stub Evidence

- No runtime behavior, contract, or route semantics were changed.
- No new planning lane or parallel backlog was created; the target route
  reuses existing governed task IDs.
- No rule, hook, lint, type-check, or pre-push gate was disabled or bypassed.
- No stub, placeholder implementation, or fake architecture was introduced.
