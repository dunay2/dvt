---
title: Governance File Index Sharding Plan
status: Review
owner: Architecture / Docs / Delivery
last_reviewed: 2026-05-03
planning_type: proposal
---

# Governance File Index Sharding Plan

## Purpose

The current exhaustive file governance index is mechanically useful but too
large for review, AI context, and repeated local iteration. This plan keeps Git
as the source of governed inputs while replacing monolithic generated file-state
surfaces with compact manifests plus deterministic local shards.

## Current Resolution

The original proposal predated the planning DB governance model and described
Git-tracked shards as the canonical file-governance source. That is no longer
the selected architecture.

The accepted shape is:

- Git-tracked source files, the governance unit manifest, generator scripts, and
  `docs/generated-docs-policy.json` remain the reviewed source of truth.
- Generated file indexes, component maps, fingerprint baselines, impact reports,
  coverage reports, remediation queues, and shard payloads are ignored local
  artifacts under `.generated-docs/planning/status/`.
- `planning:db:import` rebuilds the planning/governance Postgres query store
  from the same generator modules so DB query views, generated reports, and
  drift checks use equivalent data.
- Sharding reduces generator output size and review/context cost; it does not
  create a second authoring surface.

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: DOC-GOV-FILE-SHARDS
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/governance-file-index-sharding-plan-20260503.md
componentGuides:
  - docs/architecture/components/ci-governance/system-governance-generation-workflow-component.md
userStories:
  - docs/planning/proposals/mandatory/governance-and-docs/governance-file-index-sharding-plan-20260503.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/adr/ADR-0053-file-state-fingerprint-governance.md
