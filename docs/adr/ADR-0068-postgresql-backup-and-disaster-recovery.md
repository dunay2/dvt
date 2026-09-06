---
title: ADR-0068 - PostgreSQL Backup and Disaster Recovery
status: Proposed
date: 2026-09-03
owners:
  - architecture
  - platform
  - sre
  - adapter-postgres
arc_level: ARC-1
---

# ADR-0068 - PostgreSQL Backup and Disaster Recovery

## Status

Proposed.

This ADR freezes the target continuity contract. It does **not** assert that the
contract is implemented or proven. The status may move to `Accepted` only after
issues #2874, #2875 and #2876 provide production configuration, isolated restore
evidence, writer-fencing evidence and measured recovery objectives.

Until then, the truthful operational posture is `CONTINUITY_UNVERIFIED`.

## Context

DVT persists operational product truth in PostgreSQL. The active PostgreSQL
adapter owns authoritative run metadata and run events together with derived
read models and operational coordination state such as intents, delivery
buffers, dead letters, lineage delivery, archive lifecycle and migration state.
The exact physical inventory evolves through the active migration authorities;
a hand-maintained table list is not an adequate backup boundary.

The repository already contains narrower recovery mechanisms:

- application-level run-event archive verification and rehydration;
- rebuildable projections derived from authoritative run events;
- bounded application recovery after transient PostgreSQL connectivity loss;
- separately governed Planning DB recovery.

None of those mechanisms is a full backup and disaster-recovery contract for the
operational PostgreSQL recovery unit.

A logical dump and point-in-time recovery also solve different problems.
`pg_dump` creates a consistent, portable backup of one database. PostgreSQL
cluster-global objects such as roles and tablespaces require `pg_dumpall` or an
explicit infrastructure-as-code authority. Native PITR instead requires a
physical base backup plus the continuous WAL sequence needed to replay to the
selected point, or a managed-service mechanism that proves equivalent behavior.

## Decision

### 1. One declared operational recovery unit

The protected payload is the complete DVT-owned operational PostgreSQL recovery
unit used by a production deployment.

It includes:

- every DVT-owned operational database and schema required for product
  correctness;
- authoritative run metadata and event history;
- derived snapshots, status heads and work queues;
- pre-dispatch intent, outbox, retry and dead-letter state;
- lineage delivery state;
- archive catalogs, leases and restore records;
- workspace, authorization and audit data when those capabilities are colocated
  in the same operational recovery unit;
- schema migration records, extensions, constraints, indexes, partitions, RLS
  policies and other database objects needed to interpret the rows correctly;
- cluster-global roles and tablespaces, either backed up or deterministically
  recreated from one tested infrastructure-as-code authority.

The current migration/composition authorities determine membership. A new
DVT-owned operational table is included by default; excluding it requires an
explicit architecture decision and recovery proof.

Native physical backup and PITR operate at PostgreSQL cluster scope. Therefore a
self-managed DVT operational cluster must not silently colocate customer source
or target databases outside the declared recovery set. A managed service that
advertises narrower recovery granularity must prove that granularity through an
isolated restore before DVT relies on it.

### 2. Explicit exclusions and dependency gates

This PostgreSQL backup payload does not itself include:

- customer source or target databases reached through governed connection
  references;
- Temporal service persistence and workflow histories;
- object-storage copies of plans, compiled artifacts, run contexts or archived
  run events;
- GitHub or GitLab repositories;
- secrets, KMS keys or Vault state;
- the Planning DB physical volume, whose current-state recovery remains
  Git-backed under its own authority;
- observability backends.

These systems can still be mandatory service-reopen dependencies. Restoring
PostgreSQL yields `DATABASE_RESTORED`; DVT reaches `DVT_RECOVERED` only after
integrity, writer-fencing and cross-system reconciliation gates pass.

### 3. Initial recovery objectives

The first production target is:

| Objective                      |                       Target | Measurement boundary                                                                                       |
| ------------------------------ | ---------------------------: | ---------------------------------------------------------------------------------------------------------- |
| Database RPO                   |               `<= 5 minutes` | selected incident/recovery cutoff minus the newest recoverable committed PostgreSQL state                  |
| Database RTO                   |              `<= 60 minutes` | disaster declaration to an isolated restored database passing mandatory database integrity gates           |
| DVT service RTO                |             `<= 120 minutes` | disaster declaration to controlled read/write reopening after writer fencing and dependency reconciliation |
| Recoverable PITR window        |                  `>= 7 days` | continuous interval covered by a valid base backup plus every required WAL segment, or managed equivalent  |
| Portable logical copy          | daily, retained `>= 30 days` | completed logical dump, global-object authority, checksum and manifest                                     |
| Automated restore verification |             at least monthly | unattended isolated restore plus deterministic integrity suite                                             |
| Witnessed recovery game day    |           at least quarterly | incident declaration through controlled service reopen                                                     |

