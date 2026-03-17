---
title: Documentation Restructuring Diagnostic And Roadmap
status: Draft
owner: docs
last_reviewed: 2026-03-07
planning_type: proposal
---

# Documentation Restructuring: Diagnostic And Roadmap

## Proposal Set Context

This document is part of the repository governance proposal set.

- Set entry point: [Repository Governance Proposal Set 2026-03-17](repository-governance-proposal-set-20260317.md)
- Role in set: diagnostic precursor
- Follow-on proposals:
  - [Documentation Usability Change Plan](documentation-usability-change-plan-20260308.md) translates this diagnostic into an operating model
  - [Package Module Build Policy v2](package-module-build-policy-v2-20260317.md) defines technical package/build policy for monorepo convergence
  - [CI Workflow Deduplication Plan](ci-workflow-deduplication-plan-20260307.md) defines enforcement and CI consolidation work

> Consolidated from the answers gathered during this planning cycle. The first part closes the operating decisions. The second part turns those decisions into an executable roadmap.

## Answered Questions And Consolidated Responses

### 1. Final goal

Question: If this documentation effort succeeds, what should be true in 30 days?

Consolidated response:

- Documentation no longer creates recurring debt.
- The structure is clear, navigable, and free of duplicates.
- There is bidirectional traceability between code and documentation.
- Ongoing maintenance and PR controls prevent the repo from falling back into disorder.
- The team treats documentation as the main reference and trusts it.
- There is a visible roadmap and a board to track progress.

### 2. Source of truth

Question: Which folders and files do you consider the canonical documentation source today?

Consolidated response:

- `docs/` is the main canonical source.
- Every important folder inside `docs/` should have an `index.md`.
- Every relevant document should live in `docs/` and be tracked in git.
- Related material may live outside `docs/`, but it must be linked from the main documentation system.

### 3. Generated folder

Question: What is the exact rule for `site/`?

Consolidated response:

- `site/` is generated output from MkDocs.
- It must not be edited manually.
- It must be regenerated from the documentation sources.
- Publication should come from CI, not from manual work on `site/`.

### 4. Material outside git

Question: What kind of untracked files do you want to incorporate?

Consolidated response:

- Technical notes.
- Drafts.
- Runbooks.
- Architectural decisions.
- Translations.
- AI exports with real value.
- Any documentation artifact that matters to the team.

### 5. Language policy

Question: Should the target documentation be English-only, bilingual, or English with controlled exceptions?

Consolidated response:

- The target language is English.
- Temporary or strongly justified exceptions are allowed.
- Exceptions must be clearly marked and linked from the main documentation system.

### 6. Primary audience

Question: Who are we organizing this documentation for first?

Consolidated response:

- Developers are the primary audience.
- The structure should also work for reviewers, operators, architects, AI workflows, and new contributors.

### 7. Required rigor

Question: Which kinds of code changes must force documentation updates?

Consolidated response:

- Architecture changes.
- Contract changes.
- Design changes.
- Operational changes.
- Relevant functional changes.
- Fixes that change behavior or system understanding.
- The ideal working mode is design-first.

Additional note:

- The existing modular AI model should be located and formalized as an ADR.

### 8. Document types

Question: Which categories do you want to keep explicitly?

Consolidated response:

- ADR
- Guides
- Runbooks
- Planning
- Evidence
- Risk register
- Contracts
- Architecture

### 9. Historical archive

Question: When does a document move to archive?

Consolidated response:

- When it is no longer relevant to the current project state.
- When it has been replaced by a better or more current document.
- When it is historical and only kept for reference.
- When actively maintaining it no longer provides value.

### 10. Ownership

Question: Should every document or section have an explicit `owner`?

Consolidated response:

- Yes.
- The current owner field is too generic.
- We need to decide whether ownership is person, team, module, or a useful combination of those.

### 11. Expiration and review cadence

Question: Do you want a required review date for all docs or only for planning, runbooks, and normative docs?

Consolidated response:

- Review should be required for all docs.
- The cadence can vary by document type.
- Planning, runbooks, and normative docs should be reviewed more frequently.

### 12. Code-documentation relationship

Question: How should traceability be represented?

