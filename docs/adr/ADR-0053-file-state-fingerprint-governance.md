---
title: ADR-0053 - File state fingerprint governance
status: Accepted
date: 2026-05-01
owners:
  - docs
  - architecture
---

# ADR-0053 - File State Fingerprint Governance

## Status

Accepted.

## Context

The repository now has generated governance indexes that classify every tracked
file by root unit, domain unit, component unit, owning unit, DDD owner,
command/query rail posture, drift status, legacy status, and governing
documentation.

That makes ownership visible, but it does not yet give each file a stable
machine identity or a compact current-state fingerprint. Without that identity,
reviewers and tooling can answer "where is this file governed?", but they
cannot cleanly answer:

- whether the same file changed content without changing governance;
- whether governance changed without content changing;
- whether a drift or legacy cohort changed between two revisions;
- which component, domain, or root unit is affected by a file-state change;
- whether an index row still describes the current content and classification.

The repository needs a deterministic seed per tracked file and separate hashes
for identity, content, governance classification, and aggregate state.

## Decision

DVT will add file-state fingerprints to the generated governance file index.

The fingerprint model is generated metadata. It is not embedded into source
files as comments or headers in the first implementation. The canonical record
lives in `docs/planning/status/system-governance-file-index.files.yaml`.

The accepted baseline for file-state fingerprints lives in
`docs/planning/status/system-governance-file-fingerprint-baseline.yaml`. CI MUST
compare the generated file index against that baseline. A content or governance
classification change is not accepted unless the index and the baseline are
both regenerated and reviewed together.

The reviewer-facing impact report lives in
`docs/planning/status/system-governance-file-fingerprint-impact-20260501.md`.
When the baseline check detects drift, tooling MUST be able to render impacted
root/domain/component units and classify changes as `content`, `governance`,
`both`, `added`, or `removed`.

Because that report is generated from the baseline comparison, its own content
MUST NOT create recursive file-state drift. The file index hashes it through a
stable generated-report marker while still retaining its path and governance
classification in the file index.

### Identity

Each tracked file receives a deterministic `fileId`.

The identity seed is:

```text
dvt:file:v1:<repo-relative-posix-path>
```

The `fileId` is the uppercase hexadecimal prefix of the SHA-256 digest of that
seed, formatted as:

```text
F-<12 hex chars>
```

Example:

```text
F-9A3C7E21D4B6
```

`fileId` is stable while the repository-relative path is stable. A move or
rename creates a new `fileId` unless a later ADR introduces an explicit rename
alias registry.

### Path Hash

Each file row records `pathHash`.

`pathHash` is the full lowercase SHA-256 digest of:

```text
dvt:file-path:v1:<repo-relative-posix-path>
```

This separates the stable human-sized identity from the full path identity
digest.

### Content Hash

Each file row records `contentHash`.

`contentHash` is the full lowercase SHA-256 digest of the tracked file content
as it exists in the working tree when the generator runs. Text files MUST be
hashed after canonical line-ending normalization to LF so CI governance does not
depend on the contributor operating system or Git checkout mode. Binary files
MUST keep their raw bytes.

The generator must fail rather than silently invent a content hash for a
missing tracked file.

Generated governance index files that contain their own volatile
`contentHash` or `stateFingerprint` values MUST be hashed after deterministic
normalization of those volatile scalar values. This prevents recursive
self-hashing while still hashing the current generated structure and governed
content.

### Governance Hash

Each file row records `governanceHash`.

`governanceHash` is the full lowercase SHA-256 digest of a canonical JSON
payload built from governance classification fields:

```json
{
  "rootUnit": "...",
  "domainUnit": "...",
  "componentUnit": "...",
  "owningUnit": "...",
  "ownerLevel": "...",
  "unitStatus": "...",
  "isDrift": false,
  "isLegacy": false,
  "dddOwner": "...",
  "cqRails": "...",
  "governance": ["..."],
  "unitPath": ["..."]
}
```

The canonical JSON object uses deterministic key ordering and deterministic
array order. This hash changes when classification changes, even if file
content does not.

### State Fingerprint

Each file row records `stateFingerprint`.

`stateFingerprint` is the full lowercase SHA-256 digest of a canonical JSON
payload:

```json
{
  "pathHash": "...",
  "contentHash": "...",
  "governanceHash": "..."
}
```

This value answers whether the file's current state, including content and
governance classification, changed.

## Required File-Index Fields

Every generated file row must include at least:

```yaml
fileId: F-...
path: ...
pathHash: ...
contentHash: ...
governanceHash: ...
stateFingerprint: ...
rootUnit: ...
domainUnit: ...
componentUnit: ...
owningUnit: ...
unitPath:
  - ...
ownerLevel: ...
unitStatus: ...
isDrift: false
isLegacy: false
dddOwner: ...
cqRails: ...
governance:
  - ...
```

## Consequences

- File identity becomes deterministic and queryable without opening source
  files.
- Content changes and governance-classification changes can be detected
  independently.
- CI can reject unreviewed fingerprint drift by comparing the generated index
  against the accepted baseline.
- Reviewers get a component-grouped impact report instead of only raw hash
  differences.
- Component, domain, and root impact analysis can use the generated index as a
  stable input.
- Rename tracking is intentionally not solved by the first implementation.
- Source files are not modified merely to carry governance marks; the generated
  index remains the single writer for file-state marks.

## Implementation Requirements

The first implementation must:

- update `scripts/generate-governance-file-component-index.cjs`;
- add test coverage proving deterministic `fileId`, content hash,
  governance hash, and aggregate state fingerprint behavior;
- regenerate `system-governance-file-index.files.yaml`;
- generate and validate `system-governance-file-fingerprint-baseline.yaml`;
- generate the reviewer impact report for file-fingerprint drift;
- keep `docs:governance:file-component-index:check` deterministic;
- keep `docs:governance:file-fingerprint-baseline:check` deterministic;
- keep `pnpm verify:prepush` green.

## Related Sources

- `docs/planning/status/system-governance-file-index.files.yaml`
- `docs/planning/status/system-governance-file-fingerprint-baseline.yaml`
- `docs/planning/status/system-governance-file-fingerprint-impact-20260501.md`
- `docs/planning/status/system-governance-file-index-20260501.md`
- `docs/planning/status/system-governance-component-index.components.yaml`
- `docs/planning/status/system-governance-unit-index.units.yaml`
- `scripts/generate-governance-file-component-index.cjs`
- `scripts/check-governance-file-fingerprint-baseline.cjs`
- `docs/planning/status/governance-document-rule-inventory.md`
