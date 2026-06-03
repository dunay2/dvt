---
title: Docs markdown parser componentization closeout
status: Done
owner: docs
last_reviewed: 2026-04-23
planning_type: closeout
---

# Docs markdown parser componentization closeout

## Think-First Analysis

- Problem summary:
  The branch had already split `tools/docs/lib/markdown.ts` into helper modules,
  but the parser component still lacked semantic ownership signals, a local
  component guide, and an architecture fitness function that enforced the
  facade-plus-subcomponents design.
- Root cause:
  The extraction improved code shape first, but the repository's newer
  component-governance discipline had not yet been applied to the docs parser
  stack. That left the split mechanically better but still easy to drift back
  into ad hoc utility imports and unclear module ownership.
- Constraints and invariants:
  - `AGENTS.md` requires canonical governance first, real validation, no hidden
    debt, and no stubbed completion.
  - `docs/guides/ai-work-protocol.md` requires think-first analysis,
    implementation traceability, documentation updates, and validation plus
    closeout.
  - `docs/architecture/reference-architecture.md` requires mechanical boundary
    enforcement where the repo can enforce it.
  - `docs/planning/status/canonical-doc-code-matrix.md` is the canonical place
    to state topic -> doc -> code -> test -> command traceability.
  - Docs governance consumers must keep importing the public facade
    `tools/docs/lib/markdown.ts` instead of helper internals.
- Options considered:
  1. Leave the parser split as-is and rely on code review.
     Rejected: the current branch posture already showed that semantic
     ownership and local documentation were missing.
  2. Add owned-concern docblocks, a local component guide, a semantic
     architecture test, and matrix traceability while keeping runtime behavior
     unchanged.
     Selected: this closes drift without reopening the parser design.
  3. Collapse the helpers back into one utility module.
     Rejected: it would reverse the branch's good extraction work and bring
     back broad utility-module coupling.
- Selected option and rationale:
  Keep the extracted parser subcomponents, but harden them as a governed local
  component. This follows the same Fowler-style pattern already used in other
  parts of the branch: stable facade, narrow helpers, explicit owned concerns,
  local guide, diagrams, and a semantic fitness function.

## Pre-Implementation Brief

- Mode: `Full`
- Scope:
  `tools/docs/lib/markdown*.ts`, `tools/ci/*.test.mjs`,
  `docs/guides/docs-markdown-governance-parser-component.md`,
  `docs/planning/status/canonical-doc-code-matrix.md`,
  `docs/planning/closeouts/**`, and the branch mailbox note.
- Expected outcome:
  the docs parser stack reads as one semantic component with explicit ownership,
  one public facade, diagrams, and a regression guard against import drift.
- Risks and mitigations:
  - Risk: architecture test encodes naming instead of semantics.
    Mitigation: the test asserts concern ownership, facade-only consumer
    imports, and helper-boundary rules.
  - Risk: new docs drift from canonical docs indexes.
    Mitigation: rerun `pnpm docs:sync` and `pnpm docs:gov:manifest`.
- Out-of-scope items:
  parser behavior expansion, full Markdown AST adoption, Zensical runtime
  changes, or new repository-wide docs policy.
- Validation plan:
  `node --test tools/ci/docs-markdown-component-architecture.test.mjs`,
  `pnpm test:ci-tools`, `pnpm docs:sync`, `pnpm docs:gov:manifest`,
  `pnpm verify:prepush`.
- Test coverage plan:
  add a semantic architecture test for the component; reuse the existing BOM
  regression and CI-tool suite as broader safety nets.
- Libraries evaluated:
  None. This slice governs existing repo-local tooling rather than introducing a
  new parser library.

## Real Work Performed

- Added the semantic architecture fitness function:
  `tools/ci/docs-markdown-component-architecture.test.mjs`.
- Added a local component guide with API, invariants, transitions, consumers,
  Fowler reading, and diagrams:
  `docs/guides/docs-markdown-governance-parser-component.md`.
- Replaced generic `@file` headers with short owned-concern docblocks in:
  - `tools/docs/lib/markdown.ts`
  - `tools/docs/lib/markdownAdrFields.ts`
  - `tools/docs/lib/markdownAnchors.ts`
  - `tools/docs/lib/markdownFrontmatter.ts`
  - `tools/docs/lib/markdownLinks.ts`
  - `tools/docs/lib/markdownRegex.ts`
- Updated `docs/planning/status/canonical-doc-code-matrix.md` so the
  documentation-governance topic now includes `tools/docs/*`, the local parser
  guide, and `pnpm test:ci-tools`.
- Extended the canonical mailbox review
  `buzon/20260423-codex-fowler-workspace-authoring-draft-aggregate-analysis.md`
  with the parser-component addendum.
- Regenerated governed docs surfaces after adding the new guide.

## Governing Sources Used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/reference-architecture.md`
- `docs/planning/status/canonical-doc-code-matrix.md`
- `docs/guides/testing-and-ci-capabilities.md`
- `docs/DOCS_README.md`

## Validation Evidence

- Passed:
  `node --test tools/ci/docs-markdown-component-architecture.test.mjs`
- Passed:
  `pnpm test:ci-tools`
- Passed:
  `pnpm docs:sync`
- Passed:
  `pnpm docs:gov:manifest`
- Passed:
  `pnpm verify:prepush`

## No-Debt Evidence

- No rules were relaxed or disabled.
- No hooks were bypassed.
- No compatibility shim or second parser facade was introduced.
- No debt entry was created because the slice closes drift instead of deferring
  it.

## No-Stub Evidence

- The new component guide documents the real parser facade and helper modules
  already used by docs governance commands.
- The new architecture test validates semantic ownership and import rules, not
  a fake thin barrel or placeholder API.