Consolidated response:

- Links to code paths.
- Frontmatter with `code_paths`.
- Tables by module.
- PR checklist items.
- Diagrams or maps when they help explain the relationship.

### 13. Quality threshold

Question: Which failures should block merge?

Consolidated response:

- Broken links.
- Orphan documents.
- Incomplete frontmatter.
- Drift in generated docs.
- Missing evidence for relevant changes.
- Missing minimum traceability between code and docs.

### 14. Most painful current problem

Question: What bothers you most today?

Consolidated response:

- Structural disorder is the main problem.
- Obsolete documents come next.
- Missing traceability with code is also heavy debt.
- Unclassified material makes the problem worse.

### 15. Practical constraints

Question: Is there anything we cannot touch for now?

Consolidated response:

- There are no hard restrictions.
- If names or paths change, references and scripts must be updated carefully.

### 16. Preferred output order

Question: What do you want first?

Consolidated response:

- First structural order.
- Then content cleanup.
- Then traceability with code.
- Finally automation in CI.

## Closed Operating Decisions

- The canonical source is `docs/`.
- `site/` must be treated as a generated artifact.
- Every relevant documentation artifact must end up inside the versioned documentation system.
- English is the target language.
- Developers are the primary audience.
- Architecture, contract, design, and operational changes require documentation updates.
- Active categories are limited to ADRs, guides, runbooks, planning, evidence, risk register, contracts, and architecture.
- Every active document must have minimum metadata and a review date.
- Code-documentation traceability is not optional for relevant changes.
- Important documentation checks must block merge.

## Tensions The Plan Must Resolve

- The `site/` case is already resolved at repo level: it is not tracked and it is ignored. What remains is preventing it from coming back and ensuring publication always comes from CI.
- English is the target language, but planning used to contain significant Spanish content. The plan must separate temporary working drafts from stable documentation.
- The `owner` field exists, but it is still too generic. It needs to become useful without becoming bureaucratic.

## Initial Diagnostic: What Must Be Audited

### A. Scope and structure

- Which paths are sources.
- Which paths are generated.
- Which paths are historical.
- Which folders are missing `index.md`.
- Which sections overlap with each other.

### B. Inventory and version control

- All relevant `.md`, `.txt`, and documentation artifacts.
- Tracked versus untracked material.
- New documents without a clear destination.
- Duplicates by name, title, or content.

### C. Structural quality

- Orphan files.
- Broken links.
- Non-canonical or removed references.
- Missing frontmatter.
- Duplicate titles.
- Index pages that do not reflect real content.

### D. Content quality

- Obsolescence.
- Weak ownership.
- Missing or ambiguous status.
- Expired review dates.
- Mixed-language content without a policy.
- Missing examples or validation commands.
- Drafts mistaken for normative docs.

### E. Traceability with code

- Packages without related docs.
- Normative docs without code paths, tests, or verification commands.
- Generated docs without a declared generation command.
- Code changes that currently do not trigger documentation work.

### F. Maintenance flow

- What each script validates.
- What runs locally.
- What runs in pre-commit.
- What runs in PRs.
- What runs in CI.
- Which conditions block merge.

## Verified Repo Baseline (2026-03-07)

Commands used for this baseline:

- `git ls-files docs`
- `git ls-files site`
- `git status --short --untracked-files=all docs`
- `pnpm docs:doctor`
- `pnpm docs:quality:check`

Verified state:

- `docs/` has 249 tracked files.
- `site/` has 0 tracked files and `/site/` is ignored in `.gitignore`.
- There are no untracked files inside `docs/` at this point.
- The initial baseline on this branch found 7 `planning` docs missing `last_reviewed`; that debt is now resolved and `pnpm docs:doctor` is clean.
- `pnpm docs:quality:check` now returns `OK` and the active `planning` language queue is fully closed.
- `docs:sync`, `docs:doctor`, `docs:quality:check`, `docs:canonical:check`, `docs:status:check`, and `docs:capability:check` already exist and form a real base for hardening the workflow.

Summary inventory of `docs/` by area:

