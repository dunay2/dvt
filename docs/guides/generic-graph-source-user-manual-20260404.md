---
title: GenericGraphSource User Manual
status: Draft
owner: Planning Domain / API / Docs
last_reviewed: 2026-04-04
---

# GenericGraphSource User Manual

## Audience

This guide is for integrators, platform engineers, and API callers who need to
prepare planning inputs without treating dbt manifest format as the only way to
describe a workflow DAG.

## What GenericGraphSource is

`GenericGraphSource` is the target planner-facing model for a normalized
workflow graph.

It answers one question only:

> What nodes exist, what depends on what, and what step kind does each node
> represent?

It is not a runtime worker contract, not a provider adapter contract, and not a
secret payload container.

## What path to use

### Current supported inputs (today)

Use one of these paths today:

| Path                 | Use when                                                   | Notes                                              |
| -------------------- | ---------------------------------------------------------- | -------------------------------------------------- |
| `manifestRef`        | you already store dbt manifest artifacts immutably         | current production path for dbt                    |
| inline `graphSource` | you already have a normalized graph in memory              | current typed inline path (`PlannerGraphSourceV1`) |
| inline `manifest`    | legacy caller still sends raw dbt manifest payload         | compatibility path                                 |
| inline `nodes`       | legacy caller already sends pre-normalized dbt-style nodes | compatibility path                                 |

Do not send more than one active source in the same planner request.

### Target inputs (MW-A2 target, not shipped yet)

These inputs are target-state, not current runtime behavior:

| Path                                                   | Use when                                     | Notes                                                  |
| ------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------ |
| inline `graphSource` with `GenericGraphSourceV1` shape | caller has a non-dbt normalized DAG          | target canonical non-dbt path                          |
| `graphSourceRef`                                       | source graph is stored immutably out of band | target ref-based path planned after contract evolution |

## Mental model

```mermaid
flowchart LR
  Source["dbt manifest or external DAG"] --> Graph["GenericGraphSource"]
  Graph --> Planner["@dvt/planner"]
  Planner --> Plan["ExecutionPlan"]
  Plan --> Runtime["Engine and adapters"]
```

The graph source describes planning intent. Execution still depends on runtime
support for the step kinds used by that graph.

## Authoring checklist

1. Give every node a stable `nodeId`.
2. Declare every dependency explicitly in `dependsOn`.
3. Use a real `stepKind` for each node.
4. Keep `stepTypeConfig` focused on step configuration, not secrets.
5. Keep runtime-only worker details out of the graph source.
6. Treat array order as cosmetic. The planner decides deterministic order.

## Target shape

The target authoring model is:

```json
{
  "kind": "generic-graph-v1",
  "sourceFamily": "custom-api",
  "sourceVersion": "1.0",
  "nodes": [
    {
      "nodeId": "extract.iot-readings",
      "stepKind": "API_CALL",
      "dependsOn": [],
      "stepTypeConfig": {
        "operationRef": "artifacts://operations/iot-readings.json"
      }
    },
    {
      "nodeId": "warehouse.refresh-proc",
      "stepKind": "DB_PROC_EXEC",
      "dependsOn": ["extract.iot-readings"],
      "stepTypeConfig": {
        "procedureRef": "artifacts://sql/refresh_proc.sql"
      }
    }
  ]
}
```

## Example 1: dbt path

If your source of truth is still dbt, keep using the dbt path. The system will
normalize that manifest into the canonical graph shape internally.

```json
{
  "manifestRef": {
    "uri": "s3://planner/manifests/project-a/manifest.json",
    "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  },
  "selection": {
    "selectedNodeIds": ["model.analytics.orders"],
    "includeUpstream": true
  }
}
```

## Example 2: mixed plan target

Mixed plans are valid at the model layer.

```json
{
  "graphSource": {
    "kind": "generic-graph-v1",
    "sourceFamily": "integration-suite",
    "sourceVersion": "1.0",
    "nodes": [
      {
        "nodeId": "dbt.model.orders",
        "stepKind": "DBT_MODEL",
        "dependsOn": [],
        "stepTypeConfig": {
          "uniqueId": "model.analytics.orders"
        }
      },
      {
        "nodeId": "notify.billing",
        "stepKind": "EMAIL_SEND",
        "dependsOn": ["dbt.model.orders"],
        "stepTypeConfig": {
          "templateRef": "artifacts://mail/orders-ready.json"
        }
      }
    ]
  },
  "selection": {
    "selectedNodeIds": ["notify.billing"],
    "includeUpstream": true
  }
}
```

Important: this example describes the target planner contract. Runtime
execution for non-dbt kinds still depends on later registry and dispatcher
work.

## What the planner validates

### Current boundary behavior

The planner boundary currently rejects:

- requests with no active source
- requests with more than one active source
- malformed `manifestRef`
- malformed `graphSource` payloads (`PlannerGraphSourceV1`)

Graph-level checks such as duplicate ids, missing dependencies, and cycle
validation happen after source normalization in the planner pipeline.

### Target boundary behavior (MW-A2)

After `MW-A2-B/C/D`, the boundary should also reject:

- malformed `graphSourceRef`
- generic graph sources with duplicate node ids
- generic graph sources with missing dependency targets
- generic graph sources with cycles
- generic nodes that cannot be translated into planner steps

## What the planner does not promise

The planner does not promise:

- runtime executability for every documented step kind
- provider-specific retry or timeout behavior
- secret distribution through `stepTypeConfig`
- worker routing decisions

Those concerns belong to later slices and other bounded contexts.

## Common failures

### `more than one active source`

You sent more than one of `manifestRef`, inline `graphSource`, raw `manifest`,
or `nodes`.

### `missing dependency target`

A node depends on another node id that is not present in the same graph.

### `unsupported step kind`

The graph describes a step kind that the planner or runtime has not registered
yet.

### `invalid step config`

The graph uses a known `stepKind`, but `stepTypeConfig` does not match that
kind's schema.

### `graph source integrity mismatch`

Target-state (`graphSourceRef`) error.

The bytes resolved from a ref do not match the declared hash.

## Determinism rules for authors

To keep plan identity stable:

1. keep `nodeId` stable across equivalent graphs
2. declare the same dependencies for the same logical workflow
3. do not rely on node array order
4. keep provenance metadata outside the canonical plan core unless the contract
   explicitly says otherwise

## Contributor validation

If you are changing this boundary, use at least:

```bash
pnpm --filter @dvt/contracts test
pnpm --filter @dvt/planner test
pnpm --filter dvt-api test
pnpm verify:prepush
```

## Related documents

- `docs/guides/generic-graph-source-technical-manual-20260404.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/mw-a2-generic-graph-source-plan-20260404.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/dvt-dbt-agnostic-generalization-plan-20260403.md`