These values are targets, not current SLAs. Every deployment reports one of:

- `TARGET_ONLY`: policy exists but implementation does not;
- `IMPLEMENTED_UNPROVEN`: backup mechanisms exist but no current restore proof
  meets the objective;
- `PROVEN`: current immutable evidence meets the objective;
- `EXPIRED`: the last required restore/game-day evidence is older than policy;
- `FAILED`: the latest required proof failed or exposed a broken recovery chain.

Only `PROVEN` permits a continuity claim.

### 4. Two complementary backup rails

#### Primary rail: physical backup and WAL/PITR

The primary operational recovery rail is either:

- a self-managed physical base backup created with supported PostgreSQL tooling
  plus continuous WAL archival; or
- a managed PostgreSQL backup/PITR facility that demonstrates the same bounded
  recovery window, isolation, observability and restore evidence.

The implementation must prove:

- a restorable base backup identity;
- a complete WAL chain for the declared recovery window;
- measurable archive freshness compatible with the RPO target, including
  low-write periods;
- encryption, retention and deletion ownership;
- restoration to a chosen point before a destructive or corrupting event;
- failure visibility for missing WAL, stale base backup or provider operation
  failure.

A filesystem snapshot without PostgreSQL-consistent base-backup semantics is not
accepted as PITR evidence.

#### Secondary rail: portable logical recovery

A logical backup is created with `pg_dump` in an archive format suitable for
`pg_restore`. It is accompanied by:

- an explicit global-object source: `pg_dumpall --globals-only` with role
  passwords omitted, or one tested infrastructure-as-code definition;
- an immutable backup identifier;
- source server major version and database identity;
- start/completion timestamps;
- content checksum and a readable archive catalog;
- encryption and retention metadata;
- backup-tool stderr and terminal outcome without secrets or row payloads.

The logical rail provides portability, inspection and an independent recovery
path. It is not a substitute for WAL-based PITR and does not satisfy the
five-minute RPO by itself.

### 5. Backup security and failure-domain separation

Backup data and WAL contain the effective contents of the protected databases.
They must be:

- encrypted in transit and at rest;
- stored outside the primary database failure domain;
- accessed through dedicated least-privilege identities;
- protected from mutation or premature deletion by the primary database
  runtime identity;
- retained and expired by an auditable policy;
- excluded from ordinary application logs, issue bodies and CI artifacts unless
  the data classification explicitly permits them;
- recoverable without placing plaintext credentials in source control or shell
  command arguments.

The repository records configuration and evidence references, never secret
values or production backup payloads.

### 6. Restore starts isolated and fails closed

Every logical or physical restore starts in an empty, isolated target with:

- no production endpoint or DNS identity;
- no application command traffic;
- API writes and all workers/outbound delivery disabled;
- separate recovery credentials and bounded network access;
- explicit cleanup ownership.

The procedure must stop on:

- failed checksum, invalid base-backup manifest or missing WAL;
- unsupported PostgreSQL major version;
- absent global objects, extensions or migrations;
- failed schema, partition, constraint, index or RLS checks;
- authoritative event-log integrity failure;
- impossible intent/outbox/dead-letter/archive state;
- missing or corrupt required external artifact references;
- inability to fence pre-recovery writers;
- unresolved Temporal histories or uncertain external side effects.

A database that starts but fails a mandatory integrity gate is not restored for
DVT purposes.

### 7. Authoritative and derived state are validated differently

Recovery verification respects current ownership rules:

- authoritative run events and their uniqueness/sequence invariants must be
  intact;
- snapshots, status heads and other declared projections may be rebuilt only
  through their canonical rebuild rails;
- projection state must never override authoritative event history;
- delivery, intent, lineage and archive lifecycle state is checked against its
  current transition and ownership rules;
- schema migration history is compared with the application version intended to
  reopen the database;
- tenant isolation is verified behaviorally, including a negative cross-tenant
  access proof.

### 8. PostgreSQL rewind requires distributed writer fencing

PITR can rewind PostgreSQL while pre-recovery API processes, workers or Temporal
executions still represent later history. DVT must not reconnect those writers
blindly.

Before service reopening, issue #2875 must prove that:

- new commands and outbound delivery remain quiesced;
- pre-recovery database sessions, credentials or processes cannot write to the
  restored database;
- active Temporal executions are inventoried against the selected recovery
  point and receive an explicit preserve, cancel, terminate, recover or
  operator-review outcome through existing Engine/maintenance authorities;
