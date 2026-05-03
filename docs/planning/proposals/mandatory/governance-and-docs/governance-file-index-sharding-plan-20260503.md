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
as the single source of truth while replacing the monolithic file index with a
compact root index plus deterministic shards.

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

Use sharded YAML in Git as the canonical source for file-level governance.

GitHub remains the review and enforcement platform, not the source database.
SQLite or JSONL may be generated for local and CI querying, but those artifacts
must be derived from the Git-tracked shards.

## Target Shape

```text
docs/planning/status/system-governance-file-index-20260501.md
docs/planning/status/system-governance-file-index.files.yaml
docs/planning/status/governance-files/
  SYS-API.files.yaml
  SYS-WEB.files.yaml
  SYS-PLANSTORE.files.yaml
  SYS-RUNTIME.files.yaml
  SYS-DOCS-GOVERNANCE.files.yaml
```

The root `system-governance-file-index.files.yaml` should become a compact
manifest with shard paths, counts, and hashes. It should not remain the normal
working surface for every file row.

## Canonicality Rules

- Git-tracked shards are the source of truth.
- The root manifest records shard membership, file counts, and content hashes.
- A file may appear in exactly one shard.
- Every `owningUnit` must exist in `system-governance-unit-index.units.yaml`.
- Every shard must resolve to a valid root, domain, workspace, component, or
  source unit.
- Generated SQLite or JSONL is cache only and must not be committed as truth.
- GitHub Actions may publish SQLite, JSONL, or summary Markdown as artifacts.

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
2. Teach the generator to write shards under
   `docs/planning/status/governance-files/`.
3. Teach checks to read the root manifest plus shards.
4. Keep the current monolithic index as compatibility output for one PR if
   needed.
5. Remove or compact the monolithic file-row output after CI proves parity.
6. Add optional SQLite/JSONL generation as untracked CI/local artifacts.

## Non-Goals

- Do not move governance truth into GitHub Issues, Projects, or workflow
  artifacts.
- Do not introduce a committed database as canonical state.
- Do not relax coverage, fingerprint, drift, or changed-file gates.
- Do not use sharding to hide legacy or drift rows.

## Expected Outcome

The file governance system remains deterministic, reviewable, and offline
capable, while humans and AI agents can inspect the affected shard instead of a
repository-wide generated file.

## Implemented Guardrail

Generated-doc policy now enforces hard size limits for governance generated
artifacts via `pnpm docs:gov:generated-policy`:

- `tracked-governance-file-indexes`: `maxBytes = 1,900,000`
- `tracked-governance-file-fingerprint-baseline`: `maxBytes = 2,100,000`

This makes unbounded growth a mechanical failure in local and CI validation
instead of a manual review concern.
