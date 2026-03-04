---
title: Guide — Adapter Semantics (Temporal/Conductor and others)
status: Guide
tags: [adapters, temporal, conductor, capabilities, semantics]
---

# Adapter Semantics (Temporal/Conductor and others)

Adapters impose real constraints on execution semantics. DVT+ must not assume features that a target adapter cannot provide.

Use when changes affect:

- engine execution semantics
- retries/timeouts/compensation
- capability negotiation
- adapter contracts

## 1) Capability negotiation

- Planner outputs required capabilities in the plan
- Engine selects an adapter that satisfies them or fails fast
- Adapter capability schemas must be versioned

## 2) Semantics mapping

For each adapter define:

- retry behavior (who decides? plan vs adapter defaults)
- timer semantics
- cancellation semantics
- concurrency limits
- compensation patterns

## 3) Verification

- capability contract tests (adapter claims vs required)
- integration smoke tests per adapter
- deterministic behavior under retries/cancel (where possible)

References:

- Temporal: https://temporal.io/
- Netflix Conductor: https://netflix.github.io/conductor/
