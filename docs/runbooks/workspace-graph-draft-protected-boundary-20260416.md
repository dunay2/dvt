---
title: Workspace Graph-Draft Protected Boundary Runbook
status: Active
owner: API / Runtime / SRE
last_reviewed: 2026-04-16
---

# Workspace Graph-Draft Protected Boundary Runbook

Operational baseline for the protected `workspace graph-draft` read/write path
owned by `apps/api`.

## Purpose

Use this runbook when callers cannot read or save editable Canvas graph drafts
through the governed backend boundary.

This boundary owns:

- `GET /workspace/graph/draft`
- `PUT /workspace/graph/draft`
- tenant, project, and environment scope validation
- writable vs `read_only` vs `forbidden` capability posture
- compare-and-swap revision enforcement
- idempotent retry handling for the same logical save
- typed format failure handling for unsupported or corrupt persisted drafts
- audit and observability join keys through `correlationId` and `decisionId`

This boundary does not own:

- Canvas UI fallback behavior
- browser-local persistence
- snapshot read-only hydration for the non-draft graph
- background backfill or schema migration beyond the current active writer line

## Current schema posture

- Active writer version: `workspace-graph-draft.v1`
- Compatibility window: none beyond the active writer in this slice
- Read migration posture: `native` only
- Write-back or backfill posture: none required yet because no governed legacy
  readable versions exist today

Operator rule:

- a persisted draft with any schema version other than
  `workspace-graph-draft.v1` must fail closed as unsupported
- the route must not synthesize an empty graph from unsupported or corrupt
  storage

## Persistence path

The protected boundary stores draft state in PostgreSQL tables owned by
`apps/api`:

- `workspace_graph_drafts`
- `workspace_graph_draft_idempotency`

The record key is the workspace scope:

- `tenant_id`
- `project_id`
- `environment_id`

## Caller-visible behavior

### Read path

`GET /workspace/graph/draft?tenantId=<...>&projectId=<...>&environmentId=<...>`

Expected outcomes:

- `200` with typed `ok` response when a persisted draft exists and is readable
- `401` or `403` with typed `denied` response when the caller is not authorized
- `404` `workspace_graph_draft_not_found` when the workspace has no saved draft
- `422` with typed `format_error` response when the stored payload is corrupt or
  the stored schema version is unsupported

Important rule:

- `404` before the first save is expected and is not an empty-graph fallback

### Write path

`PUT /workspace/graph/draft`

Expected outcomes:

- `200` with typed `saved` response and the new authoritative `revision`
- `401` or `403` with typed `denied` response when the caller is not writable
- `409` with typed `conflict` response when `expectedRevision` is stale
- `409` `workspace_graph_draft_idempotency_key_reused` when the same
  `idempotencyKey` is reused for a different payload
- `422` `workspace_graph_draft_unsupported_schema_version` when the request
  attempts to write a non-active schema version

First-save rule:

- callers create the first draft with `expectedRevision: "initial"`

## Read-your-writes baseline

The protected boundary uses the same authoritative store for both reads and
writes.

Caller expectation:

1. a successful `PUT` returns the authoritative `revision`
2. the next `GET` for the same scope must return that revision unless the draft
   was superseded by a later successful write
3. stale writes fail closed with a typed `conflict` outcome instead of
   overwriting persisted truth

## Audit and observability

Every protected decision/write path must preserve:

- `correlationId`
- `decisionId`
- action: `draft_read` or `draft_write`
- caller-visible outcome

Trace spans:

- `api.workspace_graph_draft.read`
- `api.workspace_graph_draft.write`

Metrics:

- `dvt.api.workspace_graph_draft.read_total`
- `dvt.api.workspace_graph_draft.read_latency_ms`
- `dvt.api.workspace_graph_draft.write_total`
- `dvt.api.workspace_graph_draft.write_latency_ms`

Operator rule:

- use `correlationId` and `decisionId` as the join keys across logs, traces,
  and caller-visible error details

## First triage checks

1. Confirm the caller used the intended `tenantId`, `projectId`, and
   `environmentId`.
2. Check whether the failure is `denied`, `not_found`, `conflict`,
   `format_error`, or `idempotency_key_reused`.
3. Use `correlationId` and `decisionId` from the response or logs to find the
   matching protected decision.
4. Verify whether the caller is `writable`, `read_only`, or `forbidden`.
5. If a save failed, compare the caller `expectedRevision` with the current
   authoritative revision.

## Common recovery paths

### `workspace_graph_draft_not_found`

Meaning:

- the workspace has never saved a draft, or the record is absent

Recovery:

1. confirm this is the intended workspace scope
2. if this is the first save path, write with `expectedRevision: "initial"`
3. do not inject an empty graph into storage as an operational workaround

### `conflict`

Meaning:

- another successful write already advanced the authoritative revision

Recovery:

1. read the current draft again
2. reapply the intended user change against the latest revision
3. retry the save with the new `expectedRevision`

### `workspace_graph_draft_idempotency_key_reused`

Meaning:

- the caller reused one `idempotencyKey` for a different logical save payload

Recovery:

1. generate a fresh idempotency key for the new logical save attempt
2. reuse an existing idempotency key only for a true retry of the same payload

### `format_error` or `workspace_graph_draft_unsupported_schema_version`

Meaning:

- the stored record or caller payload is outside the governed active schema
  line

Recovery:

1. capture the workspace scope plus `correlationId` and `decisionId`
2. inspect the stored `schemaVersion`
3. do not mutate the record by hand unless a governed repair step has been
   approved
4. escalate as a protected-boundary defect if the record should already be on
   `workspace-graph-draft.v1`

## Current limits

- legacy readable schema migration is not active in this slice
- automatic merge of concurrent edits is not supported; v1 is reject-on-stale
- the route returns `404` for absent drafts rather than materializing an empty
  draft record
