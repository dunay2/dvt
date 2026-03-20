---
slice: 20260319-gap-5-pr1-archive-artifact-contracts
date: 2026-03-19
gap: gap-5-pr1
author: AI (GPT-5)
---

# Closeout: Gap 5 PR1 Archive Artifact Contracts

## Think-First Analysis

### Problem summary

`@dvt/state-store` now knows how to derive archive-unit keys and delete-after
windows, but PR1 still lacks the deterministic artifact contract that the
exporter and verifier both need: manifest shape, archive checksum generation,
and pinned terminal snapshot metadata.

### Root cause

The first archive slice landed schema and key helpers before the artifact
boundary was encoded in code. That leaves the next exporter/verifier work
without one shared checksum rule or one typed manifest/snapshot surface, so each
future implementation would be forced to improvise its own digest and payload
shape.

### Constraints and invariants

- `AGENTS.md`: governance inventory first, think-first before edits, real
  validation, no hidden debt, no stubs.
- `docs/guides/ai-work-protocol.md`: Full mode because this slice adds new
  lifecycle artifacts and public exports in `@dvt/state-store`.
- `ADR-0004`: event history remains authoritative and ordered by `runSeq`; any
  archive digest must preserve deterministic replay semantics.
- `ADR-0031`: archival remains tenant-explicit; manifests must retain the tenant
  set represented by the archive unit.
- `ADR-0034`: lifecycle ownership belongs behind state-owned ports and helpers,
  not in engine core.
- `ADR-0037`: PR1 archive export must emit a manifest with tenant set, row
  count, sequence bounds, checksum, and archive object identity; terminal
  snapshot pinning must carry `lastRunSeq` and `eventChecksumSha256`.
- `docs/planning/proposals/gap-5-pr1-minimal-usable-archival-20260319.md`:
  manifest generation and terminal snapshot pinning are in-scope for PR1.

### Options considered

- Add only a manifest type definition and defer checksum logic.
  - Rejected because the verifier would still lack a shared integrity rule.
- Implement a full object-storage exporter immediately.
  - Rejected for this slice because the repo does not yet have an archive-specific
    storage boundary, and forcing one now would mix contract design, I/O, and
    catalog mutation in a single change.
- Add a deterministic archive artifact surface in `@dvt/state-store`: manifest
  builder, rolling checksum helper, and pinned terminal snapshot helper.
  - Selected because it gives the next exporter/verifier slice a single
    state-owned contract without pretending the storage adapter already exists.
- Reuse existing repo utilities and ports:
  - `@dvt/crypto` for JCS + SHA-256: adopted.
  - `@dvt/contracts` artifact-store / `@dvt/artifacts` compiled-code storage:
    evaluated and rejected for this slice because those ports are
    tenant-addressed compiled-code storage, not archive-unit export artifacts.

### Selected option and rationale

Create a lifecycle artifact boundary in `@dvt/state-store` that can already
build the PR1 manifest and pinned terminal snapshot metadata deterministically
from ordered event inputs. That keeps the slice deployable, bounded, and useful:
future exporter and verifier work can depend on one digest and artifact shape
instead of inventing them ad hoc.

### Rejected alternatives

- Shipping only more archive key helpers. Rejected because it does not advance
  exporter/verifier interoperability.
- Shipping an archive exporter that chooses a storage backend before the
  artifact contract is fixed. Rejected because it risks encoding the wrong
  manifest/checksum semantics in I/O code and then freezing that mistake.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - add lifecycle artifact helpers under `packages/@dvt/state-store/src/lifecycle/*`
  - define the archive manifest and pinned terminal snapshot artifact shapes
  - compute deterministic archive checksums from ordered event inputs
  - export the new helpers from `@dvt/state-store`
- Touched files or paths:
  - `packages/@dvt/state-store/src/archiveLifecycle.ts`
  - `packages/@dvt/state-store/src/index.ts`
  - `packages/@dvt/state-store/src/lifecycle/*`
  - `packages/@dvt/state-store/test/*`
  - `packages/@dvt/state-store/package.json`
  - `docs/planning/closeouts/20260319-gap-5-pr1-archive-artifact-contracts-closeout.md`
- Expected outcome:
  - one canonical manifest/checksum rule for PR1 archive exports
  - one canonical pinned-terminal-snapshot helper carrying
    `lastRunSeq` and `eventChecksumSha256`
- Risks and mitigations:
  - Risk: choose a digest rule that is inconsistent with existing deterministic
    hashing in the repo.
  - Mitigation: reuse `@dvt/crypto` JCS + SHA-256 and encode the rule in tests.
  - Risk: silently accept rows outside the archive unit or invalid terminal
    snapshots.
  - Mitigation: add negative tests for mismatched day, empty event sets,
    non-terminal snapshots, mixed runs, and invalid timestamps.
- Out-of-scope items:
  - concrete object-storage upload adapters
  - archive catalog persistence methods
  - async verifier orchestration
  - delete-after worker behavior
