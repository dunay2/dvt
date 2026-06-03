---
title: Governance File Fingerprint Shards Closeout
status: Accepted
date: 2026-05-11
owners:
  - Architecture
  - Docs Governance
planning_type: closeout
---

# Governance File Fingerprint Shards Closeout

## Summary

`DOC-GOV-FILE-SHARDS` closes the remaining monolithic fingerprint baseline in
the docs-governance generated-file workflow.

The file/component index was already generated as a compact manifest plus local
shards. This slice applies the same pattern to the fingerprint baseline:
`.generated-docs/planning/status/system-governance-file-fingerprint-baseline.yaml`
is now a compact manifest, while the per-file fingerprint rows live in
deterministic `.generated-docs/planning/status/governance-file-fingerprints/*.fingerprints.yaml`
shards. Planning DB import expands the same manifest plus shard payloads for the
governance query projection.

## Governing Sources

- [Governance document and rule inventory](../status/governance-document-rule-inventory.md)
- [Mandatory Work System For AI](../../guides/ai-work-protocol.md)
- [Command and query rail governance](../../architecture/command-query-rail-governance.md)
- [Fowler opportunity planning governance](../../architecture/fowler-opportunity-planning-governance.md)
- [ADR-0053 file state fingerprint governance](../../adr/ADR-0053-file-state-fingerprint-governance.md)
- [System governance generation workflow component](../../architecture/components/ci-governance/system-governance-generation-workflow-component.md)
- [Governance file index sharding plan](../proposals/mandatory/governance-and-docs/governance-file-index-sharding-plan-20260503.md)

## Real Work Verified

- Changed `buildFingerprintBaseline` from a monolithic per-file YAML payload to
  a compact manifest plus deterministic fingerprint shards.
- Added shard expansion and integrity checks so the impact report and DB import
  read the manifest and shard rows as one semantic baseline.
- Added stale fingerprint shard cleanup during baseline regeneration.
- Updated planning DB import to build governance fingerprint rows from the
  sharded in-memory generator projection instead of a file-row baseline.
- Updated generated-docs policy so fingerprint shard artifacts are owned by the
  local fingerprint baseline artifact class.
- Updated the system governance workflow component and sharding plan to remove
  the outdated "tracked shard as truth" drift and document the DB-backed local
  generated artifact model.
- Added feature mechanization for the slice, including rails, allowed
  implementation surfaces, TDD cycles, and new top-level symbols.
- Updated the DB surface inventory test to validate the current
  `verify:changed` and `verify:prepush` command plans instead of expecting the
  inventory command to be inlined in `package.json`.

## Fowler Reading

- Manifest: the root fingerprint baseline is now a compact manifest that owns
  shard membership, counts, and shard content hashes.
- Read Model Projection: fingerprint shard payloads are generated read-side
  rows, not authoring truth.
- Repository Boundary: Git-tracked sources and generator code remain the
  reviewed source of truth; Planning DB remains the operational query boundary.
- Hidden Authority Removed: the former monolithic generated YAML no longer acts
  as the only convenient place to inspect all fingerprint rows.

## Validation Evidence

- RED:
  `node --test scripts/check-governance-file-fingerprint-baseline.test.cjs`
  failed before implementation because `buildFingerprintBaseline` had no shard
  manifest and `expandFingerprintBaseline` did not exist.
- RED:
  `node --test scripts/planning-db-import.test.cjs --test-name-pattern "governance snapshot preserves component, fingerprint"`
  failed before import wiring because the governance snapshot had no
  fingerprint shard metadata.
- `node --test scripts/check-governance-file-fingerprint-baseline.test.cjs`
  passed with 4 tests.
- `node --test scripts/planning-db-import.test.cjs` passed with 19 tests.
- `pnpm docs:feature-mechanization:implementation` passed after adding the
  `DOC-GOV-FILE-SHARDS` feature manifest.
- `pnpm docs:governance:file-component-index` generated 4,372 file rows and 32
  component/source units.
- `pnpm docs:governance:file-fingerprint-baseline` generated the compact
  baseline manifest and fingerprint shard payloads.
- `pnpm docs:governance:file-fingerprint-impact` accepted 4,372 file
  fingerprints.
- `pnpm docs:gov:generated-policy` passed with 14 generated artifact classes.
- `node --test scripts/planning-db-surface-inventory-check.test.cjs` passed
  with 4 tests after the pre-push hook exposed the stale inline-script
  assertion.
- `pnpm docs:sync` passed after adding this closeout.
- `pnpm governance:refresh` passed after the documentation and generated
  governance surfaces converged.
- `pnpm verify:prepush` passed on the final changed slice.

## Debt And Stub Check

- No debt entry is created or hidden by this closeout.
- No lint, type, test, docs, hook, or quality rule was disabled or relaxed.
- No hooks were bypassed.
- No stub, placeholder, fake adapter, fake success path, TODO marker, or
  unfinished implementation branch was added.
- ARC-2 evidence/risk files are not required because this slice does not touch
  `packages/@dvt/engine/**`, `packages/@dvt/contracts/**`,
  `specs/contracts/**`, `packages/@dvt/adapter-*/**`, or
  `packages/@dvt/planner/**`.

## Outcome

Docs-governance file fingerprint state now follows the same compact
manifest-plus-shards model as the file/component index, while DB import remains
the semantic query path for planning and governance reads.
