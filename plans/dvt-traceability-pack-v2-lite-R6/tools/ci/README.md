# tools/ci

## What is this?

Minimal, config-driven CI helpers for ADR-0000c.

- `arc-check.mjs` reads `.arc-policy.yaml` and `git diff` to determine effective ARC level and requirements.
- `doc-check.mjs` enforces required artifacts (Evidence Docs, risk updates) using `arc.json` + policy.

## Local run

```bash
# From repo root:
node tools/ci/arc-check.mjs > arc.json
ARC_JSON=arc.json node tools/ci/doc-check.mjs
```

## Dependencies

These scripts require:

- Node.js
- `js-yaml` (dev dependency)

Ref: https://www.npmjs.com/package/js-yaml
