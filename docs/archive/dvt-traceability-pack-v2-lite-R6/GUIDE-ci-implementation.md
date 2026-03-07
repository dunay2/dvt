---
title: CI Implementation Guide (Config-driven ARC enforcement)
status: Guide
---

# CI Implementation Guide — Config-driven ARC enforcement

This guide describes a **minimal**, maintainable CI implementation:

- policy in `.arc-policy.yaml`
- a small script reads changed files and policy
- a second script validates required artifacts + ED front-matter
- CI runs required checks (lint/test/schema/golden)

## 1) Why config-driven?

- Avoid hardcoded repo paths in scripts.
- Change policy by editing YAML, not code.
- Keep ADR text stable; evolve policy separately.

## 2) Minimal scripts

Recommended scripts (Node, no exotic dependencies):

- `tools/ci/arc-check.mjs`
- `tools/ci/doc-check.mjs`

Use standard parsers:

- YAML: `js-yaml` (common, stable)
- Markdown front-matter: simple delimiter parsing

## 3) `tools/ci/arc-check.mjs` (concept)

Responsibilities:

- load `.arc-policy.yaml`
- compute changed files (`git diff --name-only base...head`)
- evaluate triggers → determine `effective_arc_level`
- output `arc.json`:
  - declared arc level (from PR template, optional)
  - effective arc level (policy-enforced)
  - required artifacts
  - required checks

**Note:** reading PR body in GitHub Actions requires API calls; simplest approach:

- require developer to commit `docs/evidence/...` only when needed,
- and rely on policy triggers to enforce artifacts.
  PR checklist enforcement can be done later (bot comment), or via conventional commits/labels.

## 4) `tools/ci/doc-check.mjs` (concept)

Responsibilities:

- read `arc.json` and determine requirements
- validate existence:
  - ED docs for ARC-2/3 (if required)
  - risk register updates (if required)
- validate ED front-matter has **minimum keys** and that `evidence.tests` is present if policy requires tests.

Avoid rigid heading validation; validate **minimum useful payload**.

## 5) GitHub Actions wiring (example)

```yaml
name: arc-policy

on:
  pull_request:

jobs:
  arc-policy:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: ARC policy evaluate
        run: node tools/ci/arc-check.mjs > arc.json

      - name: Docs / evidence validate
        run: ARC_JSON=arc.json node tools/ci/doc-check.mjs

      - name: Required checks (example)
        run: |
          pnpm lint
          pnpm test
          # schema checks / golden vectors as configured
```

## 6) Standard checks (recommendations)

- `lint`: ESLint + TypeScript strict
- `test`: unit/integration
- `schema-validate`: Ajv validation for JSON Schemas
  - Ajv: https://ajv.js.org/
- `contract-golden`: run contract golden vectors (deterministic fixtures)
- `security-scan`: dependency audit (pnpm audit / osv-scanner)

References:

- GitHub Actions: https://docs.github.com/en/actions
- Ajv: https://ajv.js.org/
- OSV Scanner: https://google.github.io/osv-scanner/

## 7) Local developer command parity

Add a script so developers can run CI-like checks locally:

```json
{
  "scripts": {
    "validate:arc": "node tools/ci/arc-check.mjs > arc.json && ARC_JSON=arc.json node tools/ci/doc-check.mjs"
  }
}
```

This reduces CI churn and standardizes workflow.

## 8) Risk index generation (optional)

If you use per-risk files, generate an index:

```bash
node tools/risk/generate-index.mjs
```

Add as a local script:

```json
{ "scripts": { "risk:index": "node tools/risk/generate-index.mjs" } }
```
