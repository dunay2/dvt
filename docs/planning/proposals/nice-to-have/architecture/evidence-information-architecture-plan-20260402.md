---
title: Evidence Information Architecture And Governance Plan
status: Draft
owner: Docs / Architecture / Delivery
last_reviewed: 2026-04-02
planning_type: proposal
---

# Evidence Information Architecture And Governance Plan

## 1. Context and current failure modes

`docs/evidence/` is currently a single flat active surface with one generated
index and no class-level separation.

The result is a mixed proof catalog where materially different artifact types
sit side by side:

- closure evidence such as
  [ED-20260401-executionplanv2-canonical-name-phase2.md](../../../../evidence/critical/ED-20260401-executionplanv2-canonical-name-phase2.md)
- contextual inventories such as
  [ED-20260331-api-parse-error-coupling-inventory.md](../../../../evidence/context/ED-20260331-api-parse-error-coupling-inventory.md)
- rationale-style notes such as
  [ED-20260321-planner-start-run-qa-rationale.md](../../../../evidence/context/ED-20260321-planner-start-run-qa-rationale.md)
- operationally adjacent records such as
  [ED-20260329-mvp-c1-backend-control-plane-runbook.md](../../../../evidence/supporting/ED-20260329-mvp-c1-backend-control-plane-runbook.md)

This creates five concrete failure modes:

1. the active evidence index is flat and does not distinguish blocking proof
   from contextual support
2. title semantics drift even when filenames are mostly standardized
3. there is no explicit admission rule for what belongs in active evidence
4. there is no lifecycle boundary between current evidence and historical or
   superseded proof
5. future docs automation cannot reliably infer criticality, scope, or
   cross-surface relationships from metadata alone

This proposal is intentionally limited to `docs/evidence/`. It does not
reclassify reviews, closeouts, or risks as evidence.

## 2. Objectives and non-objectives

### Objectives

- define one target operating model for `docs/evidence/`
- separate critical proof from supporting and contextual material
- make folder admission criteria explicit and reviewable
- standardize naming, metadata, lifecycle, and versioning rules
- define a migration sequence that does not force disruptive file moves in the
  first pass
- define future enforcement gates that prevent the surface from drifting back
  into a flat mixed catalog

### Non-objectives

- moving all existing evidence files immediately
- changing current ARC policy or validator behavior in the same slice
- merging evidence with `reviews`, `closeouts`, or `risk-register`
- redefining repository-wide documentation governance beyond `docs/evidence/`
- rewriting historical evidence content that is still accurate but poorly
  classified

## 3. Expected output

After this proposal is adopted and executed, `docs/evidence/` should behave as
one governed proof surface with explicit classes:

- readers can identify whether a document is critical, supporting, contextual,
  or archived from both its metadata and its folder
- every active evidence file maps to exactly one class
- ARC-relevant or release-blocking proof is no longer mixed into the same flat
  list as inventories or rationale notes
- the generated evidence index can group entries by class instead of emitting
  one undifferentiated list
- automation can validate required metadata and reject invalid placement

The first delivery in this proposal is policy only: taxonomy, metadata,
admission rules, migration waves, and enforcement design. No evidence files are
relocated in phase 1.

## 4. Return on investment

This change is justified only if it improves operational lookup, review speed,
and audit clarity.

Expected return:

- PR reviewers can identify the blocking proof artifact for a slice in under
  one minute from the evidence index
- ARC-relevant changes can point to one clearly classified active evidence
  record instead of a mixed candidate set
- audits can distinguish proof, supporting detail, and historical context
  without opening multiple files
- future docs-quality automation can validate evidence metadata without
  bespoke file-by-file exceptions

Operational metrics to use during migration:

- 100% of active evidence files classified into exactly one target class
- 0 active evidence files left without a valid class after the migration gate
  is enabled
- 0 ARC-relevant evidence files placed in `context/` or `archive/`
- median reviewer lookup time reduced from path-search/manual scan to indexed
  class navigation

## 5. Target taxonomy and folder rules

The target structure under `docs/evidence/` is:

- `docs/evidence/critical/`
- `docs/evidence/supporting/`
- `docs/evidence/context/`
- `docs/evidence/archive/`

Each directory must have its own `index.md` once migration starts. Those
indexes remain governed by `pnpm docs:sync`.

### `critical/`

Purpose:

