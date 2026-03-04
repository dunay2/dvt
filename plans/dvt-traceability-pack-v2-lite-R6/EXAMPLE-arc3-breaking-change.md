---
title: Example — Breaking contract change ARC-3 end-to-end
status: Example
date: 2026-03-04
---

# Example — Breaking contract change ARC-3 end-to-end

## Scenario

Change: rename required field `stepId` → `workflowStepId` in a contract used by multiple consumers (breaking).

Changed files:

- `specs/contracts/run-event.schema.json`
- `packages/@dvt/engine/src/...`
- `packages/@dvt/engine/test/...`

Policy effect:

- `.arc-policy.yaml` trigger `security` or `contracts` may force **ARC-3** (breaking change)
- Requires: ED + risk update + rollout/compat notes (in ED body)

## PR body (minimal)

- Declared ARC Level: **ARC-3**
- Link to ED: `docs/evidence/ED-20260304-run-event-breaking-stepid.md`

## Evidence Doc (ED) — `docs/evidence/ED-20260304-run-event-breaking-stepid.md`

```md
---
title: ED-20260304 — run-event breaking field rename
status: Final
date: 2026-03-04
owners: engine
arc_level: ARC-3
breaking: true
code_refs:
  - specs/contracts/run-event.schema.json
  - packages/@dvt/engine/src/...
evidence:
  pr: 2345
  tests:
    - packages/@dvt/engine/test/runEventBreakingChange.test.ts
  code:
    - packages/@dvt/engine/src/...
---

# Evidence Doc (ED): run-event breaking field rename

## What changed (bullets)

- Renamed `stepId` -> `workflowStepId` (required) to align with domain terminology.

## Evidence (paths/links)

- Schema: `specs/contracts/run-event.schema.json`
- Tests: `packages/@dvt/engine/test/runEventBreakingChange.test.ts`

## Risks (only real ones)

- New risk: consumers will break if not updated.
- Mitigation: compatibility window + dual-write + deprecation plan.

## Rollout / compatibility (ARC-3)

- Phase 1: dual-write both fields (producer emits both)
- Phase 2: consumers migrate to `workflowStepId`
- Phase 3: remove `stepId` after 2 releases
- Backward compatibility: maintained during window

## Design notes (ADR-012)

- Contracts & Schemas: version bump and migration notes provided.
- Operations: clear deprecation warnings + safe logging.
```

## Risk file — `docs/risk-register/engine/R-100.md`

```md
---
id: R-100
domain: engine
severity: High
probability: Medium
status: Mitigating
owner: engine
created: 2026-03-04
links:
  - ED-20260304-run-event-breaking-stepid
---

# R-100 — Breaking contract field rename may break consumers

## Description

Consumers expecting `stepId` may fail validation or runtime parsing.

## Mitigation

Dual-write + deprecation window + consumer migration checklist.
```

## CI outcome

- `arc-check.mjs` → ARC-3 effective and prints required actions
- `doc-check.mjs` verifies:
  - ED exists and has required front-matter keys
  - `evidence.tests` present
  - risk file added under `docs/risk-register/engine/`
- Required checks run: `lint`, `test`, `schema-validate`, `contract-golden`, plus any `security-scan` configured.