allowedImplementationSurfaces:
  - docs/.manifest.json
  - docs/generated-docs-policy.json
  - docs/**/index.md
  - docs/architecture/components/ci-governance/system-governance-generation-workflow-component.md
  - docs/planning/closeouts/**
  - docs/planning/proposals/mandatory/governance-and-docs/governance-file-index-sharding-plan-20260503.md
  - docs/planning/status/**
  - scripts/check-governance-file-fingerprint-baseline.cjs
  - scripts/check-governance-file-fingerprint-baseline.test.cjs
  - scripts/docs-quality-check.cjs
  - scripts/planning-db-import.cjs
  - scripts/planning-db-import.test.cjs
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/**
commandQueryRails:
  - name: RefreshGovernanceDerivedSurfaces
    type: command
    dddOwner: CI governance / docs governance
  - name: QuerySystemGovernanceGenerationWorkflow
    type: query
    dddOwner: CI governance / docs governance
  - name: ValidateSystemGovernanceGenerationWorkflow
    type: query
    dddOwner: CI governance / docs governance
domainObjects:
  - name: GovernanceFileFingerprintBaseline
    type: generated read model manifest
    owner: CI governance / docs governance
  - name: GovernanceFileFingerprintShard
    type: generated read model shard
    owner: CI governance / docs governance
  - name: PlanningGovernanceFileQueryProjection
    type: planning DB query projection
    owner: CI governance / docs governance
fowlerSignals:
  - Generated artifact fan-out
  - Documentation drift
  - Hidden authority
  - Query model projection
architectureGuards:
  - node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
  - node --test scripts/planning-db-import.test.cjs
  - pnpm docs:gov:generated-policy
  - pnpm governance:refresh
cypressFlows:
  - N/A - repository governance generation only
completionGate:
  - node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
  - node --test scripts/planning-db-import.test.cjs
  - pnpm docs:gov:generated-policy
  - pnpm governance:refresh
  - pnpm verify:prepush
redGreenCycles:
  - id: fingerprint-baseline-shards
    redTest: node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
    expectedFailure: Fingerprint baseline rows are monolithic and cannot expand deterministic shard payloads before implementation.
    patchSurfaces:
      - scripts/check-governance-file-fingerprint-baseline.cjs
      - scripts/check-governance-file-fingerprint-baseline.test.cjs
    greenTest: node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
  - id: planning-db-import-fingerprint-shards
    redTest: node --test scripts/planning-db-import.test.cjs
    expectedFailure: Governance DB snapshot lacks fingerprint baseline shard metadata before import expansion is wired.
    patchSurfaces:
      - scripts/planning-db-import.cjs
      - scripts/planning-db-import.test.cjs
    greenTest: node --test scripts/planning-db-import.test.cjs
  - id: docs-governance-surface-alignment
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: Changed governance docs and scripts are outside declared surfaces before this manifest is added.
    patchSurfaces:
      - docs/generated-docs-policy.json
      - docs/architecture/components/ci-governance/system-governance-generation-workflow-component.md
      - docs/planning/proposals/mandatory/governance-and-docs/governance-file-index-sharding-plan-20260503.md
      - docs/planning/status/**
    greenTest: pnpm docs:feature-mechanization:implementation
symbols:
  - name: explicitOwnerFiles
    path: scripts/docs-quality-check.cjs
    dddOwner: CI governance / docs governance
    cqRails:
      - ValidateSystemGovernanceGenerationWorkflow
    fowlerSignals:
      - Documentation drift
    architectureGuard: pnpm docs:quality:check
    cypressCoverage: N/A - repository governance validation only
    unitTests:
      - pnpm docs:quality:check
  - name: crypto
    path: scripts/check-governance-file-fingerprint-baseline.cjs
    dddOwner: CI governance / docs governance
    cqRails:
      - RefreshGovernanceDerivedSurfaces
      - ValidateSystemGovernanceGenerationWorkflow
    fowlerSignals:
      - Generated artifact fan-out
      - Query model projection
    architectureGuard: node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
    cypressCoverage: N/A - repository governance generation only
    unitTests:
      - node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
  - name: baselineShardDir
    path: scripts/check-governance-file-fingerprint-baseline.cjs
    dddOwner: CI governance / docs governance
    cqRails:
      - RefreshGovernanceDerivedSurfaces
    fowlerSignals:
      - Generated artifact fan-out
    architectureGuard: pnpm docs:gov:generated-policy
    cypressCoverage: N/A - repository governance generation only
    unitTests:
      - node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
  - name: baselineShardDirRelativePath
    path: scripts/check-governance-file-fingerprint-baseline.cjs
    dddOwner: CI governance / docs governance
    cqRails:
      - RefreshGovernanceDerivedSurfaces
    fowlerSignals:
      - Generated artifact fan-out
    architectureGuard: pnpm docs:gov:generated-policy
    cypressCoverage: N/A - repository governance generation only
    unitTests:
      - node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
  - name: sha256
    path: scripts/check-governance-file-fingerprint-baseline.cjs
    dddOwner: CI governance / docs governance
    cqRails:
      - RefreshGovernanceDerivedSurfaces
      - ValidateSystemGovernanceGenerationWorkflow
    fowlerSignals:
      - Query model projection
      - Generated artifact fan-out
    architectureGuard: node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
    cypressCoverage: N/A - repository governance generation only
    unitTests:
      - node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
  - name: readFingerprintBaselineFromDisk
    path: scripts/check-governance-file-fingerprint-baseline.cjs
    dddOwner: CI governance / docs governance
    cqRails:
      - QuerySystemGovernanceGenerationWorkflow
      - ValidateSystemGovernanceGenerationWorkflow
    fowlerSignals:
      - Hidden authority
      - Query model projection
    architectureGuard: node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
    cypressCoverage: N/A - repository governance generation only
    unitTests:
      - node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
  - name: fingerprintShardIdForRow
    path: scripts/check-governance-file-fingerprint-baseline.cjs
    dddOwner: CI governance / docs governance
    cqRails:
      - RefreshGovernanceDerivedSurfaces
    fowlerSignals:
      - Generated artifact fan-out
    architectureGuard: node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
    cypressCoverage: N/A - repository governance generation only
    unitTests:
      - node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
  - name: buildFingerprintShardPayload
    path: scripts/check-governance-file-fingerprint-baseline.cjs
    dddOwner: CI governance / docs governance
    cqRails:
      - RefreshGovernanceDerivedSurfaces
    fowlerSignals:
      - Generated artifact fan-out
    architectureGuard: node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
    cypressCoverage: N/A - repository governance generation only
    unitTests:
      - node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
  - name: buildFingerprintBaseline
    path: scripts/check-governance-file-fingerprint-baseline.cjs
    dddOwner: CI governance / docs governance
    cqRails:
      - RefreshGovernanceDerivedSurfaces
      - QuerySystemGovernanceGenerationWorkflow
    fowlerSignals:
      - Generated artifact fan-out
      - Query model projection
    architectureGuard: node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
    cypressCoverage: N/A - repository governance generation only
    unitTests:
      - node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
  - name: normalizeBaselineInput
    path: scripts/check-governance-file-fingerprint-baseline.cjs
    dddOwner: CI governance / docs governance
    cqRails:
      - QuerySystemGovernanceGenerationWorkflow
    fowlerSignals:
      - Query model projection
    architectureGuard: node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
    cypressCoverage: N/A - repository governance generation only
    unitTests:
      - node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
  - name: expandFingerprintBaseline
    path: scripts/check-governance-file-fingerprint-baseline.cjs
    dddOwner: CI governance / docs governance
    cqRails:
      - QuerySystemGovernanceGenerationWorkflow
      - ValidateSystemGovernanceGenerationWorkflow
    fowlerSignals:
      - Hidden authority
      - Query model projection
    architectureGuard: node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
    cypressCoverage: N/A - repository governance generation only
    unitTests:
      - node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
      - node --test scripts/planning-db-import.test.cjs
  - name: removeStaleFingerprintShardFiles
    path: scripts/check-governance-file-fingerprint-baseline.cjs
    dddOwner: CI governance / docs governance
    cqRails:
      - RefreshGovernanceDerivedSurfaces
      - ValidateSystemGovernanceGenerationWorkflow
    fowlerSignals:
      - Generated artifact fan-out
    architectureGuard: pnpm governance:refresh
    cypressCoverage: N/A - repository governance generation only
    unitTests:
      - node --test scripts/check-governance-file-fingerprint-baseline.test.cjs
```

## Problem

`system-governance-file-index.files.yaml` contains one row per tracked file.
That makes the repository governable, but it creates avoidable operating cost:

- large diffs for small governance changes;
- poor AI ergonomics because agents must load a huge YAML file to inspect a
  small unit;
- frequent fingerprint churn when generated artifacts update each other;
- review noise around generated lines instead of the actual unit decision.

The root issue is not YAML itself. The root issue is that one generated YAML
file is carrying every file-level fact for the whole repository.

## Decision

Use deterministic ignored shard payloads for generated file-level governance
artifacts and rebuild equivalent query projections in the planning DB.

GitHub remains the review and enforcement platform, not the source database.
SQLite, JSONL, YAML shards, or Markdown summaries may be generated for local and
CI querying, but those artifacts must be derived from Git-tracked sources and
must not become manual truth.

## Target Shape

```text
.generated-docs/planning/status/system-governance-file-index-20260501.md
.generated-docs/planning/status/system-governance-file-index.files.yaml
.generated-docs/planning/status/governance-files/
  SYS-API.files.yaml
  SYS-WEB.files.yaml
  SYS-PLANSTORE.files.yaml
  SYS-RUNTIME.files.yaml
  SYS-DOCS-GOVERNANCE.files.yaml
.generated-docs/planning/status/system-governance-file-fingerprint-baseline.yaml
.generated-docs/planning/status/governance-file-fingerprints/
  SYS-API.fingerprints.yaml
  SYS-WEB.fingerprints.yaml
  SYS-PLANSTORE.fingerprints.yaml
  SYS-RUNTIME.fingerprints.yaml
  SYS-DOCS-GOVERNANCE.fingerprints.yaml
```

The root `system-governance-file-index.files.yaml` should become a compact
manifest with shard paths, counts, and hashes. It should not remain the normal
working surface for every file row.

The root `system-governance-file-fingerprint-baseline.yaml` follows the same
pattern: it records shard paths, counts, and content hashes, while the
per-file fingerprint rows live in deterministic `.fingerprints.yaml` shards.

## Canonicality Rules

- Git-tracked sources, the governance unit manifest, generator code, and
  generated-docs policy are the reviewed source of truth.
- Ignored generated shards are deterministic read-side artifacts.
- The root manifests record shard membership, file counts, and content hashes.
- A file may appear in exactly one generated shard per artifact family.
- Every `owningUnit` must exist in `system-governance-unit-index.units.yaml`.
- Every shard must resolve to a valid root, domain, workspace, component, or
  source unit.
- Planning DB imports expand compact manifests plus shards into query-store
  rows; the DB remains the canonical local operational read model.
- Generated YAML, SQLite, JSONL, or Markdown is cache/output only and must not
  be committed as truth unless explicitly classified as tracked generated docs.
- GitHub Actions may publish query artifacts or summary Markdown as artifacts.

## GitHub Role

GitHub should provide:

- PR checks for shard freshness and global coverage;
- PR summary comments for changed units and fingerprint impact;
- downloadable query artifacts for reviewers;
- CODEOWNERS and branch protection enforcement.

GitHub should not provide:

- the only copy of file ownership;
- mutable issue/project fields as canonical governance state;
- required network access for local validation.

## Validation Model

The generator and checks must prove:

```text
sum(files in shards) == git ls-files count
unique(paths in shards) == git ls-files paths
hash(root manifest) == hash(all shard manifests)
all owningUnit values exist
all component/source owners follow taxonomy
all drift and legacy flags remain visible in generated summaries
```

## Migration Sequence

1. Add this plan and review the storage decision.
2. Teach the file/component generator to write ignored shards under
   `.generated-docs/planning/status/governance-files/`.
3. Teach fingerprint baseline generation to write a compact manifest under
   `.generated-docs/planning/status/system-governance-file-fingerprint-baseline.yaml`
   plus ignored shards under
   `.generated-docs/planning/status/governance-file-fingerprints/`.
4. Teach checks and DB import to read the root manifest plus shards.
5. Keep generated artifacts ignored and validate their freshness through local
   and CI commands.
6. Add optional SQLite/JSONL generation as untracked CI/local artifacts.

## Non-Goals

- Do not move governance truth into GitHub Issues, Projects, or workflow
  artifacts.
- Do not introduce a committed database as canonical state.
- Do not relax coverage, fingerprint, drift, or changed-file gates.
- Do not use sharding to hide legacy or drift rows.

## Expected Outcome

The file governance system remains deterministic, reviewable, and offline
capable, while humans and AI agents can inspect the affected source, compact
manifest, or shard instead of a repository-wide generated file.

## Implementation Update 2026-05-11

The remaining monolith was the fingerprint baseline. Even after the
file/component index moved to local shards, the fingerprint baseline still
serialized every file row into one generated YAML artifact. This slice applies
the same manifest-plus-shards pattern to the fingerprint baseline and keeps the
planning DB import as the semantic query boundary.

Command/query rail ownership:

- Command: `RefreshGovernanceDerivedSurfaces`
- Query: `QuerySystemGovernanceGenerationWorkflow`
- Validation: `ValidateSystemGovernanceGenerationWorkflow`
- Owning bounded context: CI governance / docs governance

Implementation surfaces:

- `scripts/check-governance-file-fingerprint-baseline.cjs`
- `scripts/check-governance-file-fingerprint-baseline.test.cjs`
- `scripts/planning-db-import.cjs`
- `scripts/planning-db-import.test.cjs`
- `docs/generated-docs-policy.json`
- `docs/architecture/components/ci-governance/system-governance-generation-workflow-component.md`
- this plan

Validation baseline:

- `node --test scripts/check-governance-file-fingerprint-baseline.test.cjs`
- `node --test scripts/planning-db-import.test.cjs`
- `pnpm docs:gov:generated-policy`
- `pnpm governance:refresh`
- `pnpm verify:prepush`

## Implemented Guardrail

Generated-doc policy enforces hard size limits for governance generated
artifacts via `pnpm docs:gov:generated-policy`:

- `local-governance-file-indexes`: `maxBytes = 1,900,000`
- `local-governance-file-fingerprint-baseline`: `maxBytes = 2,100,000`

This makes unbounded growth a mechanical failure in local and CI validation
instead of a manual review concern.
