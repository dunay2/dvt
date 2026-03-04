---
title: Risk Register — Per-risk files (default) + index generation
status: Guide
---

# Risk Register — Per-risk files (default)

## Why per-risk files?

Markdown tables in a single domain file create frequent merge conflicts.  
Default approach: **one file per risk**.

## Structure

```
docs/risk-register/
  engine/
    R-042.md
    R-043.md
  security/
    R-010.md
  INDEX.md        # generated
```

## Risk file template (example)

```md
---
id: R-042
domain: engine
severity: Low | Medium | High
probability: Low | Medium | High
status: Open | Mitigating | Accepted | Closed
owner: engine
created: 2026-03-04
links:
  - ED-20260304-run-event-emittedBy
---

# R-042 — Consumers treat optional field as required

## Description

...

## Mitigation

...

## Notes

...
```

## Generating an index

Use `tools/risk/generate-index.mjs` to generate `docs/risk-register/INDEX.md`.
