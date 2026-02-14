# Runbook: Engine Rollback & Restore

Owner: TBD (SRE)
Severity: P1

Goal: Quickly rollback an engine release and validate safe resumption of operations.

Prerequisites:

- Access to Kubernetes cluster and image registry
- Access to StateStore and PITR snapshots
- Known-good image tag

Steps:

1. Decide rollback
   - Gather acceptance: failing critical tests, increased error rates, irrecoverable state

2. Rollback image
   - `kubectl set image deployment/engine-worker engine=engine:<previous-tag> --record`
   - Scale down/scale up strategy: drain new pods first

3. Validate in-flight workflows
   - Check Temporal `getVersion` guards: ensure old code path still supported
   - Run smoke plan (3-step)

4. If schema migration rollback required
   - Use PITR snapshot restore procedure (see DR runbook)
   - Validate outbox replay after restore

5. Post-rollback monitoring
   - Watch `engine_steps_executed_total`, `engine_errors_total`, `eventbus_publish_failures_total`
   - Keep rollback state until stable 30m

Notes:

- Do not delete broken image tags until fully investigated.
- Always create a postmortem for rollbacks affecting >1% of runs.

---

## Post-refactor local cleanup (editor cache vs git reality)

Context:

- After large path refactors (for example, migration to canonical `packages/*` paths), local editor tabs can still show deleted/legacy files.
- This section prevents false conflict reports caused by stale UI state.

### Quick verification checklist

Run from repo root:

1. Working tree status
   - `git status --short`

2. Unresolved merge entries (must be empty)
   - `git ls-files -u`

3. Legacy-path references in tracked files
   - `git grep -n "engine/"`
   - `git grep -n "legacy-path"`

4. Canonical active layout confirmation
   - `git ls-files "packages/*"`

### VS Code stale-tab cleanup

1. Close all tabs pointing to deleted/legacy paths.
2. Run command palette action: `Developer: Reload Window`.
3. Re-open files only from git-tracked canonical paths (`packages/*`, `docs/*`).
4. Re-run the checklist above to confirm no phantom conflicts.

### Exit criteria

- `git status --short` shows only intended changes.
- `git ls-files -u` returns no entries.
- No active editor tabs point to removed legacy paths.
- Team discussion and PR reviews reference canonical paths only.
