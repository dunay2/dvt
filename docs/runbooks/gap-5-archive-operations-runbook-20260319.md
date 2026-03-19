---
title: Gap 5 Archive Operations Runbook
status: Review
owner: Architecture / Operations
last_reviewed: 2026-03-19
---

# Gap 5 Archive Operations Runbook

## Purpose

Operational procedure for archive export, verification failure, restore, and
delete-after-grace workflows.

## Preconditions

- archive catalog available
- lifecycle leadership working
- metrics available
- admin authorization in place for restore and override actions

## Routine Checks

Daily checks:

1. no backlog growth in `ELIGIBLE`
2. no stale `EXPORTED` units beyond verification SLA
3. no unexpected `VERIFY_FAILED` growth
4. delete-eligible units progressing after grace expiry
5. delivery-buffer retained rows within expected envelope

## Procedure: Verification Failure

1. Identify the `archiveUnitKey`.
2. Confirm object presence and manifest presence.
3. Compare manifest row count and checksum against catalog state.
4. Retry verification if failure cause is transient.
5. Re-export only if manifest or object is invalid.
6. Do not allow deletion while unit remains `VERIFY_FAILED`.

## Procedure: Restore One Run

1. Confirm operator authorization and reason.
2. Resolve archive location from catalog.
3. Restore to temporary target by default.
4. Validate restored row count and sequence continuity.
5. Hand over temporary target to investigator.

## Procedure: Restore One Archive Unit

1. Confirm operator authorization.
2. Restore archive unit to temporary schema.
3. Validate manifest, row count, and `run_seq` continuity.
4. Use hot rehydrate only if explicitly approved.

## Procedure: Delete After Grace

1. Confirm archive unit state is `VERIFIED`.
2. Confirm grace window elapsed.
3. Re-check leadership before destructive action.
4. Drop hot archive unit.
5. Record `DROPPED_FROM_HOT` in catalog.

## Stop Conditions

Pause lifecycle processing if:

- verification failure rate spikes
- object storage access is degraded
- leadership ownership flaps
- restore operations saturate system capacity

## Related Documents

- [Gap 5 Operator Guide](../guides/gap-5-operator-guide-20260319.md)
- [Gap 5 Event Lifecycle And Archival Design](../planning/proposals/gap-5-event-lifecycle-and-archival-design-20260319.md)
