---
title: Engine adapter circuit breaker user stories
status: Active
owner: Architecture / Engine / Runtime Safety
last_reviewed: 2026-05-12
---

# Engine Adapter Circuit Breaker User Stories

## Stories

| ID             | Persona                | Goal                                                  | Acceptance                                                                                                                 |
| -------------- | ---------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `US-AR-C5-001` | Runtime operator       | Avoid timeout pileups during adapter outages          | After repeated protected adapter failures, the breaker opens and later calls fail fast without invoking the adapter.       |
| `US-AR-C5-002` | Engine maintainer      | Keep provider outage policy in one semantic component | Start, cancel, signal, and enrichment calls go through `CircuitBreakingProviderAdapter`, not per-service breaker branches. |
| `US-AR-C5-003` | Runtime operator       | See breaker posture in health output                  | `IRunHealthService.healthCheck()` reports `closed`, `open`, or `half_open` posture for adapter components.                 |
| `US-AR-C5-004` | Observability consumer | Track breaker transitions                             | The breaker emits state gauges and fail-fast counters with provider and operation labels.                                  |
| `US-AR-C5-005` | Engine maintainer      | Recover without restart after a transient outage      | After the retry window elapses, a half-open successful probe closes the breaker.                                           |
| `US-AR-C5-006` | Architecture reviewer  | Prevent timeout-only regression                       | A semantic architecture guard validates the component guide, production composition, and health posture.                   |

## Negative Scenarios

| Scenario                         | Expected result                                                                             | Test                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Open breaker receives `startRun` | Throws `AdapterCircuitOpenError` and does not call delegate `startRun`.                     | `CircuitBreakingProviderAdapter.test.ts` |
| Half-open probe fails            | Breaker returns to open and renews retry timing.                                            | `CircuitBreakingProviderAdapter.test.ts` |
| Adapter metadata is read         | `capabilities`, `estimateRunRef`, and `signalSemanticsVersions` do not alter breaker state. | `CircuitBreakingProviderAdapter.test.ts` |
| Health reads an open breaker     | Component status includes breaker posture and remains explicit about adapter liveness.      | `CircuitBreakingProviderAdapter.test.ts` |

## Scenario Coverage Matrix

| Story          | Unit test | Architecture guard | Documentation   |
| -------------- | --------- | ------------------ | --------------- |
| `US-AR-C5-001` | yes       | yes                | component guide |
| `US-AR-C5-002` | yes       | yes                | component guide |
| `US-AR-C5-003` | yes       | yes                | component guide |
| `US-AR-C5-004` | yes       | yes                | component guide |
| `US-AR-C5-005` | yes       | yes                | component guide |
| `US-AR-C5-006` | N/A       | yes                | plan and guide  |
