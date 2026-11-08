---
id: R-20261108-CANVAS-TRANSFORM-SQL-QUERY
title: SQL inspection must preserve current file authority and row Preview behavior
status: Mitigating
date: 2026-11-08
owners:
  - API
  - Web
  - Contracts
severity: High
probability: Low
---

# Canvas Transform SQL Inspection

## Risk

Showing a native Model's SQL by borrowing an upstream file, compiling an
external-producer signature in the browser, or using a stale authorized result
can misrepresent its current semantics or expose a file without its existing
permission. Duplicating producer preparation can cause SQL inspection and row
Preview to disagree about bindings, connection identity or supported output.
Calling the row probe merely to obtain SQL would add execution to a read-only
inspection action.

These are design risks for [#3765](https://github.com/dunay2/dvt/issues/3765),
not newly accepted debt. The new intent is `ProjectCanvasTransformSql`; existing
file-content, row Preview, compilation and artifact-publication rails retain
their distinct responsibilities.

## Controls

- Resolve the protected draft, instance references, expected canonical digest,
  file producers, terminal closure and PostgreSQL AST through one shared
  preparation owner. SQL inspection returns a read model; row Preview alone
  adds its existing probe and credentials boundary.
- Require existing graph-view permission and, for file producers, file-view
  permission before analyzer access. Reject malformed scope/digest, stale
  revision, unavailable producer, mismatched field/connection contracts and
  unsupported SQL without returning partial SQL.
- Preserve typed denied outcomes. The additive SQL route returns bounded 403;
  the existing row route preserves its prior 422 wire behavior. No permission,
  grant, semantic guard or PostgreSQL support rule is relaxed.
- Validate the strict V1 response, exact target identity and digest in the Web
  adapter. Retained UI state does not authorize a query. Changed transform/graph
  references or scoped query bindings invalidate visible SQL; late completions
  cannot replace a newer input. SQL remains the authorized snapshot of its last
  request. File updates and permission revocations have no independent push
  subscription into this view; explicit reselect revalidates those conditions.
- Keep passive canonical JSON inspection independent of the SQL query provider.
  Reuse existing native analyzer caching only within its existing verified
  scope/revision rules. Do not add a compiled boolean or promise cache survival
  across API process replacement.
- Register the SQL operation in the existing closed operability vocabulary so
  a rejected response is recorded. No technical error detail or secret is
  needed in the user-facing failure.
- Deploy the additive API route and its strict Web consumer together. A client
  without a query provider fails closed for SQL and retains canonical JSON.
  The request never accepts client SQL or a replacement semantic document.
- Record actual owner definitions, cohesive schema/HTTP leaves and real source
  associations through existing native operators. Preserve parent coverage
  classifications. Associate the Zod schema through its real file-level
  contract instead of a fabricated function binding.
- Re-read all native target revisions and row/binding hashes before sequential
  application. Use canonical planners/writers, transactional CAS, idempotency
  and durable receipts; preserve unrelated metadata and documentary columns.
  No Planning DB import or rebuild repairs the candidate.

## Evidence And Residual Limits

[ED-20261108-canvas-transform-sql-query](../evidence/ED-20261108-canvas-transform-sql-query.md)
records 1,040 contracts tests, 61 focused API tests, package/type/lint checks,
schema and contract-golden results, the meaningful denied-authority RED and a
real protected HTTP 200 for the user's physical-source/file-model JOIN. That
functional request is not a browser-acceptance or performance claim.

The existing golden retry scenario remains skipped and two deprecated paths
retain their baselines; no new skip was introduced. API unit tests and the
actual SQL GET do not establish full operational execution or materialization.
Upstream provider readiness and existing file-model compilation constraints
remain in force.

Final controlled/LIVE browser acceptance, native metadata application and
exact-head acceptance, governance refresh, required CI and prepush are pending
at creation of this record. The risk remains mitigating until those outcomes
are recorded on the governing issue. This entry does not authorize rollout,
data cleanup, new Docker resources or a bypass of a failed gate.
