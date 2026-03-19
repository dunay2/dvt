---
title: Gap 4 PR4 Operability And Rollout
status: Proposed
owner: Architecture / API / Delivery / SRE
last_reviewed: 2026-03-19
planning_type: proposal
---

# Gap 4 PR4 Operability And Rollout

## Goal

Make the admission control observable and operable before enabling it broadly.

## Scope

This PR adds:

- observe-mode telemetry contract
- metrics and structured logs
- rollout playbook
- tuning guide
- emergency stuck-event cleanup or quarantine tooling
- chaos and load-test harness definition

## In Scope

- counters, gauges, histograms
- request correlation fields
- threshold tuning documentation
- cleanup runbook and emergency procedure
- staging and production rollout guidance

## Out Of Scope

- projected snapshot table
- dynamic `Retry-After`
- per-tenant dynamic overrides

## File Areas

- `apps/api/src/*observability*`
- runbooks and docs under `docs/runbooks/*`
- tests or scripts for load and chaos scenarios

## Verification Target

- telemetry contract tests
- observe-mode tests
- docs or runbook validation
- `pnpm verify:prepush`

## Checklist

- [ ] observe mode emits same decision telemetry as enforce
- [ ] tenant and system reject metrics exist
- [ ] throughput metrics start being collected
- [ ] stuck backlog metrics and alerts exist
- [ ] rollout guide covers off, observe, enforce
- [ ] tuning guide includes threshold derivation procedure
- [ ] emergency cleanup or quarantine script exists
- [ ] chaos scenarios are enumerated with expected outcomes

## Resolution Table

| Item                   | Status   | Notes                                       |
| ---------------------- | -------- | ------------------------------------------- |
| Observe-mode telemetry | Proposed | Must include hypothetical reject decision   |
| Tuning guide           | Proposed | Based on load evidence, not guesswork       |
| Cleanup tooling        | Proposed | Required for stuck backlog operations       |
| Review readiness       | Proposed | Must be useful even before projection lands |
