---
id: R-20261102-DBT-PROJECT-ROOT-RELOCATION
title: Project root relocation must preserve bytes and persisted authority
status: Mitigating
date: 2026-11-02
owners:
  - API
  - Contracts
severity: High
probability: Low
---

# dbt Project Root Relocation

## Risk

A cosmetic move can strand a persisted Canvas binding, omit newly added files,
overwrite destination content or change graph/file authority. A process failure
between filesystem publication and database commit can leave moved files with
the previous authority root. A blind retry could then overwrite later user edits.

## Controls

- Preview binds exact tenant/project/environment, Canvas, authority revision,
  source paths and file hashes to a deterministic versioned plan.
- Apply uses the existing protected workspace-file write capability. It refuses
  multiple owners, graph/mixed/missing authority, stale revisions, differing
  destination bytes, private files, symlinks and unsupported text.
- Reuse the existing scoped CAS batch and its mutation coordinator. The complete
  subtree inventory is rechecked under that lock; later files cannot disappear
  silently during cleanup.
- Keep original bytes in private, revision-guarded metadata before deleting any
  source file. Recover only when current source/destination hashes prove the
  original move. Ambiguous recovery retains the snapshot and returns conflict.
- Serialize binding changes with sorted existing PostgreSQL advisory locks and
  a conditional revision update. Never run dbt inside that transaction.
- Preserve historical completed receipts and subsequent edits. Remove empty
  directories only, never recursively remove user files or the scoped root.

## Evidence And Residual Boundary

[ED-20261102-dbt-project-root-relocation](../evidence/ED-20261102-dbt-project-root-relocation.md)
records real filesystem/PostgreSQL integration, denied access, collision,
concurrent authority, rollback/retry and native dbt materialization evidence.
The actual workspace retained all seven file hashes after relocation.

The local filesystem coordinator serializes cooperating operations in one API
process. Multiple independent writers against the same local directory are not
admitted by this local adapter. A crash is recoverable from proven postconditions;
it is not a claim of a distributed atomic transaction. Operators must retain the
private snapshot when recovery reports conflict. Original import receipts remain
historical; the current persisted authority is the active root reference.

Git lifecycle and graph-to-dbt publication are separate governed intents. This
location migration does not remove their authority checks or claim those features
are delivered. These are explicit design boundaries, not accepted hidden debt.
