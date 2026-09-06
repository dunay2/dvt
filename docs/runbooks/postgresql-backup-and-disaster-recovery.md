---
title: PostgreSQL Backup and Disaster Recovery Runbook
status: Review
owner: Platform / SRE / Database / Runtime
last_reviewed: 2026-09-03
---

# PostgreSQL Backup and Disaster Recovery Runbook

## 1. Purpose and truth status

This runbook defines the operator path for the DVT-owned operational PostgreSQL
recovery unit governed by
[ADR-0068](../adr/ADR-0068-postgresql-backup-and-disaster-recovery.md).

The document is currently `Review`, not production certification. Commands are
provider-neutral reference templates. Issue #2874 must bind them to an auditable
production backup profile, #2875 must prove writer fencing and distributed
reconciliation, and #2876 must provide measured restore/game-day evidence.

Until those tasks are complete, report the posture as:

```text
CONTINUITY_UNVERIFIED
```

Never infer recoverability from a green backup job alone.

## 2. Target objectives

| Objective                  |                                                 Target |
| -------------------------- | -----------------------------------------------------: |
| Database RPO               |                                         `<= 5 minutes` |
| Database RTO               |                                        `<= 60 minutes` |
| DVT service RTO            |                                       `<= 120 minutes` |
| PITR recovery window       |                                            `>= 7 days` |
| Logical backup             |                  at least daily, retained `>= 30 days` |
| Automated isolated restore |                                       at least monthly |
| Witnessed game day         | at least quarterly and after material recovery changes |

These targets become claims only when a current drill measures them.

## 3. Safety invariants

1. Restore into an empty isolated target first. Never test recovery by overwriting
   the live primary.
2. Keep API command traffic, Temporal activities and every DVT worker/outbound
   delivery path disabled until the explicit reopen gate.
3. Use `PGSERVICE`, a secret manager, workload identity or an equivalent
   credential authority. Do not place passwords in this file, Git, issue prose,
   shell history or command arguments.
4. Treat dumps, physical backups and WAL as production data. Encrypt them and do
   not attach them to CI or GitHub.
5. Preserve the failed/original primary and selected backup artifacts until the
   incident commander authorizes cleanup.
6. Do not run `pg_restore --clean`, `dropdb`, data-directory deletion or provider
   replacement against an endpoint that has not been independently confirmed as
   the isolated recovery target.
7. A running PostgreSQL process is not sufficient. Mandatory integrity,
   isolation, fencing and reconciliation gates must pass.
8. On uncertainty, stop in no-write/no-delivery mode and escalate. Do not make
   the procedure succeed by skipping a failed check.

## 4. Recovery-state model

```text
INCIDENT_DECLARED
  -> WRITERS_QUIESCED
  -> RECOVERY_TARGET_SELECTED
  -> DATABASE_RESTORED
  -> DATABASE_INTEGRITY_VERIFIED
  -> OLD_WRITERS_FENCED
  -> TEMPORAL_AND_ARTIFACTS_RECONCILED
  -> DVT_RECOVERED
  -> TRAFFIC_REOPENED
```

`DATABASE_RESTORED` and `DVT_RECOVERED` are deliberately different states.

## 4.1 Target operator command/query catalog

These are deployment operator rails, not new product HTTP APIs. They are declared
here before automation in #2874–#2876; no production implementation or restore
certification is claimed by this documentation cut.