- required plan, run-context, compiled/artifact and archived-object references
  exist and pass integrity checks;
- unknown external-side-effect state fails closed rather than being replayed
  automatically.

No second workflow engine, lifecycle authority or state store is introduced for
DR.

### 9. Restore proof, not backup success, is the acceptance gate

Backup-job success and `pg_verifybackup` are useful evidence but cannot replace a
running test restore. DVT requires:

- at least one automated isolated restore every month;
- at least one witnessed end-to-end game day every quarter;
- an additional game day after a material change to PostgreSQL major version,
  backup provider, WAL/retention configuration, recovery automation, schema
  topology or writer-fencing semantics.

Every proof records:

- backup/base-backup identity and WAL range or managed-provider operation;
- selected recovery target;
- disaster declaration, quiescence, restore, integrity, reconciliation and
  reopen timestamps;
- achieved database RPO, database RTO and service RTO;
- every mandatory check and its result;
- participants, independent reviewer and corrective issues;
- the exact repository/application version used.

A failed or stale game day leaves the continuity posture `FAILED` or `EXPIRED`.
Targets are not weakened silently to make a drill pass.

### 10. Accountability

- **Platform/SRE/Database owner:** backup configuration, retention, WAL
  continuity, isolated restore and operational evidence.
- **DVT persistence owners:** recovery-set inventory, migrations and database
  integrity checks.
- **Engine/Temporal and worker owners:** quiescence, stale-writer fencing and
  workflow reconciliation.
- **Artifacts/traceability owners:** referenced-object integrity and recovery
  dependency checks.
- **Security owner:** credentials, encryption, access and evidence-data handling.
- **Incident commander:** recovery target, abort/reopen decisions and measured
  objective declaration.
- **Independent reviewer:** confirms evidence and opens corrective work when an
  objective or invariant fails.

## Rejected alternatives

- **`pg_dump` only:** portable but cannot provide continuous PITR or the target
  RPO.
- **Physical snapshots without WAL continuity:** no controlled point-in-time
  recovery guarantee.
- **Application run-event archive as database backup:** protects a bounded
  aggregate lifecycle, not the complete operational recovery unit.
- **Backup creation without restore tests:** proves file production, not service
  recoverability.
- **Backups writable by the primary runtime in the same failure domain:** a
  single operational or security event can destroy both source and recovery
  copy.
- **Treating database startup as DVT recovery:** ignores stale distributed
  writers, Temporal history and external artifacts.
- **Provider-specific architecture contract:** deployment details may vary, but
  measurable recovery semantics must remain stable.
- **Zero-RPO, automatic failover or active/active in this cut:** materially
  different availability designs without current product evidence.

## Consequences

The continuity design becomes explicit and testable without selecting a cloud
vendor prematurely. It adds storage, operational and drill cost, and the service
RTO is intentionally longer than the database RTO because DVT must reconcile
external execution and evidence before reopening.

The contract may expose that a colocated PostgreSQL cluster is an invalid
recovery boundary or that current data volume cannot meet the initial RTO. Such a
finding creates measured corrective work; it does not justify an undocumented
scope reduction.

## Verification obligations

Issues #2874, #2875 and #2876 must collectively prove:

```text
unrestorable selected backup                                      0
missing required WAL segment in the proven PITR window             0
successful restore with failed mandatory integrity gates           0
pre-recovery writer accepted after fencing                          0
unreconciled workflow allowed before service reopen                 0
backup secret or unapproved payload emitted to evidence/logs        0
overdue restore evidence while continuity is reported as PROVEN     0
```

The ADR remains `Proposed` while any required implementation/evidence issue is
open or while the latest mandatory evidence is stale.

## References

- [PostgreSQL 16: pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html)
- [PostgreSQL 16: pg_dumpall](https://www.postgresql.org/docs/16/app-pg-dumpall.html)
- [PostgreSQL 16: pg_basebackup](https://www.postgresql.org/docs/16/app-pgbasebackup.html)
- [PostgreSQL 16: Continuous archiving and PITR](https://www.postgresql.org/docs/16/continuous-archiving.html)
- [PostgreSQL 16: pg_verifybackup](https://www.postgresql.org/docs/16/app-pgverifybackup.html)
- [BCDR1 epic](https://github.com/dunay2/dvt/issues/2872)
- [BCDR1.1 decision task](https://github.com/dunay2/dvt/issues/2873)
- [ADR-0037](./ADR-0037-run-event-lifecycle-archival-verification-and-restore-model.md)
- [Gap 5 archive operations runbook](../runbooks/gap-5-archive-operations-runbook-20260319.md)