- Validation plan:
  - `pnpm --filter @dvt/state-store build`
  - `pnpm --filter @dvt/state-store test`
  - `pnpm verify:prepush`
- Test coverage plan:
  - happy path manifest generation
  - deterministic checksum reproduction across equivalent inputs
  - rejection of empty exports and mismatched archive-unit day
  - rejection of non-terminal or mixed-run pinned snapshot inputs
- Libraries evaluated:
  - `@dvt/crypto` adopted
  - `@dvt/contracts` artifact-store and `@dvt/artifacts` storage adapters not
    adopted for this slice

## Changes made

- `packages/@dvt/state-store/src/lifecycle/archiveArtifacts.ts`
  Added deterministic archive manifest, rolling checksum, and pinned terminal
  snapshot logic to create one canonical PR1 artifact boundary for
  exporter/verifier work.
- `packages/@dvt/state-store/src/archiveLifecycle.ts`
  Added `parseArchiveUnitKey()` so lifecycle helpers can validate archive-unit
  membership consistently.
- `packages/@dvt/state-store/src/index.ts`
  Exported the new lifecycle artifact surface from the package public API.
- `packages/@dvt/state-store/test/archiveArtifacts.test.ts`
  Added happy-path and negative-path coverage for manifest, checksum, and
  pinned-snapshot helpers.
- `packages/@dvt/state-store/test/archiveLifecycle.test.ts`
  Added parsing coverage for archive unit keys to keep build/parse behavior
  aligned.
- `packages/@dvt/state-store/package.json`
  Added the `@dvt/crypto` workspace dependency to reuse canonical repo hashing
  and canonicalization utilities.
- `packages/@dvt/state-store/tsconfig.json`
  Added local path mapping for `@dvt/crypto` to keep TypeScript resolution
  aligned with the existing monorepo setup.
- `pnpm-lock.yaml`
  Recorded the new workspace dependency edge so install/runtime resolution stays
  truthful.
- `docs/planning/closeouts/20260319-gap-5-pr1-archive-artifact-contracts-closeout.md`
  Recorded think-first analysis, implementation brief, and evidence for the
  slice.

## Governing sources used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/roadmap/gap-5-executive-delivery-roadmap-20260319.md`
- `docs/planning/proposals/gap-5-pr1-minimal-usable-archival-20260319.md`
- `docs/planning/proposals/gap-5-event-lifecycle-and-archival-design-20260319.md`
- `docs/planning/proposals/gap-5-sequence-and-module-design-20260319.md`
- `docs/planning/proposals/gap-5-domain-design-companion-20260319.md`
- `docs/runbooks/gap-5-archive-operations-runbook-20260319.md`
- `docs/planning/status/canonical-doc-code-matrix.md`
- `docs/guides/testing-and-ci-capabilities.md`
- `docs/adr/ADR-0004-event-sourcing-strategy.md`
- `docs/adr/ADR-0031-adapter-tenant-isolation.md`
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`
- `docs/adr/ADR-0037-run-event-lifecycle-archival-verification-and-restore-model.md`

## Docs synced

- [x] `pnpm docs:sync` ran after adding the closeout and reported the generated
      planning/docs indexes already up to date

## Test evidence

- `pnpm install` - Passed
- `pnpm --filter @dvt/crypto build` - Passed
- `pnpm --filter @dvt/state-store build` - Passed
- `pnpm --filter @dvt/state-store test` - Passed
- `pnpm exec eslint packages/@dvt/state-store/src/archiveLifecycle.ts packages/@dvt/state-store/src/index.ts packages/@dvt/state-store/src/lifecycle/archiveArtifacts.ts packages/@dvt/state-store/test/archiveLifecycle.test.ts packages/@dvt/state-store/test/archiveArtifacts.test.ts`
  - Passed
- `pnpm exec prettier --check packages/@dvt/state-store/package.json packages/@dvt/state-store/src/archiveLifecycle.ts packages/@dvt/state-store/src/index.ts packages/@dvt/state-store/src/lifecycle/archiveArtifacts.ts packages/@dvt/state-store/test/archiveLifecycle.test.ts packages/@dvt/state-store/test/archiveArtifacts.test.ts packages/@dvt/state-store/tsconfig.json docs/planning/closeouts/20260319-gap-5-pr1-archive-artifact-contracts-closeout.md pnpm-lock.yaml`
  - Passed
- `pnpm exec markdownlint-cli2 docs/planning/closeouts/20260319-gap-5-pr1-archive-artifact-contracts-closeout.md --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc`
  - Passed
- `pnpm docs:sync` - Passed
- `pnpm verify:prepush` - Passed; the repo changed-file substep reported `No changed files detected`, so explicit `eslint` and `prettier --check` were run against the touched files above

## Debt introduced

None.

## No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No hidden debt entry was created.
- The slice stopped at a real artifact contract boundary instead of claiming an
  unfinished storage adapter.

## No-stub evidence

- No placeholder exporter or fake verifier path was added.
- The shipped code produces real manifest and pinned-snapshot artifacts from
  real `EventEnvelope` / `WorkflowSnapshot` inputs.