| Rail                              | Type / owner                       | Object / application port                                        | Adapter and authorized scope                                                                           | Negative proof                                                                               |
| --------------------------------- | ---------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| BackupOperationalPostgres         | Command / Platform and persistence | Immutable operational backup / deployment backup profile (#2874) | PostgreSQL backup utilities or managed equivalent; approved recovery set and dedicated backup identity | Existing backup ID, missing global authority, failed dump, missing WAL, checksum mismatch    |
| RestoreOperationalPostgres        | Command / Platform and persistence | Isolated recovery target / deployment restore profile (#2874)    | PostgreSQL restore utilities or managed equivalent; independently verified empty isolated target       | Production endpoint, unsupported version, wrong target, corrupt backup, missing required WAL |
| VerifyOperationalPostgresRecovery | Query / persistence and runtime    | Recovery evidence / governed integrity proof bundle (#2876)      | Approved SQL and existing domain tests; isolated target and reviewer-authorized evidence access        | Cross-tenant access, corrupt events, missing artifacts, stale writer accepted                |

Projection rebuild and workflow reconciliation reuse their existing authorities;
Issue #2875 owns fencing and reopening. The verification query invokes those commands
only through their declared, separately authorized rails when a proof needs them.

## 5. Roles

| Role                            | Responsibility                                                       |
| ------------------------------- | -------------------------------------------------------------------- |
| Incident commander              | declares incident, selects recovery target, authorizes abort/reopen  |
| Database operator               | backup inventory, restore, PostgreSQL integrity evidence             |
| Platform/SRE operator           | storage, KMS, networking, process/credential fencing                 |
| Runtime/Temporal operator       | workflow inventory and reconciliation                                |
| Artifacts/traceability operator | verifies plans, run contexts, compiled and archived objects          |
| Security contact                | credential exposure, evidence classification and incident escalation |
| Independent reviewer            | validates timestamps, checks and objective calculation               |

One person can hold multiple roles in a small deployment, but the independent
review must remain explicit.

## 6. Recovery set and exclusions

### Protected operational recovery set

Use the active DVT PostgreSQL migration/composition authorities to inventory all
DVT-owned operational schemas and global objects at the time of the drill. At a
minimum, expect the families that own:

- run metadata and authoritative run events;
- snapshots, status heads and projection work queues;
- start-run intent, outbox, retry and dead-letter state;
- lineage delivery state;
- archive catalogs, leases and restore records;
- migration state;
- colocated workspace, authorization and audit state;
- partitions, indexes, constraints, extensions and RLS policies.

Do not rely on this prose as the final physical inventory.

### Outside the PostgreSQL backup payload

- customer/source/target databases;
- Temporal service persistence;
- object-storage artifacts and run-event archives;
- Git repositories;
- secrets/KMS/Vault state;
- the Planning DB physical volume;
- observability backends.

Record which exclusions are required dependencies before reopening DVT.

### PostgreSQL version posture

The current GitHub integration workflows use PostgreSQL 15; the local isolated
validation container uses PostgreSQL 16. These reference commands use options
available in both. This is not a broader production support certification.
Select a pg_dump client at least as new as the source server and a compatible
pg_restore client; physical backup, WAL verification and PITR must use the
server major version required by the approved deployment profile. Do not infer
cross-major physical recovery from a successful logical dump.

## 7. Standard environment variables

The implementation profile must map these logical variables to its platform.
They are names, not secret values.

```bash
set -euo pipefail
umask 077

export PGSERVICE=dvt_production_backup
export DVT_DATABASE=dvt
export DVT_SCHEMA=dvt
export DVT_BACKUP_ROOT=/secure/dvt-backups
export DVT_RESTORE_ROOT=/isolated/dvt-restore
export DVT_RECOVERY_SERVICE=dvt_isolated_recovery
export DVT_RECOVERY_ADMIN_SERVICE=dvt_isolated_recovery_admin
export DVT_BACKUP_ID="$(date -u +%Y%m%dT%H%M%SZ)"
```

Required preflight:

```bash
: "${PGSERVICE:?missing backup connection service}"
: "${DVT_DATABASE:?missing database name}"
: "${DVT_BACKUP_ROOT:?missing protected backup root}"
: "${DVT_BACKUP_ID:?missing backup identity}"

pg_isready --dbname="service=${PGSERVICE} dbname=${DVT_DATABASE}"
psql --no-psqlrc --tuples-only --no-align \
  --dbname="service=${PGSERVICE} dbname=${DVT_DATABASE}" \
  --command="SELECT current_setting('server_version_num'), current_database(), pg_is_in_recovery();"
```

Stop if the endpoint, database identity, PostgreSQL major version or intended
primary/standby role does not match the approved backup profile.

## 8. Routine operational checks

### 8.1 Backup/PITR health

For self-managed WAL archival, capture without exposing secret-bearing commands:

```bash
psql --no-psqlrc --dbname="service=${PGSERVICE} dbname=${DVT_DATABASE}" <<'SQL'
SHOW wal_level;
SHOW archive_mode;
SHOW archive_timeout;
SELECT archived_count,
       failed_count,
       last_archived_wal,
       last_archived_time,
       last_failed_wal,
       last_failed_time,
       stats_reset
FROM pg_stat_archiver;
SQL
```

Do not print `archive_command`, `restore_command`, provider credentials or object
store URLs into broadly retained logs. Verify their configured identities through
the platform's protected configuration inventory.

Required operational signals:

- last successful logical backup and age;
- current valid base backup and age;
- newest durably archived/recoverable WAL position/time;
- archive failures and gap detection;
- oldest retained recoverable point;
- retention/deletion health;
- last successful automated restore and game-day age.

Any gap inside the declared PITR window changes posture to `FAILED` until a new
continuous window is proven.

### 8.2 Low-write periods and RPO

Completed WAL segments are the unit archived by native archive commands. The
production profile must demonstrate that low-write periods do not violate the
five-minute RPO target. Use an evidence-backed `archive_timeout`, managed
continuous-log facility or equivalent mechanism. Do not copy a timeout value from
this runbook without measuring storage, WAL and recovery consequences.

## 9. Logical backup procedure

`pg_dump` provides the portable rail for one database. It does not provide PITR.

### 9.1 Create an immutable backup staging directory

```bash
BACKUP_DIR="${DVT_BACKUP_ROOT}/logical/${DVT_BACKUP_ID}"
install -d -m 0700 "${DVT_BACKUP_ROOT}/logical"
mkdir -m 0700 "${BACKUP_DIR}"

DUMP_FILE="${BACKUP_DIR}/${DVT_DATABASE}.dump"
GLOBALS_FILE="${BACKUP_DIR}/globals.sql"
TOC_FILE="${BACKUP_DIR}/toc.list"
MANIFEST_FILE="${BACKUP_DIR}/manifest.env"
CHECKSUM_FILE="${BACKUP_DIR}/SHA256SUMS"
```

An existing backup ID makes `mkdir` fail; never overwrite a previous backup.
The staging filesystem must already be encrypted and must not be the final or
only backup location.

### 9.2 Dump the operational database

```bash
BACKUP_STARTED_AT_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
pg_dump \
  --dbname="service=${PGSERVICE} dbname=${DVT_DATABASE}" \
  --format=custom \
  --compress=6 \
  --file="${DUMP_FILE}" \
  --verbose

pg_restore --list "${DUMP_FILE}" > "${TOC_FILE}"
```

Review stderr and fail on warnings classified by the approved implementation
profile. Do not use `--no-sync` for a production backup.

### 9.3 Capture or bind cluster-global objects

Choose exactly one mode. IaC mode binds the immutable revision/hash of the tested
role and tablespace authority. Globals mode captures roles/tablespaces without
password hashes. Missing or unknown mode fails closed.

```bash
: "${DVT_GLOBAL_OBJECT_MODE:?choose iac or globals}"
case "${DVT_GLOBAL_OBJECT_MODE}" in
  iac)
    : "${DVT_GLOBAL_OBJECT_AUTHORITY_REF:?missing immutable IaC authority revision}"
    ;;
  globals)
    pg_dumpall \
      --dbname="service=${PGSERVICE} dbname=postgres" \
      --globals-only \
      --no-role-passwords \
      --file="${GLOBALS_FILE}" \
      --verbose
    ;;
  *) printf 'Unknown global-object mode\n' >&2; exit 1 ;;
esac
```

If the provider does not expose the `postgres` database, bind the approved
maintenance database in the production profile. Role secrets are restored from
the secret/IaC authority, never from the dump.

### 9.4 Record manifest and checksums

```bash
SOURCE_SERVER_VERSION_NUM="$(
  psql --no-psqlrc --tuples-only --no-align \
    --dbname="service=${PGSERVICE} dbname=${DVT_DATABASE}" \
    --command="SELECT current_setting('server_version_num')"
)"
BACKUP_COMPLETED_AT_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
{
  printf 'backup_id=%s\n' "${DVT_BACKUP_ID}"
  printf 'database=%s\n' "${DVT_DATABASE}"
  printf 'started_at_utc=%s\n' "${BACKUP_STARTED_AT_UTC}"
  printf 'completed_at_utc=%s\n' "${BACKUP_COMPLETED_AT_UTC}"
  printf 'pg_dump_version=%s\n' "$(pg_dump --version)"
  printf 'source_server_version_num=%s\n' "${SOURCE_SERVER_VERSION_NUM}"
  printf 'global_object_mode=%s\n' "${DVT_GLOBAL_OBJECT_MODE}"
  if [ "${DVT_GLOBAL_OBJECT_MODE}" = iac ]; then
    printf 'global_object_authority_ref=%s\n' "${DVT_GLOBAL_OBJECT_AUTHORITY_REF}"
  fi
} > "${MANIFEST_FILE}"

CHECKSUM_INPUTS=("${DVT_DATABASE}.dump" toc.list manifest.env)
if [ "${DVT_GLOBAL_OBJECT_MODE}" = globals ]; then
  CHECKSUM_INPUTS+=(globals.sql)
fi
(
  cd "${BACKUP_DIR}"
  sha256sum "${CHECKSUM_INPUTS[@]}" > SHA256SUMS
  sha256sum --check SHA256SUMS
)
```

The implementation must replace ad hoc staging with an atomic upload/publish
protocol so a partial backup cannot become selectable.

### 9.5 Publish and retain

The platform implementation must:

- encrypt/upload the complete backup set;
- publish the manifest only after every object is durable and checksummed;
- make the backup immutable for its retention window;
- record storage/KMS identity without secret material;
- enforce daily schedule and `>= 30 day` retention;
- emit success/failure/freshness evidence.

A directory left only on the database host is not a completed backup.

## 10. Logical restore procedure

### 10.1 Mandatory isolation preflight

Before any destructive or create operation, the database operator and independent
reviewer record:

```text
recovery endpoint
network boundary
empty target cluster/database identity
production DNS mismatch
API/worker/outbound delivery disabled
recovery credential identity
selected backup ID and checksum result
```

Stop if the target could resolve to production.

### 10.2 Validate and inspect the backup

Bind `BACKUP_DIR` to the downloaded, isolated backup directory and rebind
`DUMP_FILE`, `TOC_FILE` and `GLOBALS_FILE` to its members without repeating the
staging-directory creation. Checksums use relative member paths so verification
survives transfer to the recovery host.

```bash
( cd "${BACKUP_DIR}" && sha256sum --check SHA256SUMS )
RESTORE_TOC_FILE="$(mktemp)"
pg_restore --list "${DUMP_FILE}" > "${RESTORE_TOC_FILE}"
cmp --silent "${TOC_FILE}" "${RESTORE_TOC_FILE}"
rm -- "${RESTORE_TOC_FILE}"
```

Treat a dump as input from its source superusers. Inspect the archive catalog and
approved global-object source before restoration.

### 10.3 Recreate global objects

- In IaC mode, apply the exact recorded authority revision and restore role
  credentials through the secret authority.
- In globals mode, execute the reviewed globals script in the empty isolated
  cluster using the tested provider-specific bootstrap procedure.

Example for a cluster whose bootstrap role is known not to collide with the
source role catalog:

```bash
psql --no-psqlrc \
  --set=ON_ERROR_STOP=1 \
  --dbname="service=${DVT_RECOVERY_ADMIN_SERVICE} dbname=postgres" \
  --file="${GLOBALS_FILE}"
```

Do not ignore unexpected role/tablespace errors. Managed-provider built-in role
exceptions must be explicitly allow-listed and tested by #2874.

### 10.4 Create the empty database and restore

Use provider/IaC database creation with the expected owner, encoding and locale.
Then:

```bash
pg_restore \
  --dbname="service=${DVT_RECOVERY_ADMIN_SERVICE} dbname=${DVT_DATABASE}" \
  --exit-on-error \
  --verbose \
  "${DUMP_FILE}"
```

Do not use `--clean` in a shared cluster. The approved target is empty by
construction.

Proceed to the mandatory integrity gates in section 13.

## 11. Self-managed physical base backup procedure

Managed services may expose a different operation, but must produce equivalent
identity, coverage, encryption, retention, observability and isolated restore
evidence.

### 11.1 Preconditions

- PostgreSQL major version is supported by the approved profile;
- `wal_level` is `replica` or higher;
- WAL archival is enabled and healthy;
- the backup identity has required replication privileges and no application
  write privileges;
- all tablespaces and their restore mappings are inventoried;
- the backup target is empty, encrypted and outside the primary data directory.

### 11.2 Create and verify a plain-format base backup

```bash
export PGSERVICE=dvt_physical_backup
PHYSICAL_BACKUP_DIR="${DVT_BACKUP_ROOT}/physical/${DVT_BACKUP_ID}"
install -d -m 0700 "${DVT_BACKUP_ROOT}/physical"
mkdir -m 0700 "${PHYSICAL_BACKUP_DIR}"
BASE_DIR="${PHYSICAL_BACKUP_DIR}/data"
mkdir -m 0700 "${BASE_DIR}"

pg_basebackup \
  --pgdata="${BASE_DIR}" \
  --format=plain \
  --wal-method=stream \
  --label="dvt-${DVT_BACKUP_ID}" \
  --progress \
  --verbose \
  --no-password

pg_verifybackup --exit-on-error --progress "${BASE_DIR}"
```

The exclusive directory creation reserves the local physical backup ID even if
a previous attempt stopped before writing data. The implementation profile must
also reject an already published ID and use conditional creation at publication
so concurrent writers cannot claim the same immutable evidence identity.

The implementation profile adds any required tablespace mappings and resource
limits. `pg_verifybackup` is necessary evidence but does not replace a test
restore.

### 11.3 Complete backup evidence

Record:

- backup manifest digest;
- PostgreSQL and `pg_basebackup` versions;
- start/end LSN and required WAL range from the backup manifest/provider;
- tablespace mappings;
- encrypted storage identity;
- upload completion and retention state;
- successful verification output reference;
- the earliest and latest recoverable timestamp currently demonstrated.

Do not mark the backup selectable until every required WAL segment is durable.

## 12. PITR restore procedure

### 12.1 Quiesce and preserve

Before selecting the recovery target, record T0 and then confirm T1:

- reject new API commands;
- stop/disable API write instances and all DVT workers;
- stop outbound delivery;
- preserve the failed primary and its newest available WAL;
- invoke the BCDR1.3 fencing procedure so pre-recovery writers cannot reconnect;
- copy, do not move, any unarchived WAL selected for evidence/recovery.

### 12.2 Declare the target

The incident commander records:

```text
incident time
last known safe business event
newest technically recoverable point
deliberately selected recovery target in UTC
expected data-loss interval
selected base backup
required WAL range
```

The target must be before the destructive/corrupting event and within the proven
WAL window.

### 12.3 Restore the base backup into an empty target

Use the tested implementation profile to restore/extract the selected base backup
with the database-system owner and correct permissions. Restore all tablespaces
using the recorded mappings. Do not improvise paths during an incident.

Keep ordinary client access denied in `pg_hba.conf` or the managed service
network policy.

### 12.4 Configure targeted recovery

The self-managed profile must provide a protected `restore_command` wrapper that
returns success only after the requested WAL file is durably retrieved and
verified. It must not embed credentials in `postgresql.conf`.

Reference configuration:

```conf
restore_command = 'dvt-wal-restore %f %p'
recovery_target_time = 'YYYY-MM-DD HH:MM:SS+00'
recovery_target_action = 'pause'
```

Then create the recovery signal in the isolated data directory:

```bash
install -m 0600 /dev/null "${DVT_RESTORE_ROOT}/data/recovery.signal"
```

Do not create `standby.signal` for a one-off targeted recovery. Start the isolated
server and monitor recovery logs. A requested WAL file that is absent must return
a non-zero retrieval result. Distinguish PostgreSQL's normal end-of-archive
probe from a missing segment required to reach the selected target. Failure to
reach that target or any gap in its required WAL chain is a stop condition.

Managed services must record the equivalent provider restore operation ID,
source backup, target time, resulting isolated endpoint and terminal status.

### 12.5 Pause, inspect and finish

At the selected target:

1. confirm PostgreSQL reached the requested recovery target;
2. keep ordinary access and every DVT writer disabled;
3. record `T3` (`DATABASE_RESTORED`);
4. execute the read-only integrity checks in section 13;
5. only after approval, complete/promote the isolated recovery according to the
   tested provider profile, keeping all application writers disabled;
6. complete any integrity proofs that require writes in the isolated target
   (including governed projection rebuild and adversarial tenant checks);
7. never reopen traffic until sections 13 and 14 are complete.

If the selected point is wrong, discard the isolated target and repeat from the
unchanged base backup with a new evidence identity.

## 13. Mandatory database integrity gates

Issue #2876 must mechanize these checks. Until then, execute the repository-owned
proofs and approved SQL bundle for the exact application version. Manual spot
checks alone are insufficient for `PROVEN` status.

### 13.1 Server, version and migration compatibility

- `pg_isready` succeeds on the isolated endpoint;
- expected PostgreSQL major version, database identity, encoding and locale;
- required extensions exist;
- `schema_migrations` contains no unknown or missing required version;
- intended application version is compatible with restored schema state.

### 13.2 Physical schema

- every expected DVT-owned schema/table family is present;
- partitions and partition bounds match current migration authority;
- primary/unique/foreign/check constraints exist and validate;
- required indexes exist;
- no unexpected unlogged state is relied upon for authority;
- tablespaces resolve to approved isolated paths.

### 13.3 Tenant isolation

Capture the RLS catalog posture:

```sql
SELECT n.nspname,
       c.relname,
       c.relrowsecurity,
       c.relforcerowsecurity
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = :'dvt_schema'
  AND c.relkind IN ('r', 'p')
ORDER BY n.nspname, c.relname;
```

Run the repository-owned negative cross-tenant test with the same service-owner
and tenant-context modes used in production. Catalog flags without a behavioral
negative test are not sufficient.

### 13.4 Authoritative run-event integrity

Using the approved schema-qualified SQL/test bundle, prove:

- no duplicate `(run_id, run_seq)`;
- no duplicate `(run_id, idempotency_key)`;
- run sequence/heads are internally coherent;
- event envelopes required by current contracts validate;
- hash partitions contain rows valid for their partition constraint;
- tenant/project/environment ownership is not lost.

`run_events` wins over derived projection state if they disagree.

### 13.5 Derived and operational state

- snapshots/status heads are consistent or rebuild successfully through their
  canonical projection rails;
- start-run intent and run metadata contain no impossible lifecycle combination;
- outbox/retry/dead-letter and lineage delivery state obey current transition,
  claim and fencing invariants;
- archive catalogs, leases, delete lifecycle and restore records are coherent;
- no purge/rebuild step mutates authoritative history.

### 13.6 External references

For a deterministic representative set and every run selected for resume:

- PlanRef and stored plan exist and validate integrity;
- RunExecutionContext exists and matches the run;
- compiled/artifact references exist and checksum correctly;
- archived run-event objects referenced by the catalog exist and verify;
- required Git revision and secret identifiers are resolvable without exposing
  secret values.

A missing required object stops automatic reopening.

### 13.7 Record `T4`

When every database gate passes, record:

```text
DATABASE_INTEGRITY_VERIFIED
T4=<UTC timestamp>
```

Do not start normal workers yet.

## 14. Writer fencing and distributed reconciliation

Follow issue #2875's implemented runbook/rail. At minimum:

1. prove old API/worker processes and sessions cannot write to the restored
   endpoint;
2. rotate/revoke or otherwise fence pre-recovery credentials/process epochs;
3. enumerate active Temporal executions relative to the selected recovery time;
4. assign each one an auditable preserve, cancel, terminate, recover/restart or
   manual-review outcome through existing Engine/maintenance boundaries;
5. reconcile start intent, event log, provider execution, outbox and external
   side-effect evidence;
6. verify required artifacts and archives;
7. run an adversarial stale-writer attempt and require rejection;
8. record `T5` only when no unresolved execution can mutate rewound state.

Unknown external side effects are not replayed automatically.

## 15. Controlled reopen

Reopen in stages:

1. read-only/database readiness;
2. API query paths;
3. one controlled command path with bounded observation;
4. projector/lineage workers;
5. outbox/outbound delivery;
6. Temporal workers and approved recovered/new executions;
7. normal traffic.

At each stage, stop and return to degraded/no-write posture on integrity,
fencing, error-rate, backlog or reference failures.

Record `T6` only after the incident commander and independent reviewer accept the
full gate:

```text
DVT_RECOVERED
TRAFFIC_REOPENED
```

## 16. RPO and RTO calculation

Record immutable UTC timestamps:

```text
T0 incident/game-day declared
T1 writers confirmed quiesced
T2 recovery target selected
T3 PostgreSQL restored and started
T4 database integrity gates passed
T5 writers fenced and dependencies reconciled
T6 controlled DVT traffic reopened
```

Calculate:

```text
achieved_database_RTO = T4 - T0
achieved_service_RTO  = T6 - T0
achieved_RPO          = recovery_cutoff - newest_recovered_committed_state
```

Also record:

```text
newest_technically_recoverable_state
chosen_recovery_target
deliberate_rewind = newest_technically_recoverable_state - chosen_recovery_target
```

Do not hide a deliberate business rewind inside the infrastructure RPO result.

## 17. Automated restore and game-day cadence

### Monthly automated restore

- select a real retained backup/recovery point;
- restore into a disposable isolated environment;
- execute all mechanized database integrity gates;
- prove no outbound side effect is possible;
- retain immutable results and cleanup evidence;
- alert on failure or overdue evidence.

The schedule must cover both logical and PITR rails over the defined test cycle.

### Quarterly witnessed game day

Exercise the complete state model through controlled reopen, including:

- declared corrupting/destructive event and recovery target;
- quiescence and stale-writer fencing;
- logical or PITR restore, alternating scenarios over time;
- database gates;
- Temporal/artifact reconciliation;
- adversarial stale-writer attempt;
- staged reopen;
- measured RPO/RTO and follow-up issues.

Run an additional game day after material recovery changes.

## 18. Evidence template

```yaml
exercise_id: BCDR-YYYYMMDD-NN
exercise_type: automated-restore | witnessed-game-day
repository_sha: <sha>
application_version: <version>
postgresql_version: <version>
backup_profile: <profile-id-and-revision>
backup_id: <logical-or-base-backup-id>
wal_range_or_provider_operation: <reference>
recovery_target_utc: <timestamp>
newest_technically_recoverable_utc: <timestamp>
T0_declared_utc: <timestamp>
T1_quiesced_utc: <timestamp>
T2_target_selected_utc: <timestamp>
T3_database_started_utc: <timestamp>
T4_database_verified_utc: <timestamp>
T5_reconciled_utc: <timestamp>
T6_reopened_utc: <timestamp-or-null>
achieved_rpo_seconds: <integer>
achieved_database_rto_seconds: <integer>
achieved_service_rto_seconds: <integer-or-null>
deliberate_rewind_seconds: <integer>
integrity_result: PASS | FAIL
writer_fence_result: PASS | FAIL | NOT_APPLICABLE
reconciliation_result: PASS | FAIL | NOT_APPLICABLE
outbound_side_effects_observed: 0
participants: [<roles-or-approved-identities>]
independent_reviewer: <approved-identity>
evidence_location: <immutable-reference>
follow_up_issues: [<issue-urls>]
exercise_result: PASS | FAIL
deployment_continuity_evidence: <current-aggregate-evidence-reference-or-null>
```

This record reports the outcome of one exercise only. A monthly restore may
pass with no service reopen, but that result cannot elevate deployment continuity
to `PROVEN`. The separate aggregate continuity assessment requires the current
production backup configuration, all required restore evidence, a current witnessed
game day, successful fencing/reconciliation and measured service reopen. Missing
required proof remains unproven; stale required proof is `EXPIRED`; a failed
required proof is `FAILED`, even when this individual exercise passes.

Never include credentials, raw customer rows or backup payloads in this record.

## 19. Abort and escalation conditions

Abort or remain in fail-closed degraded mode when:

- target endpoint identity is ambiguous;
- selected backup or required WAL cannot be verified;
- restore requires an undocumented provider exception;
- PostgreSQL reaches the wrong target or timeline;
- migrations or application version are incompatible;
- tenant isolation or authoritative event integrity fails;
- required external artifacts are missing;
- stale writers cannot be fenced;
- Temporal/external-side-effect state is unresolved;
- evidence storage is unavailable;
- any operator is asked to skip a mandatory gate to meet RTO.

Escalate to the incident commander, security owner and relevant persistence or
runtime owner. Preserve all evidence and open corrective GitHub issues. A failed
objective keeps the BCDR epic open.

## 20. References

- [ADR-0068](../adr/ADR-0068-postgresql-backup-and-disaster-recovery.md)
- [BCDR1 epic](https://github.com/dunay2/dvt/issues/2872)
- [BCDR1.1 decision task](https://github.com/dunay2/dvt/issues/2873)
- [BCDR1.2 backup/PITR implementation](https://github.com/dunay2/dvt/issues/2874)
- [BCDR1.3 writer fencing and reconciliation](https://github.com/dunay2/dvt/issues/2875)
- [BCDR1.4 restore/game-day proof](https://github.com/dunay2/dvt/issues/2876)
- [Gap 5 archive operations runbook](./gap-5-archive-operations-runbook-20260319.md)
- [PostgreSQL 16: pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html)
- [PostgreSQL 16: pg_dumpall](https://www.postgresql.org/docs/16/app-pg-dumpall.html)
- [PostgreSQL 16: pg_basebackup](https://www.postgresql.org/docs/16/app-pgbasebackup.html)
- [PostgreSQL 16: Continuous archiving and PITR](https://www.postgresql.org/docs/16/continuous-archiving.html)
- [PostgreSQL 16: pg_verifybackup](https://www.postgresql.org/docs/16/app-pgverifybackup.html)
