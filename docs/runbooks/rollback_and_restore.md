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
