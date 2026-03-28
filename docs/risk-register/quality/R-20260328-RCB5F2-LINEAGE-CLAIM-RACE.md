---
id: R-20260328-RCB5F2-LINEAGE-CLAIM-RACE
title: Lineage stale-claimer concurrency remains timestamp-fenced without lease tokens
status: Open
date: 2026-03-28
owners:
  - '@dvt/adapter-postgres'
severity: Medium
probability: Low
---

## Context

`RC-B5-F2` adds real-DB tests for lineage claim-timeout and stale-claimer interactions.  
Current write fencing uses claim timestamp windows (`claimed_at` + timeout) and does not include a separate lease token.

## Risk

Timestamp-window fencing is sensitive to timing edges under highly concurrent workers.  
Coverage is improved by integration tests, but lease-token ownership is still not modeled for lineage claim acknowledgements.

## Mitigation

1. Keep claim-timeout and stale-claimer integration tests in the adapter suite.
2. Monitor lineage dead-letter and retry metrics for regressions in production.
3. Consider tokenized claim ownership for lineage paths in a future hardening slice if timing-edge incidents appear.