| Area            | Tracked files |
| --------------- | ------------: |
| `(root)`        |             4 |
| `adr`           |            33 |
| `architecture`  |            94 |
| `archive`       |             3 |
| `contracts`     |             4 |
| `decisions`     |             6 |
| `evidence`      |             3 |
| `guides`        |             3 |
| `knowledge`     |             3 |
| `planning`      |            85 |
| `review`        |             3 |
| `risk-register` |             7 |
| `runbooks`      |             1 |

## Recommended Execution Order

### Wave 1: Structural order

Goal: make it explicit what is source, what is generated, which document types exist, and where each thing belongs.

- T01
- T02
- T03
- T04
- T05
- T06
- T09
- T10
- T11
- T18
- T29

### Wave 2: Cleanup and consolidation

Goal: reduce noise, close duplicates, and leave one source of truth per topic.

- T07
- T08
- T12
- T13
- T14
- T15
- T16
- T17
- T19
- T30
- T31

### Wave 3: Traceability with code

Goal: make the bidirectional relationship between code and documentation visible and maintainable.

- T20
- T21
- T22
- T23
- T24
- T33

### Wave 4: Automation and continuous maintenance

Goal: prevent documentation debt from returning.

- T25
- T26
- T27
- T28
- T32

## Current Backlog State

Status legend used in this table:

- `Done`: resolved and verified in the repo or workflow.
- `In progress`: there is partial evidence and the next step is clear.
- `Pending`: there is not yet enough evidence to close it.

Summary state after syncing with `main`:

- `Done`: T01, T02, T03, T04, T05, T06, T07, T08, T09, T10, T11, T13, T18, T25, T26, T27, T29, T32.
- `In progress`: T12, T19, T20, T22, T31, T33.
- `Pending`: everything else.

The real debt still open today is concentrated in three areas:

- obsolete-document detection
- historical-document relocation and archive discipline
- fine-grained traceability between docs and code

Recent `T12` / `T31` progress:

- one scratch planning note about Temporal adapter improvements was absorbed into the canonical `G1` execution-gap doc and removed from active `planning`
- one standalone OpenLineage/Marquez comparison note was moved to `archive` as historical analysis instead of remaining as an active planning document
- the `release-please` pending note was relocated into `docs/planning/status/` because it is an active operational status item, not a loose planning note
- the golden-path debt note was converted into a risk-register entry and its mixed assessment note was moved to `archive`
- the AI remediation snapshot and the strategic assessment snapshot were moved to `archive` because they are stale, time-bound, and no longer act as canonical sources for current execution decisions
- the standalone outbox-consumer proposal was moved to `archive` after its actionable points were absorbed into the current gap tracker
- the artifact-store review pack was moved from `docs/planning/` to `docs/archive/` because its core gap assumptions are now historical and it no longer acts as active planning
- the traceability pack bundle was also moved from `docs/planning/` to `docs/archive/`; active planning docs now link to it as historical reference instead of treating it as a planning section
- a first manual doc-to-code matrix now exists in `docs/planning/status/canonical-doc-code-matrix.md`, covering engine core, adapters, G3/G4, traceability, and docs tooling with explicit code paths, tests, and verification commands

Current language-queue state (`T17`):

- 21 docs left the queue: 4 were removed because they were non-canonical or not useful, 2 were rewritten in English, 8 were cleaned or translated in place, and 7 were moved to `archive`.
- 0 docs require consolidation before translation.
- 0 docs still need translation in place.
- 0 temporary exceptions remain after translating this working document.

## Wave 1: Immediate Executable Checklist

This is the next sensible working set for the backlog. Each row should produce a concrete and verifiable output.

