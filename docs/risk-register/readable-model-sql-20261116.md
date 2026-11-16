---
id: R-20261116-READABLE-MODEL-SQL
title: SQL presentation must use complete authorized native evidence
status: Mitigating
date: 2026-11-16
owners:
  - API
  - Web
  - Adapters
severity: High
probability: Low
---

# Readable SQL inspection

For [#3786](https://github.com/dunay2/dvt/issues/3786), incomplete names, guessed
scalar meaning or hidden view behavior could turn an unsafe candidate into
apparently readable SQL. A stale UI result could also claim a different relation
or current permission. These are controlled design risks, not accepted debt.

Controls:

- Reuse the existing protected SQL query and whole-candidate simplifier. Preserve
  original bytes and canonical provenance; never change execution or publication.
- Check the existing metadata permission and exact scoped connection before
  credential access. Reject browser-provided SQL, columns and resolution facts.
- Observe complete names and a validated scalar subset in a bounded read-only
  native snapshot. Reject unsupported actual references before pruning; an
  unrelated field cannot remove known names from ambiguity checks.
- Certify native comparison, conversion and primitive I/O meaning on the original
  effective path. A provider-name flag or successful EXPLAIN alone is insufficient.
- Require exact database qualification. Admit entire opaque view definitions
  through the same profile, retaining cycles, unknown dependencies, security
  options, RLS, FDW and uncertified inheritance. Do not inline view definitions.
- Preflight original SQL only after complete admission. Bounds and unsupported
  shapes return a typed retained result; no partial rewrite is published.
- Verify target, digest, relation and requested response mode in the Web adapter.
  Invalidate pending results on binding, graph, relation or visibility changes.
  Local variant selection performs no query or mutation.
- Preserve the native differential matrix and prove the actual composed consumer.
  Isolate negative-test DDL and dispose every proof database. Browser evidence
  must cover explicit generation and local original/derived selection.

The native snapshot is inspection evidence at request time. It does not promise
future warehouse DDL stability, authorization subscription or faster physical
execution. Deploy the additive API and its readable consumer together; an old
server rejects the explicit new option rather than inventing a fallback.

See the [ARC evidence](../evidence/ED-20261116-readable-model-sql.md) and governing
issue/PR for exact candidate validation and integration evidence.
