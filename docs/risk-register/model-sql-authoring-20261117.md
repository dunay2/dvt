---
title: Model SQL source and Apply admission
status: Mitigated
date: 2026-11-17
owners:
  - API
  - Web
  - Adapters
severity: High
probability: Low
---

# Model SQL source and Apply admission

For [#3944](https://github.com/dunay2/dvt/issues/3944), SQL source could otherwise
invent canonical meaning, escape the connected-input namespace, expose a
withdrawn field or overwrite a newer Model. Controls are part of the design;
this record does not accept new debt.

- Use the existing PostgreSQL parser and a closed AST-to-pinned-Substrait
  adapter, with bounded syntax, relations, fields and nesting. Reject an entire
  unsupported statement, native type or coercion. No regex compiler, private
  relational IR, SQL execution fallback or fake nullable/type facts.
- Reauthorize the exact workspace and source/file metadata before I/O. Bind
  proposals to saved revision, semantic identity, complete input facts and
  provenance. Metadata completion matches the exact Source object and locator,
  rather than selecting a similarly named warehouse object.
- Preserve existing Read identities only against exact current authority.
  Preserve output IDs only for unique direct canonical values with matching
  type/nullability. Repeated occurrences receive fresh opaque IDs. The existing
  output dependency policy rejects destructive publication changes.
- Project authorized source fields before filtering, joining or sorting.
  Logical seeds omit unpublished targets without renumbering canonical slots;
  unavailable row dependencies reject the seed. Never add NULL fillers.
- Recompile SQL-draft previews server-side and execute only canonical rendered
  SQL through the existing bounded read-only probe. Preserve strict saved-Model
  GET behavior. SQL stays in the POST body. Provenance names only consumed
  canonical sources and file producers, including transitive producers.
- Separate query cancellation from Apply acknowledgement. Lock the admitted
  buffer during Apply, preserve the existing command's cancellation/session CAS,
  and retain its result when its own revision changes. Visual dirty-state
  conflicts and the common navigation decision protect both editors.
  The workspace synchronously makes the visual surface read-only/inert during
  pending SQL Apply; cancellation releases it only after actual settlement.
  Namespace invalidation includes name and instance-reference changes as well
  as plugin, kind, role, path and metadata.
- Use one data owner and mark retained results stale after context/text changes.
  API identity checks reject mismatched receipts. Late results cannot replace
  newer text, scope or revision.

Native differential tests cover rows, native types, order, duplicates and NULLs;
application/probe proof asserts no graph writes. Browser proof covers real input,
keyboard execution, navigation, explicit generation and durable reload. Deploy
the additive API and Web consumer together: an older API yields an unavailable
query, not a client-side compiler or direct SQL fallback.

The initial source profile deliberately excludes CTEs, grouping, sets, windows,
functions, casts, correlated subqueries and other unproven meanings. A metadata
snapshot proves admission at request time, not future warehouse stability.
See the [ARC evidence](../evidence/ED-20261117-model-sql-authoring.md) and governing
issue for exact candidate validation and integration results.
