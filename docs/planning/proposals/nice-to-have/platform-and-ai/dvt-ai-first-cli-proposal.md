---
title: DVT AI-first CLI proposal
status: Draft
owner: docs
last_reviewed: 2026-04-17
planning_type: proposal
---

# DVT AI-first CLI proposal

## Summary

DVT needs one official automation surface for AI agents, CI, and advanced
users. If the only integration paths are UI automation, local scripts, or
unstable internal APIs, the result is fragile: high coupling, weak
observability, and poor security posture.

The recommended answer is **`dvtctl`**: a versioned, non-interactive CLI with
structured output, backed by an internal application-service layer inside DVT.
That CLI becomes the first stable machine-to-machine interface. Additional
transports such as MCP or HTTP can come later on top of the same contract.

## Problem

Without an official CLI, AI usage usually falls into one of these traps:

- brittle UI automation
- ad hoc shell scripting tied to implementation details
- direct use of unsupported internal APIs
- over-broad access with weak auditability

That blocks trustworthy AI integration, or worse, allows it in a form that is
possible but not reliable.

## Recommendation

Build `dvtctl` as the official automation surface and keep the contract ahead
of the transport.

The recommendation has five parts:

1. Create a reusable application-service layer for the business operations that
   DVT wants to expose.
2. Publish `dvtctl` on top of that service layer as the stable operator
   interface.
3. Support JSON output from day one for agents and CI.
4. Include policy, audit, and long-running job semantics in the initial design.
5. Keep MCP or HTTP as optional later adapters on the same contract.

## Why CLI first

### Contract stability

A CLI forces explicit command names, argument shapes, exit codes, and
structured responses. That is a healthier first step than exposing raw shell or
jumping straight to a protocol adapter while the functional contract is still
undefined.

### Transport independence

If the application-service contract is solid, the repo can later add:

- an MCP adapter
- an HTTP adapter
- SDKs

without redesigning the underlying business surface.

### Safer AI posture

An explicit command surface is easier to limit, authorize, audit, and test than
arbitrary shell access.

## Proposed operating model

### Command shape

`dvtctl` should expose a narrow set of top-level command families such as:

- `runs`
- `plans`
- `artifacts`
- `status`
- `jobs`

Each command should be:

- deterministic in shape,
- non-interactive by default,
- JSON-capable,
- explicit about error codes and failure states.

### Response contract

Responses should distinguish:

- successful synchronous results,
- accepted long-running jobs,
- typed user-facing failures,
- infrastructure or policy failures.

### Job model

Long operations should not stream ad hoc text forever. They should return a job
handle or structured status surface that can be polled, inspected, and audited.

## Security and governance requirements

The CLI must not become "shell access with branding." It should ship with:

- explicit capability exposure,
- caller authentication and authorization,
- audit logging,
- idempotency rules where needed,
- bounded mutation semantics,
- stable error envelopes.

## MVP boundary

The initial MVP should include:

- stable read operations,
- a small governed set of write operations,
- JSON output,
- typed exit codes,
- audit and policy hooks.

The MVP should not include:

- arbitrary shell passthrough,
- full internal API exposure,
- transport proliferation before the core contract is stable.

## Evolution path

If `dvtctl` proves correct and useful, the next layers can be added in this
order:

1. expand the application-service contract
2. harden mutation flows and job handling
3. add MCP on top of the same contract if agent orchestration needs it
4. add HTTP or SDK adapters only where they provide real value

## Final recommendation

Stabilize the contract first. Publish `dvtctl` as the official AI-first CLI.
Treat MCP and other transports as downstream adapters, not as the starting
point.