| Step  | Task | What to do literally                                                                                                      | Base command                                           | Exit criterion                                                                       | Status      |
| ----- | ---- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------ | ----------- |
| O1-01 | T09  | Walk `docs/`, `mkdocs.yml`, and `index.md` files to list docs that are not linked or navigated.                           | `pnpm docs:sync` plus assisted manual review           | No orphan docs remain in the current tree.                                           | Done        |
| O1-02 | T10  | Review internal markdown links and navigation references that still point to broken or removed aliases.                   | `pnpm docs:canonical:check` plus manual review         | Direct-path scan reports `0` missing markdown targets in `docs/`.                    | Done        |
| O1-03 | T11  | Review repeated titles and repeated content, starting with `docs/planning/`.                                              | `pnpm docs:doctor` plus manual reading                 | A table `repeated doc -> canonical doc` exists.                                      | Done        |
| O1-04 | T18  | Compare auto-generated `index.md` files with real folders to detect missing or extra entries.                             | `pnpm docs:sync`                                       | Relevant generated indexes are in sync with the current tree.                        | Done        |
| O1-05 | T13  | Add `last_reviewed` to the 7 docs that `docs:doctor` was still flagging.                                                  | `pnpm docs:doctor`                                     | `pnpm docs:doctor` is clean.                                                         | Done        |
| O1-06 | T17  | Keep the language queue closed by translating any future mixed-language planning doc or removing it from active planning. | `pnpm docs:quality:check` plus `docs/SPANISH_TEXTS.md` | The planning queue stays at zero active warnings.                                    | Done        |
| O1-07 | T33  | Keep this page as the minimum tracking board until an external board exists.                                              | Edit this document                                     | The backlog reflects the real state and next step instead of becoming a frozen list. | In progress |

## Wave 1 Audit Snapshot (2026-03-07)

This snapshot is the first measured cut for `O1-01` to `O1-03`. It is intentionally pragmatic: it gives the backlog enough evidence to sequence work before a dedicated validator exists.

### O1-01 / T09: orphan candidates

- A manual inbound-link scan now finds 0 orphan candidates after indexing `docs/evidence/` and `docs/risk-register/` as first-class sections, closing the top-level `docs/review/` bucket, adding an explicit landing page for the traceability bundle, creating landing pages for the remaining documentation packs, and relocating the planning template into `docs/planning/templates/`.
- `docs/architecture/vision/DVT_Docs_Pack_v0.6/` was later trimmed down to a
  minimal historical blueprint snapshot instead of remaining as a larger active
  imported pack, and the artifact-store review pack has since been moved out of
  `planning` into `docs/archive/`.
- `docs/planning/templates/` is now the canonical location for the planning template, replacing the former top-level orphan file.
- `docs/evidence/` and `docs/risk-register/` are no longer floating sections: `docs:sync` now generates their `index.md` landing pages and the home navigation points to explicit files instead of directory placeholders.
- `docs/review/` is no longer an active section: the February review set was resolved by archiving the two English documents and removing the duplicate Spanish variant.
- `docs/archive/dvt-traceability-pack-v2-lite-R6/` is now explicitly classified as a bundled reference snapshot with a landing page that links its internal docs instead of leaving them orphaned.
- This means `T09` is done for the current tree: orphan discovery and structural resolution are closed.

### O1-02 / T10: broken-link candidates

- The direct-path markdown scan is now at `0` missing targets across `docs/`.
- This cut closed the previously dominant clusters in the AI workflow guide, `docs/CONTRIBUTING.md`, the removed legacy roadmap aliases, `docs/architecture/engine/index.md`, `docs/architecture/engine/VERSIONING.md`, security references, and several ADR cross-links.
- Historical or hypothetical file references that were never meant to resolve as live docs were converted to plain text or code literals.
- Stale links to removed backlog/status documents were replaced by current canonical sources.
- `T10` can therefore be treated as done for the current tree, with the caveat that a future dedicated broken-link checker under `T28` may still catch new regressions.

### O1-03 / T11: duplicate detection

- `pnpm docs:doctor` is clean as of 2026-03-07.
- No duplicate-title or duplicate-content failure is currently being reported by the existing checker.
- `T11` can therefore be treated as done for the current tool coverage, with the caveat that future stronger duplicate detection may reopen it.

### Immediate next cut after this snapshot

- Move from link cleanup into `T12` and `T31`: identify active docs that are obsolete, superseded, or historical but still live outside `archive`.
- Convert the current manual path scan into an automated repo check under `T28` so `T10` stays closed.
- Extend the first manual traceability matrix in `docs/planning/status/canonical-doc-code-matrix.md` to the remaining active workspaces and start pushing the minimum tuple into active docs.

