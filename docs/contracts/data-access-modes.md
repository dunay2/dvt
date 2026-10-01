---
title: LIVE and LOCAL data access boundary
status: Active
owner: Contracts / Local Data / Preview
last_reviewed: 2026-10-01
---

# LIVE and LOCAL data access boundary

This contract implements the first, contract-only cut of [DAM1 #3510](https://github.com/dunay2/dvt/issues/3510) and [#3511](https://github.com/dunay2/dvt/issues/3511). It does not enable a LOCAL runtime or change an existing Preview/Run endpoint by itself.

## Authority and vocabulary

```text
physical Dataset --explicit acquisition--> Working Data (sample or full)
Working Data generation --bounded read--> Preview window
physical Dataset --bounded source query--> LIVE Preview window
```

LIVE reads the authorized remote source. LOCAL reads one authorized, stable READY generation of workspace working data. There is no AUTO/HYBRID placement or silent fallback. Preview is a bounded, transient read model, not the Dataset or an acquisition result. Full working data is labelled `full`, never `sample`.

PostgreSQL remains the transactional/control-plane authority; the workspace DuckDB plane planned by [LDC1 #3388](https://github.com/dunay2/dvt/issues/3388) owns local working rows, not graph state. Substrait plus the DVT identity sidecar remain semantic authority under ADR-0064. The existing protected Preview/Run rails own authentication, scope, provider projection, execution and response publication. A client-supplied dataset or generation identifier is a lookup request, never proof of permission, READY status or current source data.

## Shared selection and result facts

`DataAccessSelection` is a strict discriminated value object:

| Mode    | Selection                              | Admission invariant                                                                                                                                             |
| ------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `live`  | Mode only                              | The existing rail resolves source identity and reads the remote provider; no local generation may be supplied.                                                  |
| `local` | Mode, `localDatasetId`, `generationId` | The protected rail authorizes the scope and resolves exactly that generation as READY before calculation. No latest-generation substitution or remote fallback. |

The contract also distinguishes the facts returned to a consumer:

- LIVE provenance names the source binding, query timestamp, bounded limit and pagination guarantee. It does **not** claim a local capture or arbitrary deep paging.
- LOCAL provenance names the dataset/generation, `capturedAt`, working-data coverage (`sample` or `full`) and bounded limit. It does **not** claim remote freshness from a TTL or from the time of the preview request.
- A provisional SEED/BUILDING observation has its own state and cannot be used as a normal LOCAL calculation selection. If a previous READY generation exists, it remains the selected stable generation during refresh; otherwise the calculation is unavailable.

Source observation, capture, refresh, query and serve times are distinct. A later preview of the same generation does not mint a new `capturedAt` or imply source currency. Detailed sampling method, requested/actual sizes and connector freshness evidence belong to #3396/#3397 and cannot be fabricated by this base contract.

## State and failure boundary

The state vocabulary is `absent`, `seed`, `building`, `ready`, `failed` and `cancelled`. `seed` and `building` are provisional and must carry a capture identity. `ready` carries both the completing capture and its new generation identity. `failed` and `cancelled` may retain the last READY generation, but cannot promote the attempted one. Unknown states, incompatible mode fields, malformed identities/timestamps and a provisional generation offered as a stable selection fail validation.

The shared transition guard admits a new attempt from `absent`, a same-attempt `seed -> building -> ready` progression (or a small `seed -> ready`), and a refresh/retry with a new capture identity. Refresh and failure/cancellation preserve the previous READY generation identity. It rejects direct `absent -> ready`, switching capture halfway through an attempt, dropping the previous READY identity, and resuming a failed attempt as if it were still active. Delete is a separate authorized lifecycle command, not an acquisition transition.

This contract validates shapes and selection invariants. The acquisition state machine, atomic promotion and cancellation behavior are implemented under #3514 and LDC1 #3393; this document does not claim they are already running.

## Existing rails and later wiring

`PreviewWarehouseSourceObjectRows`, `PreviewCanvasTransformRows`, `PreviewPlan` and Run remain the product intents. DAM1 wiring will carry the explicit mode and generation through those rails where applicable, without a second semantic IR, a browser SQL surface or a raw DuckDB handle. #3512 owns visible selection/state, #3515 LOCAL preview, #3516 LIVE preview, and #3518 provider/browser proof. Existing preview DTOs remain bounded display contracts until those tasks connect this context end-to-end.

The negative proof for this contract rejects AUTO/HYBRID, a LIVE request with LOCAL identifiers, LOCAL without both identifiers, provisional calculation, a fake full copy without complete coverage, and any attempt to pass SQL, credentials or filesystem paths as mode context.
