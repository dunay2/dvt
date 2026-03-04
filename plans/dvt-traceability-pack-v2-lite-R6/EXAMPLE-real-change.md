---
title: Example — Contract change ARC-2 end-to-end
status: Example
date: 2026-03-04
---

# Example — Contract change ARC-2 end-to-end

## Scenario

Change: add optional field `emittedBy` to `run-event` contract.

Changed files:

- `specs/contracts/run-event.schema.json`
- `packages/@dvt/engine/src/runEvents/emit.ts`
- `packages/@dvt/engine/test/runEventContract.test.ts`

Policy effect:

- `.arc-policy.yaml` trigger `contracts` → minimum ARC-2
- Requires: Evidence Doc + risk update

## PR body (snippet)

- ARC Level: **ARC-2**
- Mark relevant groups:
  - Contracts & Schemas: Applicable
  - Persistence/Ordering: N/A
  - Security: N/A
  - Operations: Applicable (logging facet)
- Evidence:
  - Tests: `packages/@dvt/engine/test/runEventContract.test.ts`

## Evidence Doc (ED) — `docs/evidence/ED-20260304-run-event-emittedBy.md`

```md
---
title: ED-20260304 — run-event emittedBy field
status: Final
date: 2026-03-04
owners: engine
arc_level: ARC-2
breaking: false
policy_version: 1
code_refs:
  - specs/contracts/run-event.schema.json
  - packages/@dvt/engine/src/runEvents/emit.ts
contracts_touched:
  - id: run-event
    version: 2.2.0
    path: specs/contracts/run-event.schema.json
evidence:
  pr: 1234
  tests:
    - packages/@dvt/engine/test/runEventContract.test.ts
  code:
    - packages/@dvt/engine/src/runEvents/emit.ts
risk_update:
  required: true
  file: docs/risk-register/engine/R-042.md
rollout:
  required: false
  notes: ''
compatibility:
  required: false
  matrix: ''
---

# Evidence Doc (ED): run-event emittedBy field

## What changed (bullet notes)

- Added optional `emittedBy` field for producer attribution.
- Updated emitter to populate the field in engine-originated events.

## Evidence (paths/links)

- Tests: `packages/@dvt/engine/test/runEventContract.test.ts`
- Code: `packages/@dvt/engine/src/runEvents/emit.ts`
- Schema: `specs/contracts/run-event.schema.json`

## Risks (only real ones)

- New risks: low — consumers may incorrectly assume field is always present (mitigation: keep optional; update docs/tests).
```

## Risk register update — `docs/risk-register/engine/R-042.md` (diff-style)

Add a row:

| ID    | Description                                    | Severity | Probability | Status     | Owner  | Mitigation                                 | Links                           |
| ----- | ---------------------------------------------- | -------- | ----------- | ---------- | ------ | ------------------------------------------ | ------------------------------- |
| R-042 | Consumers treat new optional field as required | Low      | Medium      | Mitigating | engine | Keep optional; add contract golden vectors | ED-20260304-run-event-emittedBy |

## CI outcome

- `arc-check.mjs` → ARC-2 effective
- `doc-check.mjs` verifies:
  - ED exists
  - required front-matter keys exist
  - `evidence.tests` is present for ARC-2
  - risk register updated (policy required)
- Standard checks run: `lint`, `test`, `schema-validate`, `contract-golden`
