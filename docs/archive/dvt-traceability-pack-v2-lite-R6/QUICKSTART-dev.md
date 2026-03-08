---
title: Quickstart — What to do in your PR
status: Guide
---

# Quickstart — What to do in your PR

## Step 1) Decide ARC level

Use the ARC levels from ADR-0000c.

- ARC-0: normal change
- ARC-1: minor architectural impact
- ARC-2: contracts/boundaries/semantics (non-breaking or controlled)
- ARC-3: breaking/high-risk (security/persistence/ordering/execution critical)

Policy may upgrade your declared level via `.arc-policy.yaml`.

## Step 2) Fill the PR template

Paste `TEMPLATE-pr-checklist.md` into the PR body and:

- set ARC level
- mark only relevant ADR-012 groups (or N/A)

## Step 3) If ARC-2/ARC-3: add an Evidence Doc (ED)

Create: `docs/evidence/ED-YYYYMMDD-<slug>.md` from `TEMPLATE-evidence-doc.md`.

Keep it short:

- bullet notes for “what changed”
- paths/links for evidence
- risks only if real

## Step 4) Risk register (when required)

If policy requires risk update, update `docs/risk-register/<domain>.md`.

## Step 5) Run local validation

Run the same checks CI runs:

```bash
node tools/ci/arc-check.mjs > arc.json
ARC_JSON=arc.json node tools/ci/doc-check.mjs
```

(You can wrap this into `pnpm validate:arc` / `npm run validate:arc`.)
