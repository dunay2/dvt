---
title: DataMode Concept Proposal
status: Draft
owner: architecture
last_reviewed: 2026-03-28
planning_type: proposal
---

Umm que es esto. dbt?

# DataMode — Source Discovery & DataObject Layer

## 1. Overview

DataMode is an application state in DVT+ responsible for:

- Discovering data sources
- Profiling and normalizing them
- Converting them into DataObjects
- Registering them into the execution graph

It is NOT an ingestion tool.

DataMode transforms external data sources into first-class citizens of the execution graph.

---

## 2. Core Concept

### DataObject

```ts
interface DataObject {
  id: string;
  type: 'table' | 'file' | 'api' | 'stream';
  schema: Column[];
  location: string;
  metadata: {
    size?: number;
    freshness?: number;
    sourceType: string;
  };
}
```

---

## 3. Architecture

```mermaid
flowchart LR

subgraph External Sources
    A[Excel / CSV]
    B[Databases]
    C[APIs]
    D[FTP / S3]
    E[Streams]
end

subgraph DataMode
    DM1[Discovery]
    DM2[Profiling]
    DM3[DataObject Registry]
    DM4[Adapters]
end

subgraph Core
    P[Planner]
    E2[Engine]
    S[State Store]
end

A --> DM4
B --> DM4
C --> DM4
D --> DM4
E --> DM4

DM4 --> DM1
DM1 --> DM2
DM2 --> DM3

DM3 --> P
P --> E2
E2 --> S
```

---

## 4. Plugin / Adapter Model

```ts
interface ISourceAdapter {
  type: string;

  discover(): Promise<any[]>;

  profile(sourceId: string): Promise<DataObject>;

  toExecutionSteps(dataObject: DataObject): any[];
}
```

---

## 5. Sequence: Discovery

```mermaid
sequenceDiagram
    participant UI
    participant DataMode
    participant Adapter

    UI->>DataMode: discoverSources()
    DataMode->>Adapter: discover()
    Adapter-->>DataMode: sources
    DataMode-->>UI: list
```

---

## 6. Sequence: Execution

```mermaid
sequenceDiagram
    participant UI
    participant Planner
    participant Engine
    participant State

    UI->>Planner: run
    Planner->>Engine: plan
    Engine->>State: updates
    State-->>UI: refresh
```

---

## 7. Summary

DataMode is the abstraction layer that:

- Converts sources into graph nodes
- Enables planning
- Integrates with execution
