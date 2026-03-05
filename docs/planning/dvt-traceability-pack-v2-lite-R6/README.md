# DVT+ Traceability & Design Quality Pack (Modular, ARC-tiered)

**Bundle date:** 2026-03-04  
**Purpose:** Provide a lightweight, operable replacement for ADR-0000b by introducing a modular, config-driven approach:

- ARC detection based on **explicit declaration** + **policy config**, not brittle heuristics
- Evidence captured with minimal, useful artifacts
- Standardized developer workflows via VS Code tooling + CI checks
- Explicit linkage to design-quality criteria (ADR-012)

## Contents

- `ADR-0000c-modular-traceability-policy.en.md` — Normative policy (replaces ADR-0000b)
- `ADR-012-design-quality-criteria.en.md` — Design quality criteria (root checklist)
- `POLICY-arc-policy.yaml.md` — Policy-as-data (YAML) with triggers and requirements
- `TEMPLATE-pr-checklist.md` — PR body template (developer declaration)
- `TEMPLATE-evidence-doc.md` — Evidence Doc template (ED)
- `TEMPLATE-risk-register.md` — Risk register template
- `GUIDE-ci-implementation.md` — CI wiring, scripts, and examples
- `TOOLS-vscode-productivity.md` — Standard toolchain & extensions for VS Code
- `AI-GUIDE-doc-generation.md` — How to generate ED docs consistently (human/AI)

## How to use (quick)

1. Copy `POLICY-arc-policy.yaml.md` → `.arc-policy.yaml` in repo root.
2. Add the PR template from `TEMPLATE-pr-checklist.md`.
3. Add the CI scripts described in `GUIDE-ci-implementation.md`.
4. Install the VS Code tools in `TOOLS-vscode-productivity.md`.
5. For ARC-2/3, create an Evidence Doc using `TEMPLATE-evidence-doc.md`.

## Quick start for new projects

1. Copy into your repo:

- `ADR-0000c-modular-traceability-policy.en.md`
- `ADR-012-design-quality-criteria.en.md`
- `.arc-policy.yaml`
- `TEMPLATE-pr-checklist.md`
- `TEMPLATE-evidence-doc.md`
- `tools/ci/*`
- `tools/risk/*`
- `.vscode/*` (optional but recommended)

2. Add directories:

- `docs/evidence/`
- `docs/risk-register/<domain>/`

3. Add CI workflow:

- Use the example in `GUIDE-ci-implementation.md`

4. Add local scripts:

```json
{
  "scripts": {
    "validate:arc": "node tools/ci/arc-check.mjs > arc.json && ARC_JSON=arc.json node tools/ci/doc-check.mjs",
    "risk:index": "node tools/risk/generate-index.mjs"
  }
}
```

5. Communicate to the team:

- ARC-2/3 require an Evidence Doc (ED).
- Risks are added as per-risk files under `docs/risk-register/<domain>/R-*.md`.

## Domain-specific standards

See `docs/guides/` for API design, EDA, observability, 12-factor, advanced security/privacy, SBOM.

## DVT+ specific guides

Under `docs/guides/`:

- `GUIDE-determinism-replay.md`
- `GUIDE-append-authority-eventstore.md`
- `GUIDE-lineage-openlineage-marquez.md`
- `GUIDE-dbt-artifacts-ingestion.md`
- `GUIDE-adapter-semantics.md`
- `GUIDE-typescript-strictness.md`
