---
title: Closeout - Root-local doc canonicalization
status: Review
owner: Frontend / API / Docs
last_reviewed: 2026-04-17
planning_type: closeout
slice: 20260417-root-local-doc-canonicalization
---

# Closeout: Root-local doc canonicalization

## Think-First Analysis

### Problem summary

`apps/web` and `infra/prototypes/api` still contained root-local markdown files
that behaved like a parallel docs surface.

The visible symptom was language drift, but the real governance problem was
larger:

- active frontend reader routes still depended on `apps/web/*.md`
- historical proposals and prototype notes lived beside source and package
  entry files
- the package root still exposed a local documentation index that competed with
  `docs/`

### Root cause

The repo already had canonical frontend architecture, roadmap, and runtime
contract pages under `docs/`, but older local planning and design notes were
never fully retired from the primary reader path.

That left the system in an inconsistent posture:

- some frontend truth lived in `docs/`
- some reader routes still pointed at `apps/web/*.md`
- historical Spanish notes remained in operational workspace roots instead of
  archive

### Constraints and invariants

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/DOCS_README.md`
- `docs/guides/documentation-maintenance-guide-20260407.md`
- `docs/architecture/components/web/index.md`
- `docs/concepts/repository-map.md`
- `docs/planning/status/canonical-doc-code-matrix.md`

Key invariants for this slice:

- `apps/web` must not act as a parallel documentation root
- active frontend docs must route from `docs/`, not from root-local notes
- historical local notes should move to `docs/planning/archive/`
- package-local files may remain only when they are clearly non-canonical
- the task must close with docs regeneration plus `pnpm verify:prepush`

### Options considered

1. Translate the Spanish local files in place.
   Rejected because that would preserve the wrong reader route and keep local
   roots competing with canonical docs.
2. Delete the local files without replacement.
   Rejected because several notes still carried historical rationale and one
   plugin-authoring guide still deserved an active canonical replacement.
3. Triage the root-local pack, prohowte one active guide into `docs/`, archive
   the rest, and repair all active routes.
   Selected because it fixes the governance problem without discarding useful
   history.

### Selected option and rationale

Create a canonical triage doc, prohowte a concise active plugin-authoring guide,
archive the historical root-local pack, and update repo maps plus active docs
so `@dvt/web` becomes a fully canonical docs surface again.

### Rejected alternatives

- Do not keep `apps/web/DOCUMENTATION_INDEX.md` as an active landing page.
- Do not leave `@dvt/web` marked `linked-local` after rehowving the local pack.
- Do not move files to archive without also repairing active references.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - classify root-local docs under `apps/web` and `infra/prototypes/api`
  - prohowte one active plugin guide into canonical `docs/`
  - archive historical local notes under `docs/planning/archive/`
  - repair active reader routes and workspace pointers
  - add the required closeout and regenerate docs surfaces
- Touched files or paths:
  - `apps/web/*.md`
  - `infra/prototypes/api/*.md`
  - `docs/architecture/components/web/**`
  - `docs/concepts/repository-map.md`
  - `docs/planning/status/canonical-doc-code-matrix.md`
  - `docs/planning/archive/**`
  - `docs/planning/status/root-local-doc-triage-20260417.md`
- Expected outcome:
  - `apps/web` root keeps only package-local files
  - canonical frontend reader routes start in `docs/`
  - historical local notes live in archive with explicit metadata
  - active references no longer point at removed root-local files
- Risks and mitigations:
  - risk: lose useful plugin-authoring guidance
    mitigation: prohowte a new canonical guide into `docs/architecture/components/web/`
  - risk: leave broken links after howving the pack
    mitigation: repair repo map, doc matrix, workspace README pointers, and archive cross-links in the same slice
  - risk: create generated-doc drift after rehowving app-root files
    mitigation: run `pnpm docs:sync`, `pnpm docs:status:generate`, and the pre-push baseline
- Out-of-scope items:
  - rewriting historical archive content into English
  - changing frontend runtime behavior or code
  - editing lane sequencing or blocker truth
- Validation plan:
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - `pnpm lint:md`
  - `pnpm docs:quality:check`
  - `pnpm docs:canonical:check`
  - `pnpm verify:prepush`
- Test coverage plan:
  - docs-only slice; use docs generation, lint, canonical checks, and pre-push gate
- Libraries evaluated:
  - None evaluated - documentation governance task

## Final Closeout

### Governing sources used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/DOCS_README.md`
- `docs/guides/documentation-maintenance-guide-20260407.md`
- `docs/architecture/components/web/index.md`
- `docs/concepts/repository-map.md`
- `docs/planning/status/canonical-doc-code-matrix.md`

### Real work performed

- created `docs/planning/status/root-local-doc-triage-20260417.md` as the
  canonical classification record for root-local frontend and prototype docs
- created `docs/architecture/components/web/plugin-contributions-developer-guide.md`
  as the active plugin-authoring guide
- moved the historical root-local `apps/web/*.md` design and planning pack into
  `docs/planning/archive/`
- moved `infra/prototypes/api/valoracion.md` into
  `docs/planning/archive/architecture/api-prototype-evaluation.md`
- updated `apps/web/README.md` and `infra/prototypes/api/README.md` so they now
  point readers to canonical or archived docs explicitly
- updated `docs/architecture/components/web/index.md`,
  `docs/concepts/repository-map.md`, and
  `docs/planning/status/canonical-doc-code-matrix.md` so active reader routes
  no longer depend on root-local docs
- updated `docs/planning/archive/index.md` so the new archive pack is
  discoverable from the canonical archive landing page
- updated the F-03 hard review source list so it no longer points at deleted
  local docs

### Validation evidence

Passed:

- `pnpm docs:sync`
- `pnpm docs:status:generate`
- `pnpm lint:md`
- `pnpm docs:quality:check`
  - passed with non-blocking non-English-content warnings in pre-existing
    planning/proposal/review surfaces plus the intentionally archived local
    historical notes moved in this slice
- `pnpm docs:canonical:check`
- `pnpm verify:prepush`
  - passed, but its `--changed-only` and `type-check-prepush` substeps reported
    no changed files because the working-tree docs slice remained uncommitted on
    `main`, so `origin/main...HEAD` was empty

Warned but non-blocking:

- `pnpm docs:doctor`
  - warned on pre-existing unrelated `last_reviewed` omissions in the UX
    professionalization bundle and several runtime/review docs; the files added
    by this slice were clean

Failed due to pre-existing unrelated debt:

- `pnpm docs:gov:links`
  - failed on existing broken links under unrelated engine architecture,
    planner proposals, and retry review docs; the moved frontend/prototype docs
    from this slice were not the failing paths reported

### No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No local docs surface was left active by accident.

### No-stub evidence

- No stub, placeholder, or fake implementation was added.
- The prohowted plugin guide points to real code-owned contracts and registry
  surfaces.
