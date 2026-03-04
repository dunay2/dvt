---
title: AI Guide — Generating Evidence Docs (ED) that pass CI
status: Guide
date: 2026-03-04
---

# AI Guide — Generating Evidence Docs (ED) that pass CI

Goal: produce small, high-signal documents that satisfy ADR-0000c requirements without bureaucracy.

## 1) Input checklist (what you need)

When generating an ED, collect:

- ARC level (ARC-2 or ARC-3)
- changed files (paths)
- contracts touched (id/version/path)
- test paths added/updated
- rollout/compat requirements (ARC-3 or policy trigger)
- risk register target domain

## 2) Use the ED template

Start from `TEMPLATE-evidence-doc.md`.

Minimum fields that should be populated:

- `arc_level`
- `code_refs`
- `contracts_touched` (if any)
- `evidence.tests` (if tests exist)
- `risk_update.*`

## 3) Keep it short

Rules:

- Summary: 3–6 lines
- Plan: optional for ARC-2; mandatory for ARC-3 if risk is high
- Evidence: always include file paths
- Risks: only what is real; link to risk register entry

## 4) Common failure cases (CI)

- Missing front-matter keys (date/owners/arc_level/evidence)
- No evidence links (tests/code)
- Policy requires risk update but risk register file not changed

## 5) Example prompt

"""Generate an Evidence Doc (ED) for ARC-2.
Changed paths:

- specs/contracts/run-event.schema.json
- packages/@dvt/engine/src/...
  Tests:
- packages/@dvt/engine/test/runEventWriteShape.test.ts
  Contracts touched:
- run-event v2.1.0 (specs/contracts/run-event.schema.json)

Risk register domain: engine

Include a Mermaid flow summary."""

References:

- ADR-0000c (modular traceability policy)
- ADR-012 (design quality checklist)

## 6) Full example

See `EXAMPLE-real-change.md` for an end-to-end ARC-2 scenario with a real ED and risk register diff.

## 7) When information is missing

If inputs are incomplete (missing test paths, missing contract IDs, unclear ARC level):

- Generate the ED with explicit placeholders like:
  - `[TEST PATHS PENDING]`
  - `[CONTRACT ID/VERSION PENDING]`
- Add a short “Missing info” bullet list at the end of the ED.
- Recommend the human fills those before merging.

Do **not** invent paths or IDs.

## 8) ARC-3 example

See `EXAMPLE-arc3-breaking-change.md` for a complete ARC-3 scenario with rollout/compat notes and per-risk file update.

## 9) Using standards guides

If the change touches a known domain area, reference the relevant guide(s) in the ED (body, optional):

- API/contracts: `docs/guides/GUIDE-api-design.md`
- Event-driven / outbox: `docs/guides/GUIDE-event-driven.md`
- Observability: `docs/guides/GUIDE-observability.md`
- 12-factor: `docs/guides/GUIDE-12factor.md`
- Advanced security/privacy: `docs/guides/GUIDE-security-advanced.md`
- SBOM/supply chain: `docs/guides/GUIDE-sbom-supplychain.md`