- release-blocking or ARC-relevant proof tied to contracts, adapters, engine,
  planner, API/runtime boundaries, or intentional breaking changes

Required characteristics:

- directly supports acceptance, release readiness, or high-risk closure
- links concrete code paths and executable validation commands
- can stand on its own as the primary proof record for the slice

Must not contain:

- exploratory inventories
- rationale-only notes
- operational guidance that belongs in `runbooks/`
- historical proof superseded by newer evidence

Closure authority:

- yes, this class may satisfy ARC or release-readiness evidence alone when the
  governing policy for the touched slice allows evidence-doc closure

### `supporting/`

Purpose:

- implementation validation that strengthens confidence but is not by itself a
  release-blocking proof artifact

Required characteristics:

- relevant to validation of an active slice
- references code or tests, but is not the sole acceptance anchor

Must not contain:

- the only proof record for a breaking or ARC-relevant change
- long-lived discovery notes or inventories
- superseded artifacts that should be archived

Closure authority:

- no, this class is supporting only and must not be the sole proof for ARC or
  release readiness

### `context/`

Purpose:

- inventories, rationale, discovery notes, diagnostic capture, and explanatory
  material that improves understanding of active work

Required characteristics:

- useful for reasoning, audit trail, or future migration work
- not required as the primary proof of acceptance

Must not contain:

- the canonical closure artifact for a governed runtime or contract slice
- unresolved risk records that belong in `docs/risk-register/`
- task closure narratives that belong in `docs/planning/closeouts/`

Closure authority:

- no, context docs are never sufficient by themselves for ARC or
  release-readiness closure

### `archive/`

Purpose:

- superseded or historical evidence retained for reference

Required characteristics:

- explicitly marked historical or superseded
- linked forward to the active replacement when one exists

Must not contain:

- active evidence still cited as the current proof source
- uncategorized files moved only to reduce noise

Closure authority:

- no, archived evidence must not satisfy active closure or release-readiness
  requirements

## 6. Naming and metadata standard

### Filenames

Every evidence filename must follow:

`ED-YYYYMMDD-<slug>.md`

Rules:

- `YYYYMMDD` is the effective evidence date
- `<slug>` is lowercase kebab-case
- the slug must describe the behavior, boundary, or proof topic
- avoid phase-only names such as `phase2` unless the phase label is materially
  required to disambiguate the artifact
- avoid generic labels such as `summary` unless the document is intentionally a
  summary-only artifact

Examples of preferred slug semantics:

- `run-maintenance-not-found-boundary-hardening`
- `planner-manifest-cache-runtime-proof`
- `api-http-envelope-normalization`

### Titles

The document title must be human-readable and semantically aligned to the slug.
Titles should describe what was proven, not just repeat a task code.

### Target mandatory frontmatter

Target-state evidence metadata must include:

- `title`
- `status`
- `date`
- `owners`
- `arc_level` when applicable
- `breaking`
- `evidence_class` with one of `critical`, `supporting`, `context`, `archive`
- `domains` or `lanes`
- `code_refs`
- `validation_commands`
- `related_reviews`
- `related_risks`
- `supersedes` when applicable
- `superseded_by` when applicable
- `version`

### Compatibility rule during migration

Current ARC policy and validators already rely on the existing evidence
frontmatter shape, especially `evidence.tests`.

Therefore the migration must use this rule:

- phase 1 and phase 2 do not require immediate replacement of `evidence.tests`
- `validation_commands` becomes the target canonical field
- until validators are updated, active evidence may carry both
  `validation_commands` and `evidence.tests`, or a deterministic docs tool may
  map one to the other
- no migration step may break current ARC validation in order to introduce the
  new metadata shape

### Allowed status set

Active policy for evidence status:

- `Draft`
- `Review`
- `Accepted`
- `Superseded`
- `Archived`

Interpretation:

- `Accepted` means the evidence is active and valid for citation
- `Superseded` means the record remains in history but no longer serves as the
  primary active proof
- `Archived` means the record lives only for historical reference

## 7. Lifecycle and versioning rules

### Evidence lifecycle

Default lifecycle:

`Draft -> Review -> Accepted -> Superseded -> Archived`

Rules:

- evidence should not skip directly from `Draft` to `Archived`
- superseding evidence must link backward and forward using
  `supersedes`/`superseded_by`
- archived artifacts must not remain the active proof reference in planning
  surfaces

### Versioning policy

The governance policy defined by this proposal starts at `v1.0.0`.