## Atomic Work Backlog

| ID  | Task                              | Short description                                                                                                      | Priority | Parallelizable | Status      |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------- | -------------- | ----------- |
| T01 | Declare sources                   | Write the official list of source, generated, and historical folders.                                                  | High     | No             | Done        |
| T02 | Declare the `site/` rule          | Document the target rule for `site/`: generated, not editable, published from CI.                                      | High     | No             | Done        |
| T03 | List tracked docs                 | Generate the inventory of all versioned docs.                                                                          | High     | Yes            | Done        |
| T04 | List untracked docs               | Generate the inventory of non-versioned docs.                                                                          | High     | Yes            | Done        |
| T05 | Classify untracked docs           | Mark each untracked file as incorporate, move, archive, or discard.                                                    | High     | Yes            | Done        |
| T06 | Confirm document categories       | Close the official taxonomy of document types.                                                                         | High     | No             | Done        |
| T07 | Define language policy            | Close English as the target language and define allowed exceptions.                                                    | High     | No             | Done        |
| T08 | Define minimum metadata           | Set required fields: `title`, `status`, `owner`, `last_reviewed`, and traceability where applicable.                   | High     | No             | Done        |
| T09 | Detect orphans                    | Find docs that do not appear in navigation, indexes, or landing pages.                                                 | High     | Yes            | Done        |
| T10 | Detect broken links               | Review internal markdown links and nav links.                                                                          | High     | Yes            | Done        |
| T11 | Detect duplicates                 | Review duplicates by title and content.                                                                                | High     | Yes            | Done        |
| T12 | Detect obsolete docs              | Mark docs with no current value, replaced docs, or docs overdue for review.                                            | High     | Yes            | In progress |
| T13 | Complete frontmatter              | Add required metadata where it is missing.                                                                             | High     | Yes            | Done        |
| T14 | Fix duplicate titles              | Resolve title collisions inside the same section.                                                                      | High     | Yes            | Pending     |
| T15 | Unify repeated docs               | Choose a canonical copy and archive or remove the rest.                                                                | High     | Yes            | Pending     |
| T16 | Normalize filenames               | Fix inconsistent or ambiguous filenames.                                                                               | Medium   | Yes            | Pending     |
| T17 | Normalize content language        | Translate or move docs that violate the agreed language policy.                                                        | Medium   | Yes            | Done        |
| T18 | Review generated indexes          | Verify that `index.md` files represent real content.                                                                   | High     | Yes            | Done        |
| T19 | Define the canonical doc by topic | Leave one source of truth for each major topic.                                                                        | High     | No             | In progress |
| T20 | Map packages to docs              | Create a matrix package/app -> related docs.                                                                           | High     | Yes            | In progress |
| T21 | Map docs to code                  | Add references to code paths, tests, and relevant scripts.                                                             | High     | Yes            | Pending     |
| T22 | Define minimum traceability       | Set `code_paths`, `verification_cmd`, module tables, and PR checklist requirements.                                    | High     | No             | In progress |
| T23 | Identify generated docs           | Mark which docs are generated and by which command.                                                                    | High     | Yes            | Pending     |
| T24 | Review the modular AI ADR         | Locate the current modular AI model and convert it into a formal ADR.                                                  | High     | Yes            | Pending     |
| T25 | Integrate `docs:sync`             | Use `docs:sync` as a mandatory normalization step.                                                                     | High     | No             | Done        |
| T26 | Integrate `docs:doctor`           | Use `docs:doctor` for duplicates, metadata, and aging docs.                                                            | High     | No             | Done        |
| T27 | Integrate quality checks          | Use `docs:quality:check`, `docs:canonical:check`, `docs:status:check`, and `docs:capability:check` in the normal flow. | High     | No             | Done        |
| T28 | Add missing checks                | Create checks for orphan docs, broken links, and untracked docs.                                                       | Medium   | Yes            | Pending     |
| T29 | Resolve the `site/` case          | Close whether `site/` leaves git or remains as a controlled exception.                                                 | High     | No             | Done        |
| T30 | Close archive criteria            | Define exactly when a doc moves to `archive`.                                                                          | Medium   | No             | Pending     |
| T31 | Move historical docs              | Archive docs that are no longer current.                                                                               | Medium   | Yes            | In progress |
| T32 | Define blocking checks            | Formalize which validations fail merge and which only warn.                                                            | High     | No             | Done        |
| T33 | Create roadmap and board          | Track progress in one page with owners, status, and target dates.                                                      | High     | No             | In progress |

