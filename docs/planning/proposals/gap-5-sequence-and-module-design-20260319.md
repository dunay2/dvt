---
title: Gap 5 Sequence And Module Design
status: Review
owner: Architecture
last_reviewed: 2026-03-19
planning_type: proposal
---

# Gap 5 Sequence And Module Design

## Purpose

Capture the dynamic flows and module boundaries for Gap 5 in a way that is
reviewable independently from the main proposal.

## Module Boundary View

```mermaid
flowchart LR
    subgraph StateContext["State Context"]
        ArchiveCoord["RunLifecycleCoordinator"]
        RestoreCoord["RunRestoreCoordinator"]
        BufferRetention["BufferRetentionService"]
    end

    Policy["IRunLifecyclePolicy"]
    ArchiveStore["IRunArchiveStore"]
    Exporter["IRunArchiveExporter"]
    RestorePort["IRunRestoreService"]

    ArchiveCoord --> Policy
    ArchiveCoord --> ArchiveStore
    ArchiveCoord --> Exporter
    RestoreCoord --> ArchiveStore
    RestoreCoord --> RestorePort
    BufferRetention --> Policy
    BufferRetention --> ArchiveStore
```

## Export Sequence

```mermaid
sequenceDiagram
    participant Scheduler
    participant Coord as RunLifecycleCoordinator
    participant Policy as IRunLifecyclePolicy
    participant Store as IRunArchiveStore
    participant Exporter as IRunArchiveExporter

    Scheduler->>Coord: archiveEligibleHotData()
    Coord->>Policy: resolveRunEventPolicy(tenantId)
    Coord->>Store: listEligibleArchiveUnits(policy)
    Coord->>Exporter: exportArchiveUnit(batch)
    Coord->>Store: markArchiveBatchVerified(batch)
    Coord->>Store: markDeleteEligible(archiveUnitKey, deleteAfter)
```

## Restore Sequence

```mermaid
sequenceDiagram
    participant Admin
    participant Restore as RunRestoreCoordinator
    participant Catalog as IRunArchiveStore
    participant Port as IRunRestoreService

    Admin->>Restore: restoreRun(runId)
    Restore->>Catalog: resolveArchiveLocation(runId)
    Restore->>Port: restoreRun(runId, temp_schema)
```

## Delivery Buffer Cleanup Sequence

```mermaid
sequenceDiagram
    participant Scheduler
    participant Buffer as BufferRetentionService
    participant Policy as IRunLifecyclePolicy
    participant Store as IRunArchiveStore

    Scheduler->>Buffer: purgeDeliveryBuffers()
    Buffer->>Policy: resolveOutboxPolicy(tenantId)
    Buffer->>Store: purgeEligibleDeliveredOutbox()
    Buffer->>Store: purgeEligibleDeadLetters()
```

## PR Mapping

| PR       | Modules primarily touched                                   |
| -------- | ----------------------------------------------------------- |
| `G5-PR1` | archive coordination, exporter, catalog, terminal snapshots |
| `G5-PR2` | restore coordination, delete-after-grace, leadership        |
| `G5-PR3` | buffer retention                                            |
| `G5-PR4` | redaction follow-up                                         |