Versioning rules:

- major version: breaking change to taxonomy, mandatory metadata, or class
  semantics
- minor version: additive metadata or enforcement capability
- patch version: clarification that does not change required behavior

Individual evidence documents are immutable historical records. They do not get
semantic version branches. If the proof materially changes, a new evidence
record supersedes the old one.

The `version` field in evidence frontmatter refers to the evidence metadata
schema version, not the business change or runtime package version.

## 8. Relationship rules with `reviews`, `closeouts`, and `risk-register`

Surface boundaries remain explicit:

- `docs/evidence/` stores proof
- `docs/planning/reviews/` stores analysis and findings
- `docs/planning/closeouts/` stores task closure narrative
- `docs/risk-register/` stores unresolved residual risk

Rules:

- evidence documents must link to related reviews when analysis materially
  informed the proof
- evidence documents must link to related risks when residual risk remains open
- closeouts may summarize the slice, but they do not replace the proof artifact
  when critical evidence is required
- reviews may identify gaps or remediation, but they are not evidence unless a
  later accepted evidence record references and closes them

This proposal explicitly rejects merging these surfaces into one folder. The
correct model is cross-linking with clear role separation.

## 9. Migration plan by waves

### Phase 1: approve taxonomy and metadata standard

Deliverables:

- approved proposal
- agreed target taxonomy
- agreed metadata target and compatibility rule

No file moves occur in this phase.

### Phase 2: classify the existing evidence inventory

Deliverables:

- full inventory of existing `docs/evidence/*.md`
- class assignment for each file
- list of title or metadata normalization candidates

Rules:

- every current evidence file must map to exactly one class
- files that do not fit any class must be explicitly escalated instead of left
  uncategorized

### Phase 3: move and rename in controlled batches

Deliverables:

- class-based directories with `index.md`
- batched file moves or renames
- updated cross-links and regenerated indexes

Rules:

- move critical artifacts first
- do not mix structural relocation with broad content rewrites
- regenerate docs indexes after each batch

### Phase 4: enable enforcement

Deliverables:

- docs-quality checks for class validity and required metadata
- invalid-placement detection
- grouped evidence index generation

Rules:

- enforcement becomes blocking only after the baseline inventory is remediated
- active files in `archive/` must fail once the gate is enabled

## 10. Validation and enforcement plan

Structural validation for this proposal and future implementation:

- `pnpm docs:sync`
- `pnpm docs:workboard:generate`
- `pnpm docs:quality:check`
- `pnpm docs:doctor`
- `pnpm docs:canonical:check`
- `pnpm verify:prepush`

Future enforcement candidates:

- reject evidence docs missing mandatory frontmatter
- reject invalid `evidence_class`
- reject active evidence placed under `archive/`
- group the evidence index by class once migration begins
- verify that every active evidence document links to at least one executable
  validation command, directly or through the compatibility mapping from
  `evidence.tests`

To avoid parallel governance, all enforcement must be added to the existing docs
and ARC validation pipeline. This proposal does not introduce a second manual
registry outside current planning and docs generators.

## 11. Open risks and tradeoffs

- forcing the new metadata shape too early would break current ARC validation
- moving contextual files into class folders before link remediation would
  create broken navigation
- leaving the index flat after classification would preserve most of the lookup
  pain even if frontmatter improves
- over-classifying weak or purely contextual notes as `critical` would recreate
  ambiguity under a different label
- widening this effort to all planning and operational docs in the same slice
  would dilute the migration and slow closure

## 12. Acceptance criteria

This proposal is acceptable only if all of the following are true:

- it defines one target model for `docs/evidence/` only
- it gives entry criteria for `critical`, `supporting`, `context`, and
  `archive`
- it defines filename, metadata, status, lifecycle, and versioning rules
- it preserves compatibility with current ARC evidence validation during the
  migration window
- it defines explicit relationships with `reviews`, `closeouts`, and
  `risk-register` without collapsing them into one surface
- it defines a phase-based migration with no file moves in phase 1
- it names future enforcement gates that can prevent structural drift

## References

- [Evidence](../../../../evidence/index.md)
- [Governance Document And Rule Inventory](../../../status/governance-document-rule-inventory.md)
- [Planning Control Tower](../../../state/planning-control-tower.md)
- [Documentation Usability Change Plan](../../mandatory/governance-and-docs/documentation-usability-change-plan-20260308.md)
