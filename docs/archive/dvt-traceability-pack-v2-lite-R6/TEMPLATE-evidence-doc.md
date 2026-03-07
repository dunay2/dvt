---
title: ED-YYYYMMDD — <short name>
status: Draft | Final | Superseded
date: YYYY-MM-DD
owners: <team>
arc_level: ARC-2 | ARC-3
breaking: false
code_refs:
  - <paths/globs>
evidence:
  pr: <link or id>
  tests: []
  code: []
---

# Evidence Doc (ED): <short name>

## What changed (bullets)

- ...

## Evidence (paths/links)

- Tests: `...`
- Code: `...`
- Schemas/contracts (if any): `...`

## Risks (only real ones)

- New risks: none | list + link to risk IDs
- Residual risks: ...

## Optional sections (only if needed)

### Design notes (ADR-012)

- Relevant criteria: ...
- Verification: tool/tests/reviewer

### Rollout / compatibility (ARC-3 or policy-required)

- Rollout: ...
- Compatibility/migration: ...

### Diagram (optional)

```mermaid
flowchart LR
  A[Change] --> B[Contract/Boundary]
  B --> C[Runtime behavior]
  C --> D[Evidence: tests]
```
