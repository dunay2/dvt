---
title: Closeout - Root-local doc English integration
status: Review
owner: Frontend / API / Docs
last_reviewed: 2026-04-17
planning_type: closeout
slice: 20260417-root-local-doc-english-integration
---

# Closeout: Root-local doc English integration

## Think-First Analysis

### Problem summary

The previous root-local docs normalization moved several historical frontend
and prototype notes into `docs/planning/archive/`, but six of those integrated
archive files still contained Spanish content.

That left the repo in an inconsistent posture:

- the files now lived inside the canonical docs tree
- `docs:quality:check` still flagged them as likely non-English
- the canonicalization work was structurally correct but linguistically
  incomplete

### Root cause

The earlier slice prioritized canonical placement and reader-route repair
first. That was correct for rehowving `apps/web` as a parallel docs root, but it
left the archived historical content largely intact instead of converting the
integrated files into English.

### Constraints and invariants

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/DOCS_README.md`
- `docs/guides/documentation-maintenance-guide-20260407.md`
- `docs/SPANISH_TEXTS.md`

Key invariants for this slice:

- documents integrated into the governed docs tree should be in English
- archive docs may stay historical, but they should not remain language-drift
  outliers when they were just integrated by an active slice
- the fix must not recreate a local docs surface under `apps/web`
- the slice must close with docs validation plus `pnpm verify:prepush`

### Options considered

1. Leave the archive files in Spanish because they are historical.
   Rejected because the user explicitly required English for integrated docs,
   and the quality checker still flagged the files.
2. Translate the original local notes line by line.
   Rejected because these archive files no longer need to preserve every local
   drafting detail verbatim; the valuable part is the historical decision
   record.
3. Rewrite each file as an English archive digest that preserves the key
   decisions, intent, and reader route.
   Selected because it keeps historical value while rehowving the language
   debt from the integrated docs surface.

### Selected option and rationale

Replace the six affected archive files with concise English historical digests,
update the language-tracking index, and validate that `docs:quality:check` no
longer reports those files.

### Rejected alternatives

- Do not move the files back out of `docs/`.
- Do not relax docs quality rules to tolerate newly integrated Spanish files.
- Do not keep the archived files as wrappers around Spanish bodies.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - rewrite the six integrated archive files into English digests
  - update language tracking in `docs/SPANISH_TEXTS.md`
  - add the required closeout and refresh closeout navigation
- Touched files or paths:
  - `docs/planning/archive/proposals/frontend-plan-back-alignment.md`
  - `docs/planning/archive/proposals/frontend-sprint-tasks-and-risks.md`
  - `docs/planning/archive/architecture/frontend-plugin-architecture-v1-hybrid.md`
  - `docs/planning/archive/architecture/frontend-dialect-codegen-boundary.md`
  - `docs/planning/archive/architecture/plugin-developer-guide-v1.md`
  - `docs/planning/archive/architecture/api-prototype-evaluation.md`
  - `docs/SPANISH_TEXTS.md`
  - `docs/planning/closeouts/20260417-root-local-doc-english-integration-closeout.md`
- Expected outcome:
  - the integrated archive pack is fully English
  - `docs:quality:check` no longer flags these six files
  - the historical value is preserved as archive digests instead of local
    Spanish note dumps
- Risks and mitigations:
  - risk: lose useful historical context
    mitigation: preserve the main decisions, sequencing, and reasons for
    archival in each English digest
  - risk: reintroduce docs drift by skipping indexes after adding the closeout
    mitigation: run `pnpm docs:sync`
- Out-of-scope items:
  - translating unrelated pre-existing planning and archive warnings elsewhere
    in the repo
  - changing code, contracts, or runtime behavior
- Validation plan:
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm lint:md`
  - `pnpm docs:doctor`
  - `pnpm docs:quality:check`
  - `pnpm docs:canonical:check`
  - `pnpm verify:prepush`
- Test coverage plan:
  - docs-only slice; rely on docs generation and quality gates
- Libraries evaluated:
  - None evaluated - documentation language/governance task

## Final Closeout

### Governing sources used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/DOCS_README.md`
- `docs/guides/documentation-maintenance-guide-20260407.md`
- `docs/SPANISH_TEXTS.md`

### Real work performed

- rewrote the six integrated archive files from the root-local docs cleanup as
  English archive digests
- preserved the archival frontmatter, source path, and superseded-by routing
  for each rewritten file
- updated `docs/SPANISH_TEXTS.md` so the language-tracking log records these
  translations as resolved
- added this closeout and linked it from the canonical closeouts index

### Validation evidence

Passed:

- `pnpm docs:sync`
- `pnpm docs:workboard:generate`
- `pnpm lint:md`
- `pnpm docs:quality:check`
  - passed with pre-existing non-English warnings elsewhere in `docs/planning/**`
  - the six files rewritten in this slice were no longer reported by the check
- `pnpm docs:canonical:check`
- `pnpm verify:prepush`
  - passed, but its `--changed-only` and `type-check-prepush` substeps reported
    no changed files because the working-tree docs slice remained uncommitted on
    `main`, so `origin/main...HEAD` was empty

Warned but non-blocking:

- `pnpm docs:doctor`
  - warned on pre-existing unrelated `last_reviewed` omissions in other
    proposal and review packs; the files touched by this slice were clean

### No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No local docs root was recreated.

### No-stub evidence

- No placeholder translation markers were added.
- Each rewritten file now contains a real English historical digest, not a
  fake wrapper around untranslated content.