## Tasks That Can Run In Parallel

### Block 1: Fast inventory

These can run at the same time:

- T03
- T04
- T09
- T10
- T11
- T12

### Block 2: Basic normalization

These can run at the same time once the rules are closed:

- T13
- T14
- T16
- T17
- T18
- T23

### Block 3: Traceability

These can run at the same time:

- T20
- T21
- T24

### Block 4: New validators

These can run at the same time:

- T25
- T26
- T27
- T28

## Integrating Existing Scripts Into The Flow

| Script or command            | Proposed use                                                        | When                    |
| ---------------------------- | ------------------------------------------------------------------- | ----------------------- |
| `pnpm docs:sync`             | Regenerate indexes, normalize structure, and refresh derived docs.  | Before commit and in CI |
| `pnpm docs:doctor`           | Detect duplicates, missing metadata, and aging docs.                | Local and CI            |
| `pnpm docs:quality:check`    | Detect placeholders and basic language or quality issues.           | Local and CI            |
| `pnpm docs:canonical:check`  | Block non-canonical paths or removed references.                    | CI                      |
| `pnpm docs:status:check`     | Ensure code-generated status docs are not stale.                    | CI                      |
| `pnpm docs:capability:check` | Ensure capability coverage generated from code is current.          | CI                      |
| `tools/ci/arc-check.mjs`     | Detect whether a change requires extra evidence, risk, or controls. | PR and CI               |
| `tools/ci/doc-check.mjs`     | Validate evidence and risk docs when ARC policy requires them.      | PR and CI               |

## Language Queue

The operational matrix for `T17` lives in [`docs/SPANISH_TEXTS.md`](../../SPANISH_TEXTS.md).

That file no longer exists as a generic translation note. It now acts as a work queue with four valid outcomes per document:

- translate in place
- archive or remove alias
- consolidate before translating
- temporary exception

At the end of this translation pass, the queue is fully closed for active `planning` docs.

## Current Blocking Policy

This is now formalized according to current repo behavior:

- Merge is blocked when these fail: `pnpm docs:sync:check`, `pnpm docs:canonical:check`, `pnpm docs:status:check`, `pnpm docs:capability:check`.
- `pnpm docs:quality:check` and `pnpm docs:doctor` run in PR and CI as visible checks.
- Today `docs:quality:check` and `docs:doctor` can still warn without failing the PR when the problem is known debt and not a hard violation.
- The next reasonable hardening step is converting part of those warnings into failures only after the base debt is gone.

## Recommended Flow

1. Edit source docs only.
2. Run `pnpm docs:sync`.
3. Run `pnpm docs:doctor`.
4. Run `pnpm docs:quality:check`.
5. Run `pnpm docs:canonical:check`.
6. If the change touches architecture, contracts, or risks, run `arc-check` and `doc-check`.
7. If the change touches structural code, run `pnpm docs:status:check` and `pnpm docs:capability:check`.

## Definition Of Done

The restructuring is considered complete when all of the following are true:

- All source documentation is classified.
- No relevant docs remain outside git.
- No orphan docs remain.
- No unresolved duplicates remain.
- Every active doc has minimum metadata.
- The language policy is closed and applied.
- Minimum traceability exists between code and documentation.
- Documentation checks run locally and in CI.
- `site/` is treated as generated output and not as a source.
- There is a visible roadmap and a tracking board with owners and status.
- The modular AI model is no longer scattered and has been formalized as an ADR.

## Recommended Next Iteration

The next iteration of this document should do these three things:

1. Convert the current snapshot into concrete fix batches for obsolete-document detection and archive moves.
2. Add owners and target dates to every task that is still `In progress` or `Pending`.
3. Extend `docs/planning/status/canonical-doc-code-matrix.md` and begin rolling its minimum tuple into active docs.
