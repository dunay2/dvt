---
slice: 20260317-stage-1-1-planner-canonicalization-real-artifact
date: 2026-03-17
gap: planner-stage-1-1
author: AI (GPT-5)
---

# Closeout: Stage 1.1 Planner Canonicalization Real Artifact Conversion

## Think-First Analysis

### Problem summary

The Stage 1.1 machine-readable companion currently duplicates the human
proposal as Markdown plus fenced YAML blocks. That structure is not a real
machine-governed artifact because it has no schema enforcement, no repository
validator, and no CI-enforced synchronization boundary.

### Root cause

The repository created a readability aid for AI agents before defining a real
artifact model, validation schema, and authoritative enforcement path. That
left the companion halfway between navigation aid and governance surface.

### Constraints and invariants

- `AGENTS.md` requires governance inventory first and evidence-backed closeout.
- `ai-work-protocol.md` requires think-first before creating a new artifact.
- `ADR-0005` requires machine-readable contract or artifact shapes to exist as
  executable validation assets rather than prose only.
- `ADR-0006` requires repository-authoritative validation instead of social
  discipline alone.
- The human Stage 1.1 proposal remains the only policy authority for this
  slice.
- The replacement artifact must reduce duplication rather than recreate a
  second prose document.

### Options considered

- Keep the Markdown companion and add stronger wording only.
- Keep the Markdown companion and add ad hoc parsing scripts for fenced YAML.
- Replace the Markdown companion with a real structured artifact plus schema and
  validation tool.

Libraries evaluated:

- `ajv` / `ajv-formats` already present in the repo and already used for
  offline schema validation.
- `js-yaml` exists in the repo, but JSON keeps the first real artifact simpler
  and avoids YAML parsing ambiguity.

### Selected option and rationale

Replace the Markdown companion with a real structured artifact plus schema and
validation tool. JSON plus JSON Schema is the smallest credible step that makes
the artifact executable, CI-checkable, and cheaper to maintain than the current
duplicate Markdown surface.

### Rejected alternatives

- Keeping the Markdown companion with stronger wording was rejected because it
  preserves the same non-enforced duplication problem.
- Parsing fenced YAML from Markdown was rejected because it keeps the artifact
  embedded in prose and still requires custom extraction logic before
  validation.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - replace the Markdown machine-readable companion with a real JSON manifest
  - add a JSON Schema for that manifest
  - add a repository validator script and wire it into docs governance checks
  - update the human proposal to reference the real artifact and deprecate the
    old companion model
- Touched files or paths:
  - `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`
  - `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`
  - `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.schema.json`
  - `tools/docs/validate-planner-stage-1-1-manifest.ts`
  - `package.json`
  - `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.machine-readable.md`
  - `docs/planning/closeouts/20260317-stage-1-1-planner-canonicalization-real-artifact-closeout.md`
- Expected outcome:
  - the companion becomes a real, validatable artifact instead of Markdown
    theater
- Risks and mitigations:
  - Risk: over-specifying the artifact and recreating the same duplication
  - Mitigation: keep the manifest minimal and reference the human proposal for
    prose and diagrams
  - Risk: introducing tool-specific debt
  - Mitigation: reuse existing repo tooling patterns with `Ajv2020`
- Out-of-scope items:
  - relocating the human Stage 1.1 proposal to `docs/**`
  - implementing planner or engine code contracts described by the proposal
  - generic manifest infrastructure for every proposal in the repository
- Validation plan:
  - `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`
  - `pnpm docs:gov:planner-stage-1-1`
  - `pnpm exec markdownlint-cli2 ...`
- Test coverage plan:
  - validate success path for manifest shape through the schema-backed script
  - validate structural repo assertions such as human-doc existence and
    Markdown-companion removal through the same script
- Libraries evaluated:
  - `ajv`
  - `ajv-formats`
  - `js-yaml` rejected for the first real artifact step

## Changes made

| File                                                                                            | Change                                                                                                                       | Why                                                                                           |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`                     | Replaced the old companion wording with a real structured-artifact rule and pointed the proposal at the JSON manifest        | Keep the human proposal as the only policy surface while making the structured companion real |
| `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`                      | Added the real structured manifest with section index, decision index, gaps, artifact mapping, and verification deliverables | Provide deterministic navigation and extraction without duplicating prose                     |
| `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.schema.json`               | Added JSON Schema for the manifest                                                                                           | Make the artifact executable and schema-validatable                                           |
| `tools/docs/validate-planner-stage-1-1-manifest.ts`                                             | Added repository validator for schema validity, referenced paths, section refs, uniqueness, and legacy-companion removal     | Enforce the artifact through repository tooling instead of discipline alone                   |
| `package.json`                                                                                  | Added `docs:gov:planner-stage-1-1` and wired it into `docs:gov`                                                              | Give the new artifact a CI-reachable validation path                                          |
| `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.machine-readable.md`    | Removed the Markdown companion                                                                                               | Stop maintaining a fake machine-readable governance surface                                   |
| `docs/planning/closeouts/20260317-stage-1-1-planner-canonicalization-real-artifact-closeout.md` | Added think-first, implementation brief, and evidence                                                                        | Satisfy required workflow                                                                     |

## Governing sources used

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/adr/ADR-0005-contract-formalization-tooling.md`
- `docs/adr/ADR-0006-contract-tooling-governance.md`
- `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`
- `package.json`
- `tools/docs/check-frontmatter.ts`
- `tools/docs/check-governance-references.ts`
- `packages/@dvt/traceability-service/test/lineage/facetSchema.validation.test.ts`

## Docs synced

- [ ] `docs/planning/index.md` - not required for this JSON artifact addition
- [ ] `docs/planning/proposals/index.md` - not required because the new artifact is JSON, not a proposal Markdown page

## Test evidence

| Command                                                                                                                                                                                               | Result                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`                                                                                                                                     | Passed outside sandbox after `spawn EPERM` inside sandbox                                                                 |
| `pnpm docs:gov:planner-stage-1-1`                                                                                                                                                                     | Passed outside sandbox after `spawn EPERM` inside sandbox                                                                 |
| `pnpm exec markdownlint-cli2 packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md docs/planning/closeouts/20260317-stage-1-1-planner-canonicalization-real-artifact-closeout.md` | Passed                                                                                                                    |
| `pnpm docs:gov`                                                                                                                                                                                       | Failed for pre-existing broken link in `docs/planning/proposals/principal-architecture-review-execution-plan-20260317.md` |

## Debt introduced

None.

## No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No hidden debt entry was created.
- The validator was wired into `docs:gov` rather than left as an ad hoc local-only command.

## No-stub evidence

- No placeholder manifest or fake validation path was added.
- The structured artifact is a real JSON file with a real JSON Schema.
- The repository contains an executable validator and a docs governance script entry for the artifact.
