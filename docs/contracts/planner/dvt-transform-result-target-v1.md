---
title: DVT Transform Result Target v1
status: Accepted
owner: Contracts / Web / DVT authoring
last_reviewed: 2026-10-15
---

# DVT Transform Result Target v1

## Intent and ownership

[Issue #3115](https://github.com/dunay2/dvt/issues/3115) distinguishes a Transform's
result disposition from an optional Sink publication boundary. The existing
`metadata.config.materialized` remains the sole native disposition setting
(`table`, `view` or `ephemeral`). A durable Transform result also needs an explicit
destination. An ephemeral Transform has no `resultTarget`; a terminal Sink can
own its publication destination instead. Run admission currently supports table
results or one ephemeral result with one explicit table/replace Sink, not views.

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

The Canvas provenance read model examines every upstream lineage branch, using
the existing Source connection authority validator and ConnectionRef equality.
Equal fan-in and diamond paths yield one common connection independently of node
or edge order. Conflicting references, incomplete branches, malformed or missing
Source authority, cycles, missing/duplicate reachable nodes and unsupported
intermediates cannot supply a candidate. An unbound graph supplies none.
Non-lineage edges do not confer connection authority. Traversal is iterative and
performs no provider I/O or draft mutation. A Source is a terminal authority
boundary; incoming lineage on a Source is invalid, including cycles through it.

The same read model supplies the terminal Sink's connection-confirmation candidate
and Transform Inputs/Outputs context. A proven common connection is shown on
every lineage input, never attributed to one arbitrary branch. An unresolved
graph shows no inherited connection. This does not invalidate, rewrite or replace
an explicitly saved result target and is not an execution-admission decision.

In the editable UI draft only, `null` requests explicit removal. An omitted
target leaves an existing target untouched during unrelated semantic edits.
Neither null nor undefined is serialized as a persisted target value.

Saving this reference does not authorize access to its connection and does not
execute SQL. Run admission resolves it within the authenticated
tenant/project/environment, rejects unavailable or unsupported destinations,
and binds the exact target, disposition, graph, semantic and SQL identities.
Preview remains non-destructive and does not mutate the configured target.

## Sequence and boundaries

```text
Explicit target form -> shared target value object -> protected Graph Draft CAS
                                                      |
                        #2524 exact Run workload -> PostgreSQL execution
```

The terminal Transform table path remains valid without a required Sink. The
additional admitted path is an ephemeral Transform connected to exactly one
terminal Sink. The Sink persists an explicitly confirmed `connectionRef`,
`schema`, `table`, `materialization: table` and `writeMode: replace`. Incomplete
Sink drafts remain editable but cannot become a Run. Unsupported saved modes are
not silently rewritten into supported intent.

The common `DvtPostgresRelationTargetV1` owns connection/schema/relation validation;
the versioned Transform target extends it. A Sink target is not mislabeled as a
Transform result. UI destination bindings share connection and name behavior;
passive views do not authorize connections or select publication policy.
Selecting `ephemeral` explicitly removes any Transform target in the same draft
update. Persisting both is invalid, not a second publication route.

Stable-table publication is governed by
[ADR-0066](../../adr/ADR-0066-postgresql-stable-table-publication.md), not by this
authoring value object. Both paths reuse the existing publisher and the
[explicit-intent workload V1](./dvt-operational-workload-v1.md); this contract does
not imply support for view execution or multiple publications.

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
