---
title: DVT Transform Result Target v1
status: Accepted
owner: Contracts / Web / DVT authoring
last_reviewed: 2026-09-14
---

# DVT Transform Result Target v1

## Intent and ownership

[Issue #3115](https://github.com/dunay2/dvt/issues/3115) distinguishes a Transform's
result disposition from an optional Sink publication boundary. The existing
`metadata.config.materialized` remains the sole native disposition setting
(`table` or `view` today). A durable Transform result also needs an explicit
destination, which the current authoring contract does not provide.

`ConfigureCanvasDvtNode` owns this authoring intent. Protected Graph Draft
save/read and compare-and-swap remain unchanged. This is not a new execution,
publication or connection-authorization command.

## Value object and persistence

The optional `metadata.config.resultTarget` on a native DVT Transform is:

```text
schemaVersion: dvt-transform-result-target.v1
connectionRef: existing ConnectionRef v1, provider postgres
schema: existing PostgreSQL identifier policy
relation: existing PostgreSQL identifier policy
```

The object is strict: missing members, null, blank/invalid identifiers,
unsupported providers, credentials and unknown members reject. Existing drafts
without a target remain valid and unchanged. No target is derived from a node
label, a Source, a default schema or a downstream Sink. Native Transform kind
spellings already admitted by the authoring contract use the same validation.

The first authoring surface lets the user explicitly confirm the already-bound
input connection and enter schema and relation. This is an explicit copy of a
governed reference, not an inherited runtime default. Changing graph bindings
does not silently rewrite a saved target. With no unambiguous PostgreSQL input
binding, the surface cannot offer that confirmation.

In the editable UI draft only, `null` requests explicit removal. An omitted
target leaves an existing target untouched during unrelated semantic edits.
Neither null nor undefined is serialized as a persisted target value.

Saving this reference does not authorize access to its connection and does not
execute SQL. Future Run admission must resolve it within the authenticated
tenant/project/environment, reject unavailable or unsupported destinations,
and bind the exact target, disposition, graph, semantic and SQL identities.
Preview remains non-destructive and does not mutate the configured target.

## Sequence and boundaries

```text
Explicit target form -> shared target value object -> protected Graph Draft CAS
                                                      |
                        future #2524 exact Run workload -> #2723 execution
```

The first provider-effects vertical remains a terminal Transform with a table
result and no required Sink. Stable-table publication is governed by
[ADR-0066](../../adr/ADR-0066-postgresql-stable-table-publication.md), not by this
authoring value object. This contract does not add a worker capability, imply
support for view execution, or reinterpret the Preview-only workload v1.

## Compatibility and proof

This adds an optional reserved metadata member; absent targets preserve existing
drafts, semantic expressions, Source binding, Sink configuration and Preview.
The existing connection and identifier contracts are reused without copied
validation rules. Field-policy extraction changes ownership of code, not public
behavior. Planner's public execution/input contracts are unchanged.

Required proof: strict value-object rejection; protected graph and node-command
validation; metadata round-trip; no silent target or disposition fallback;
explicit UI confirmation and save/reload; semantic and Source-sampling regression;
package tests, lint/typecheck, ARC-2 evidence/risk and `pnpm verify:prepush`.
Configuring a target alone must not be reported as successful Run execution.
