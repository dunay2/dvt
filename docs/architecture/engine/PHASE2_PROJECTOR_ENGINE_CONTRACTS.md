# Phase 2: Projector & Engine Contracts

## Overview

Phase 2 establishes two critical normative contracts that drive workflow execution:

1. **IProjectorAdapter**: Event-to-state transformation (materialization)
2. **IWorkflowEngineAdapter**: Workflow orchestration and execution

These contracts separate concerns between event sourcing (state store + outbox) and execution logic (engine + projection).

## Architecture Pattern

```
Event Stream → Projector → Materialized State
    ↓
Workflow Engine (uses State Store + Outbox)
    ↓
Step Execution (plugins/adapters)
    ↓
Events → Outbox → Delivery Worker
```

## IProjectorAdapter

### Purpose

Transform raw workflow events into queryable, materialized state.

### Key Methods

- **projectEvent()**: Apply single event to state
- **projectBatch()**: Efficient batch processing
- **queryProjectedState()**: Search materialized views
- **getWorkflowStateSnapshot()**: Current state lookup
- **rebuildProjection()**: Recovery from event log
- **clearProjection()**: Cleanup/archival

### Design Principles

- **Idempotent**: Same event → same state (safe to replay)
- **Ordered**: Events applied in sequence (causality)
- **Durable**: Surviving failures
- **Searchable**: Support queries by workflow/step/status

### Example Implementations

- **Postgres**: Denormalized tables (workflow_snapshots, step_summaries)
- **DynamoDB**: GSI for workflow queries, event versioning
- **Elasticsearch**: Real-time materialized views with aggregations
- **In-Memory**: For tests (fast, no durability)

---

## IWorkflowEngineAdapter

### Purpose

Drive workflow execution through state transitions, step coordination, and failure recovery.

### Key Methods

- **createRun()**: Initialize workflow
- **startRun()**: Begin execution
- **executeStep()**: Execute single step
- **executeStepBatch()**: Parallel step execution
- **pauseRun()**: Graceful pause
- **resumeRun()**: Resume from pause
- **terminateRun()**: Final failure
- **getRunState()**: State inspection
- **replayRun()**: Determinism verification
- **archiveRun()**: Completed workflow archival

### Core Concepts

#### State Machine

```
INITIALIZING → RUNNING → PAUSED → RUNNING → COMPLETED
                  ↓
              FAILED (with retry logic)
                  ↓
            CANCELLED (terminal)
```

#### Idempotency

Each operation is idempotent via idempotencyKey:

- Duplicate requests return cached result
- No duplicate side effects
- Safe for at-least-once delivery

#### Determinism

Engine guarantees replay produces identical results:

- Uses injected Clock (not Date.now())
- Uses seeded PRNG (not Math.random())
- Same inputs → same outputs (for correctness verification)

#### Durability

All state transitions are atomic with outbox:

1. Read current state
2. Compute new state
3. Write state + append outbox event (single transaction)
4. Return result (outbox guarantees delivery)

### Example Implementations

- **Temporal**: Native Temporal workflow + activities
- **Conductor**: Conductor workflow engine adaptation
- **Simple Sync**: Single-threaded deterministic engine (tests)
- **Distributed**: Multi-process engine with Kafka coordination

---

## Integration Pattern

### Workflow Execution Flow

1. **Request arrives**: `POST /runs`
   - Engine creates run (state: INITIALIZING)

2. **Start run**: `POST /runs/{id}/start`
   - Engine transitions to RUNNING
   - Routes first step

3. **Execute step**: `POST /steps/{id}/execute`
   - Engine validates step is current
   - Calls step adapter (e.g., HTTP plugin, database plugin)
   - Stores result + event
   - Routes next step

4. **Step completion**:
   - Event appended to outbox
   - Projector materializes state
   - Next step queued

5. **Terminal states**:
   - COMPLETED: All steps succeeded
   - FAILED: Retries exhausted
   - CANCELLED: User terminated

### State Consistency

```
State Store (current state)
    ↓
Transactional Write:
  - Update state
  - Append outbox event
    ↓
Outbox (durable queue)
    ↓
Delivery Worker (async)
    ↓
Projector (materialized views)
```

Result: Eventual consistency with guarantees:

- State is durable before outbox delivery
- Events are ordered (sequence numbers)
- Projections eventually consistent

---

## Determinism Requirements

### For Engine Adapter

1. **Clock**: Injected via DeterminismConfig
   - Use workflow.now() for Temporal
   - Use injected clock for others
   - Never use Date.now() or Date.getTime()

2. **Randomness**: Injected PRNG
   - Use seeded random for retry delays
   - Never use Math.random()
   - Seed must be deterministic (from event sequence)

3. **External calls**: Forbidden in pure determinism
   - Database reads: Only via state store adapter (cached)
   - Network: Only via step adapters (external side effects)
   - Time: Only via injected clock

### Verification (Golden Path Testing)

```
1. Record all events from production run
2. Replay run in test environment (same inputs)
3. Compare final state (golden master)
4. Assert hashes match (determinism parity)
```

---

## Adapter Implementations

### Priority Order (Recommended)

1. **In-Memory**: For tests (no persistence)
2. **Postgres + LocalStack**: Development
3. **Temporal**: Production high-volume
4. **DynamoDB**: Production serverless
5. **Kafka Streams**: Event-driven projection

### Contract Compliance Matrix

| Adapter   | Projector            | Engine               | Priority  |
| --------- | -------------------- | -------------------- | --------- |
| Temporal  | ❌ native events     | ✅ native            | 1         |
| Postgres  | ✅ denormalization   | ✅ sagas             | 2         |
| DynamoDB  | ✅ streams + Lambda  | ✅ state machine     | 3         |
| Kafka     | ✅ stream processing | ❌ not orchestration | 4         |
| In-Memory | ✅ simple map        | ✅ state machine     | 0 (tests) |

---

## Multi-Adapter Example

### Fast Path (Temporal)

```
Engine: Temporal native workflows
Projector: Temporal events → indexed views
```

### Scalable Path (Postgres)

```
Engine: State transitions in saga tables
Projector: Event log → materialized views
```

### Serverless Path (DynamoDB)

```
Engine: State stored in DynamoDB
Projector: DynamoDB Streams → Lambda → views
```

All use same IProjectorAdapter + IWorkflowEngineAdapter contracts.

---

## Next Steps (Phase 3)

- Implement In-Memory adapters (testing foundation)
- Implement Postgres adapters (primary)
- Define step execution context (for plugins)
- Implement plugin framework
